import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Note, NoteEvent, NoteType, AppEvent, TelemetryEvent, DarkMatterSuggestionKind } from '../types';

const DB_NAME = 'cognitive_space_db';
const DB_VERSION = 2;
const STORE_NOTES = 'notes';
const STORE_EVENTS = 'events';
const STORE_META = 'meta';
const META_LAST_EVENT_AT = 'lastEventAt';
const META_LAST_PROJECTION_AT = 'lastProjectionAt';
const NOTE_EVENT_TYPES = new Set<NoteEvent['type']>([
  'NOTE_CREATED',
  'NOTE_UPDATED',
  'NOTE_META_UPDATED',
  'NOTE_DELETED',
  'NOTE_TOUCHED'
]);

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
    value: AppEvent;
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

export type NoteStoreEventKind =
  | 'created'
  | 'updated'
  | 'meta_updated'
  | 'deleted'
  | 'touched';

export interface NoteStoreEventDetail {
  id: string;
  kind: NoteStoreEventKind;
}

const noteEventTarget = typeof EventTarget !== 'undefined' ? new EventTarget() : null;

export const subscribeToNoteEvents = (handler: (detail: NoteStoreEventDetail) => void): (() => void) => {
  if (!noteEventTarget) return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<NoteStoreEventDetail>).detail;
    if (detail) handler(detail);
  };
  noteEventTarget.addEventListener('note', listener);
  return () => noteEventTarget.removeEventListener('note', listener);
};

const emitNoteEvent = (detail: NoteStoreEventDetail): void => {
  if (!noteEventTarget) return;
  noteEventTarget.dispatchEvent(new CustomEvent('note', { detail }));
};

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

const isNoteEvent = (event: AppEvent): event is NoteEvent => {
  return NOTE_EVENT_TYPES.has(event.type as NoteEvent['type']);
};

const appendEvent = async (db: IDBPDatabase<CognitiveSpaceDB>, event: AppEvent): Promise<void> => {
  await db.put(STORE_EVENTS, event);
  if (isNoteEvent(event)) {
    const lastEventAt = await getMetaValue(db, META_LAST_EVENT_AT);
    const nextValue = Math.max(lastEventAt, event.createdAt);
    await setMetaValue(db, META_LAST_EVENT_AT, nextValue);
  }
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
  emitNoteEvent({ id: noteId, kind: 'touched' });
};

const applyEvent = (state: Map<string, Note>, event: AppEvent): void => {
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
      if (typeof updates.confidence !== 'undefined') existing.confidence = updates.confidence;
      if (typeof updates.analysisPending !== 'undefined') {
        existing.analysisPending = updates.analysisPending;
      }
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
    case 'AI_DARK_MATTER_ANALYSIS_REQUESTED':
    case 'AI_DARK_MATTER_SUGGESTION_APPLIED':
    case 'AI_DARK_MATTER_SUGGESTION_DISMISSED':
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
  const lastEventAt = await getMetaValue(db, META_LAST_EVENT_AT);
  if (lastEventAt > 0) return;
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
        const store = db.objectStoreNames.contains(STORE_NOTES)
          ? transaction.objectStore(STORE_NOTES)
          : db.createObjectStore(STORE_NOTES, { keyPath: 'id' });

        if (!store.indexNames.contains('by-type')) {
          store.createIndex('by-type', 'type');
        }
        if (!store.indexNames.contains('by-parent')) {
          store.createIndex('by-parent', 'parentId');
        }
        if (!store.indexNames.contains('by-updated')) {
          store.createIndex('by-updated', 'updatedAt');
        }

        const eventStore = db.objectStoreNames.contains(STORE_EVENTS)
          ? transaction.objectStore(STORE_EVENTS)
          : db.createObjectStore(STORE_EVENTS, { keyPath: 'id' });
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
      emitNoteEvent({ id: note.id, kind: 'created' });
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
    analysisPending: false,
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
      for (const id of idsToDelete) {
        emitNoteEvent({ id, kind: 'deleted' });
      }
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
        emitNoteEvent({ id: noteId, kind: 'updated' });
      }
    },
    'Failed to update note content'
  );
};

export const updateNoteMeta = async (
  noteId: string,
  updates: Pick<Partial<Note>, 'parentId' | 'type' | 'subType' | 'confidence' | 'analysisPending'>
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
        if (typeof updates.confidence !== 'undefined') note.confidence = updates.confidence;
        if (typeof updates.analysisPending !== 'undefined') note.analysisPending = updates.analysisPending;
        note.updatedAt = updatedAt;
        await db.put(STORE_NOTES, note);
        const newParentId =
          typeof updates.parentId !== 'undefined' ? updates.parentId : note.parentId;
        if (newParentId) {
          await touchNoteUpdatedAt(db, newParentId);
        }
        await markProjectionUpToDate(db);
        emitNoteEvent({ id: noteId, kind: 'meta_updated' });
      }
    },
    'Failed to update note metadata'
  );
};

export const demoteQuestion = async (
  questionId: string,
  targetType: NoteType,
  options?: { relinkQuestionId?: string | null; includeSelf?: boolean }
): Promise<void> => {
  if (targetType === NoteType.QUESTION) return;
  const relatedNotes = await getRelatedNotes(questionId);
  const relinkQuestionId = options?.relinkQuestionId ?? null;
  const includeSelf = options?.includeSelf ?? false;
  const nextParentId = relinkQuestionId ?? null;
  await updateNoteMeta(questionId, {
    type: targetType,
    parentId: includeSelf ? nextParentId : null
  });
  for (const note of relatedNotes) {
    await updateNoteMeta(note.id, { parentId: nextParentId });
  }
};

