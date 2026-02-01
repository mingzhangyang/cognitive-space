import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Note, NoteEvent, NoteType } from '../types';

const DB_NAME = 'cognitive_space_db';
const DB_VERSION = 2;
const STORE_NOTES = 'notes';
const STORE_EVENTS = 'events';
const STORE_META = 'meta';
const META_LAST_EVENT_AT = 'lastEventAt';
const META_LAST_PROJECTION_AT = 'lastProjectionAt';

interface CognitiveSpaceDB extends DBSchema {
  notes: {
    key: string;
    value: Note;
    indexes: {
      'by-type': NoteType;
      'by-parent': string | null;
      'by-updated': number;
    };
  };
  events: {
    key: string;
    value: NoteEvent;
    indexes: {
      'by-created': number;
    };
  };
  meta: {
    key: string;
    value: {
      key: string;
      value: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<CognitiveSpaceDB>> | null = null;

const logDbError = (message: string, error: unknown) => {
  console.error(message, error);
};

const getMetaValue = async (db: IDBPDatabase<CognitiveSpaceDB>, key: string): Promise<number> => {
  const record = await db.get(STORE_META, key);
  return typeof record?.value === 'number' ? record.value : 0;
};

const setMetaValue = async (
  db: IDBPDatabase<CognitiveSpaceDB>,
  key: string,
  value: number
): Promise<void> => {
  await db.put(STORE_META, { key, value });
};

const appendEvent = async (db: IDBPDatabase<CognitiveSpaceDB>, event: NoteEvent): Promise<void> => {
  await db.put(STORE_EVENTS, event);
  const lastEventAt = await getMetaValue(db, META_LAST_EVENT_AT);
  const nextValue = Math.max(lastEventAt, event.createdAt);
  await setMetaValue(db, META_LAST_EVENT_AT, nextValue);
};

const markProjectionUpToDate = async (db: IDBPDatabase<CognitiveSpaceDB>): Promise<void> => {
  const lastEventAt = await getMetaValue(db, META_LAST_EVENT_AT);
  if (lastEventAt) {
    await setMetaValue(db, META_LAST_PROJECTION_AT, lastEventAt);
  }
};

const touchNoteUpdatedAt = async (
  db: IDBPDatabase<CognitiveSpaceDB>,
  noteId: string
): Promise<void> => {
  const note = await db.get(STORE_NOTES, noteId);
  if (!note) return;
  const updatedAt = Date.now();
  const event: NoteEvent = {
    id: crypto.randomUUID(),
    type: 'NOTE_TOUCHED',
    createdAt: updatedAt,
    payload: { id: noteId, updatedAt }
  };
  await appendEvent(db, event);
  note.updatedAt = updatedAt;
  await db.put(STORE_NOTES, note);
};

const applyEvent = (state: Map<string, Note>, event: NoteEvent): void => {
  switch (event.type) {
    case 'NOTE_CREATED': {
      state.set(event.payload.note.id, { ...event.payload.note });
      return;
    }
    case 'NOTE_UPDATED': {
      const existing = state.get(event.payload.id);
      if (!existing) return;
      existing.content = event.payload.content;
      existing.updatedAt = event.payload.updatedAt;
      return;
    }
    case 'NOTE_META_UPDATED': {
      const existing = state.get(event.payload.id);
      if (!existing) return;
      const { updates } = event.payload;
      if (typeof updates.parentId !== 'undefined') existing.parentId = updates.parentId;
      if (typeof updates.type !== 'undefined') existing.type = updates.type;
      if (typeof updates.subType !== 'undefined') existing.subType = updates.subType;
      existing.updatedAt = event.payload.updatedAt;
      return;
    }
    case 'NOTE_TOUCHED': {
      const existing = state.get(event.payload.id);
      if (!existing) return;
      existing.updatedAt = event.payload.updatedAt;
      return;
    }
    case 'NOTE_DELETED': {
      state.delete(event.payload.id);
      return;
    }
    default:
      return;
  }
};

const rebuildProjectionFromEvents = async (db: IDBPDatabase<CognitiveSpaceDB>): Promise<void> => {
  const events = await db.getAllFromIndex(STORE_EVENTS, 'by-created');
  if (events.length === 0) return;
  const state = new Map<string, Note>();
  for (const event of events) {
    applyEvent(state, event);
  }
  const tx = db.transaction(STORE_NOTES, 'readwrite');
  await tx.store.clear();
  await Promise.all(Array.from(state.values()).map((note) => tx.store.put(note)));
  await tx.done;
  await markProjectionUpToDate(db);
};

const ensureEventLog = async (db: IDBPDatabase<CognitiveSpaceDB>): Promise<void> => {
  const eventCount = await db.count(STORE_EVENTS);
  if (eventCount > 0) return;
  const existingNotes = await db.getAll(STORE_NOTES);
  if (existingNotes.length === 0) return;
  for (const note of existingNotes) {
    const createdAt = typeof note.updatedAt === 'number' ? note.updatedAt : note.createdAt;
    const event: NoteEvent = {
      id: crypto.randomUUID(),
      type: 'NOTE_CREATED',
      createdAt,
      payload: { note }
    };
    await appendEvent(db, event);
  }
  await markProjectionUpToDate(db);
};

const ensureProjection = async (db: IDBPDatabase<CognitiveSpaceDB>): Promise<void> => {
  await ensureEventLog(db);
  const lastEventAt = await getMetaValue(db, META_LAST_EVENT_AT);
  if (!lastEventAt) return;
  const lastProjectionAt = await getMetaValue(db, META_LAST_PROJECTION_AT);
  if (lastProjectionAt >= lastEventAt) return;
  await rebuildProjectionFromEvents(db);
};

const getDb = async (): Promise<IDBPDatabase<CognitiveSpaceDB> | null> => {
  if (!dbPromise) {
    dbPromise = openDB<CognitiveSpaceDB>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        let store: IDBObjectStore;
        if (!db.objectStoreNames.contains(STORE_NOTES)) {
          store = db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
        } else {
          store = transaction.objectStore(STORE_NOTES);
        }

        if (!store.indexNames.contains('by-type')) {
          store.createIndex('by-type', 'type');
        }
        if (!store.indexNames.contains('by-parent')) {
          store.createIndex('by-parent', 'parentId');
        }
        if (!store.indexNames.contains('by-updated')) {
          store.createIndex('by-updated', 'updatedAt');
        }

        let eventStore: IDBObjectStore;
        if (!db.objectStoreNames.contains(STORE_EVENTS)) {
          eventStore = db.createObjectStore(STORE_EVENTS, { keyPath: 'id' });
        } else {
          eventStore = transaction.objectStore(STORE_EVENTS);
        }
        if (!eventStore.indexNames.contains('by-created')) {
          eventStore.createIndex('by-created', 'createdAt');
        }

        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      }
    });
  }

  try {
    return await dbPromise;
  } catch (error) {
    logDbError('Failed to open IndexedDB', error);
    dbPromise = null;
    return null;
  }
};

const withDb = async <T>(
  fallback: T,
  action: (db: IDBPDatabase<CognitiveSpaceDB>) => Promise<T>,
  errorMessage: string
): Promise<T> => {
  const db = await getDb();
  if (!db) return fallback;
  try {
    return await action(db);
  } catch (error) {
    logDbError(errorMessage, error);
    return fallback;
  }
};

export const getNotes = async (): Promise<Note[]> => {
  return await withDb(
    [],
    async (db) => {
      await ensureProjection(db);
      return await db.getAll(STORE_NOTES);
    },
    'Failed to load notes'
  );
};

export const saveNote = async (note: Note): Promise<void> => {
  await withDb<void>(
    undefined,
    async (db) => {
      const event: NoteEvent = {
        id: crypto.randomUUID(),
        type: 'NOTE_CREATED',
        createdAt: note.createdAt,
        payload: { note }
      };
      await appendEvent(db, event);
      await db.put(STORE_NOTES, note);
      if (note.parentId) {
        await touchNoteUpdatedAt(db, note.parentId);
      }
      await markProjectionUpToDate(db);
    },
    'Failed to save note'
  );
};