const logTelemetryEvent = async (event: TelemetryEvent): Promise<void> => {
  await withDb<void>(
    undefined,
    async (db) => {
      await appendEvent(db, event);
    },
    'Failed to record telemetry event'
  );
};

export const recordDarkMatterAnalysisRequested = async (
  noteCount: number,
  questionCount: number
): Promise<void> => {
  const createdAt = Date.now();
  await logTelemetryEvent({
    id: crypto.randomUUID(),
    type: 'AI_DARK_MATTER_ANALYSIS_REQUESTED',
    createdAt,
    payload: { noteCount, questionCount }
  });
};

export const recordDarkMatterSuggestionApplied = async (
  kind: DarkMatterSuggestionKind,
  noteCount: number,
  suggestionId?: string
): Promise<void> => {
  const createdAt = Date.now();
  await logTelemetryEvent({
    id: crypto.randomUUID(),
    type: 'AI_DARK_MATTER_SUGGESTION_APPLIED',
    createdAt,
    payload: { kind, noteCount, suggestionId }
  });
};

export const recordDarkMatterSuggestionDismissed = async (suggestionId?: string): Promise<void> => {
  const createdAt = Date.now();
  await logTelemetryEvent({
    id: crypto.randomUUID(),
    type: 'AI_DARK_MATTER_SUGGESTION_DISMISSED',
    createdAt,
    payload: { suggestionId }
  });
};

export interface DarkMatterPage {
  notes: Note[];
  nextCursor: number | null;
  hasMore: boolean;
}

export const getDarkMatterPage = async (
  limit: number,
  cursorUpdatedAt?: number
): Promise<DarkMatterPage> => {
  return await withDb(
    { notes: [], nextCursor: null, hasMore: false },
    async (db) => {
      await ensureProjection(db);
      const tx = db.transaction(STORE_NOTES, 'readonly');
      const index = tx.store.index('by-updated');
      const range = typeof cursorUpdatedAt === 'number'
        ? IDBKeyRange.upperBound(cursorUpdatedAt)
        : undefined;
      let cursor = await index.openCursor(range, 'prev');
      const notes: Note[] = [];
      let lastIncludedUpdatedAt: number | null = null;
      let hasMore = false;

      const isDarkMatterNote = (note: Note) =>
        note.type !== NoteType.QUESTION && (note.parentId === null || note.parentId === undefined);

      while (cursor) {
        if (isDarkMatterNote(cursor.value)) {
          notes.push(cursor.value);
          lastIncludedUpdatedAt = cursor.value.updatedAt;
          if (notes.length >= limit) {
            cursor = await cursor.continue();
            while (cursor) {
              if (isDarkMatterNote(cursor.value)) {
                hasMore = true;
                break;
              }
              cursor = await cursor.continue();
            }
            break;
          }
        }
        cursor = await cursor.continue();
      }

      await tx.done;
      return { notes, nextCursor: lastIncludedUpdatedAt, hasMore };
    },
    'Failed to load dark matter page'
  );
};

export const getDarkMatterCount = async (): Promise<number> => {
  return await withDb(
    0,
    async (db) => {
      await ensureProjection(db);
      const tx = db.transaction(STORE_NOTES, 'readonly');
      const index = tx.store.index('by-updated');
      let cursor = await index.openCursor(null, 'prev');
      let count = 0;
      while (cursor) {
        const note = cursor.value;
        if (note.type !== NoteType.QUESTION && (note.parentId === null || note.parentId === undefined)) {
          count += 1;
        }
        cursor = await cursor.continue();
      }
      await tx.done;
      return count;
    },
    'Failed to count dark matter'
  );
};

/**
 * Get all "dark matter" notes - notes that are not questions and have no parent
 * These are isolated fragments not connected to any question
 */
export const getDarkMatter = async (): Promise<Note[]> => {
  return await withDb(
    [],
    async (db) => {
      await ensureProjection(db);
      const allNotes = await db.getAll(STORE_NOTES);
      return allNotes.filter(
        (note) =>
          note.type !== NoteType.QUESTION &&
          (note.parentId === null || note.parentId === undefined)
      );
    },
    'Failed to load dark matter'
  );
};

export interface QuestionConstellationStats {
  questionId: string;
  relatedCount: number;
  claimCount: number;
  evidenceCount: number;
  triggerCount: number;
  lastUpdatedAt: number | null;
}

export const getQuestionConstellationStats = async (
  questionId: string
): Promise<QuestionConstellationStats> => {
  return await withDb(
    {
      questionId,
      relatedCount: 0,
      claimCount: 0,
      evidenceCount: 0,
      triggerCount: 0,
      lastUpdatedAt: null
    },
    async (db) => {
      await ensureProjection(db);
      const related = await db.getAllFromIndex(STORE_NOTES, 'by-parent', questionId);
      const lastUpdatedAt = related.length
        ? Math.max(...related.map((note) => note.updatedAt))
        : null;

      return {
        questionId,
        relatedCount: related.length,
        claimCount: related.filter((note) => note.type === NoteType.CLAIM).length,
        evidenceCount: related.filter((note) => note.type === NoteType.EVIDENCE).length,
        triggerCount: related.filter((note) => note.type === NoteType.TRIGGER).length,
        lastUpdatedAt
      };
    },
    'Failed to load question constellation stats'
  );
};