export const getQuestions = async (): Promise<Note[]> => {
  return await withDb(
    [],
    async (db) => {
      await ensureProjection(db);
      const questions = await db.getAllFromIndex(STORE_NOTES, 'by-type', NoteType.QUESTION);
      return questions.filter((note) => !note.parentId);
    },
    'Failed to load questions'
  );
};

export const getRelatedNotes = async (questionId: string): Promise<Note[]> => {
  return await withDb(
    [],
    async (db) => {
      await ensureProjection(db);
      return await db.getAllFromIndex(STORE_NOTES, 'by-parent', questionId);
    },
    'Failed to load related notes'
  );
};

export const getNoteById = async (id: string): Promise<Note | undefined> => {
  return await withDb(
    undefined,
    async (db) => {
      await ensureProjection(db);
      return await db.get(STORE_NOTES, id);
    },
    'Failed to load note'
  );
};

export const createNoteObject = (content: string): Note => {
  return {
    id: crypto.randomUUID(),
    content,
    type: NoteType.UNCATEGORIZED, // Default, updated by AI later
    createdAt: Date.now(),
    updatedAt: Date.now(),
    parentId: null
  };
};

export const deleteNote = async (noteId: string): Promise<void> => {
  await withDb<void>(
    undefined,
    async (db) => {
      const childNotes = await db.getAllFromIndex(STORE_NOTES, 'by-parent', noteId);
      const idsToDelete = [noteId, ...childNotes.map((note) => note.id)];
      const deletedAt = Date.now();

      for (const id of idsToDelete) {
        const event: NoteEvent = {
          id: crypto.randomUUID(),
          type: 'NOTE_DELETED',
          createdAt: deletedAt,
          payload: { id }
        };
        await appendEvent(db, event);
      }

      const tx = db.transaction(STORE_NOTES, 'readwrite');
      for (const id of idsToDelete) {
        await tx.store.delete(id);
      }
      await tx.done;
      await markProjectionUpToDate(db);
    },
    'Failed to delete note'
  );
};

export const updateNoteContent = async (noteId: string, newContent: string): Promise<void> => {
  await withDb<void>(
    undefined,
    async (db) => {
      const note = await db.get(STORE_NOTES, noteId);
      if (note) {
        const updatedAt = Date.now();
        const event: NoteEvent = {
          id: crypto.randomUUID(),
          type: 'NOTE_UPDATED',
          createdAt: updatedAt,
          payload: { id: noteId, content: newContent, updatedAt }
        };
        await appendEvent(db, event);
        note.content = newContent;
        note.updatedAt = updatedAt;
        await db.put(STORE_NOTES, note);
        if (note.parentId) {
          await touchNoteUpdatedAt(db, note.parentId);
        }
        await markProjectionUpToDate(db);
      }
    },
    'Failed to update note content'
  );
};

export const updateNoteMeta = async (
  noteId: string,
  updates: Pick<Partial<Note>, 'parentId' | 'type' | 'subType'>
): Promise<void> => {
  await withDb<void>(
    undefined,
    async (db) => {
      const note = await db.get(STORE_NOTES, noteId);
      if (note) {
        const updatedAt = Date.now();
        const event: NoteEvent = {
          id: crypto.randomUUID(),
          type: 'NOTE_META_UPDATED',
          createdAt: updatedAt,
          payload: { id: noteId, updates, updatedAt }
        };
        await appendEvent(db, event);
        if (typeof updates.parentId !== 'undefined') note.parentId = updates.parentId;
        if (typeof updates.type !== 'undefined') note.type = updates.type;
        if (typeof updates.subType !== 'undefined') note.subType = updates.subType;
        note.updatedAt = updatedAt;
        await db.put(STORE_NOTES, note);
        const newParentId =
          typeof updates.parentId !== 'undefined' ? updates.parentId : note.parentId;
        if (newParentId) {
          await touchNoteUpdatedAt(db, newParentId);
        }
        await markProjectionUpToDate(db);
      }
    },
    'Failed to update note metadata'
  );
};
