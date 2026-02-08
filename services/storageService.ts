import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Note, NoteEvent, NoteType, AppEvent, TelemetryEvent, DarkMatterSuggestionKind } from '../types';
import { isConfidenceLabel } from '../utils/confidence';
import { SUBTYPE_KEYS, normalizeSubType } from '../utils/subtypes';

const DB_NAME = 'cognitive_space_db';
const DB_VERSION = 2;
const STORE_NOTES = 'notes';
const STORE_EVENTS = 'events';
const STORE_META = 'meta';
const META_LAST_EVENT_AT = 'lastEventAt';
const META_LAST_PROJECTION_AT = 'lastProjectionAt';
const META_SUBTYPE_MIGRATION_V1 = 'subTypeMigrationV1';
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
let subTypeMigrationPromise: Promise<void> | null = null;
let subTypeMigrationDone = false;

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

const normalizeNoteSubTypeInPlace = (note: Note): boolean => {
  if (typeof note.subType !== 'string') return false;
  const normalized = normalizeSubType(note.subType);
  if (normalized === note.subType) return false;
  if (normalized) {
    note.subType = normalized;
  } else {
    delete note.subType;
  }
  return true;
};

const normalizeEventSubTypeInPlace = (event: AppEvent): boolean => {
  if (event.type === 'NOTE_CREATED') {
    return normalizeNoteSubTypeInPlace(event.payload.note);
  }
  if (event.type === 'NOTE_META_UPDATED') {
    if (!Object.prototype.hasOwnProperty.call(event.payload.updates, 'subType')) return false;
    const normalized = normalizeSubType(event.payload.updates.subType);
    if (normalized === event.payload.updates.subType) return false;
    if (normalized) {
      event.payload.updates.subType = normalized;
    } else {
      delete event.payload.updates.subType;
    }
    return true;
  }
  return false;
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
      if (typeof updates.confidenceLabel !== 'undefined') existing.confidenceLabel = updates.confidenceLabel;
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

const runSubTypeMigration = async (db: IDBPDatabase<CognitiveSpaceDB>): Promise<void> => {
  const migratedAt = await getMetaValue(db, META_SUBTYPE_MIGRATION_V1);
  if (migratedAt) return;
  const tx = db.transaction([STORE_NOTES, STORE_EVENTS, STORE_META], 'readwrite');
  const notesStore = tx.objectStore(STORE_NOTES);
  const eventsStore = tx.objectStore(STORE_EVENTS);
  const metaStore = tx.objectStore(STORE_META);

  const notes = await notesStore.getAll();
  for (const note of notes) {
    if (normalizeNoteSubTypeInPlace(note)) {
      await notesStore.put(note);
    }
  }

  const events = await eventsStore.getAll();
  for (const event of events) {
    if (normalizeEventSubTypeInPlace(event)) {
      await eventsStore.put(event);
    }
  }

  await metaStore.put({ key: META_SUBTYPE_MIGRATION_V1, value: Date.now() });
  await tx.done;
};

const scheduleSubTypeMigration = (db: IDBPDatabase<CognitiveSpaceDB>): void => {
  if (subTypeMigrationDone || subTypeMigrationPromise) return;

  const run = () => {
    subTypeMigrationPromise = runSubTypeMigration(db).then(() => {
      subTypeMigrationDone = true;
    }).catch((error) => {
      logDbError('Failed to migrate subType values', error);
      subTypeMigrationPromise = null;
    });
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 0);
  }
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
    const db = await dbPromise;
    scheduleSubTypeMigration(db);
    return db;
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

export type AppDataExport = {
  version: number;
  exportedAt: number;
  db: {
    name: string;
    version: number;
  };
  notes: Note[];
  events: AppEvent[];
  meta: Record<string, number>;
};

export type ImportMode = 'replace' | 'merge';

const EXPORT_VERSION = 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isNoteType = (value: unknown): value is NoteType =>
  typeof value === 'string' && Object.values(NoteType).includes(value as NoteType);

const isNote = (value: unknown): value is Note => {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string') return false;
  if (typeof value.content !== 'string') return false;
  if (!isNoteType(value.type)) return false;
  if (!isNumber(value.createdAt) || !isNumber(value.updatedAt)) return false;
  if (typeof value.subType !== 'undefined' && typeof value.subType !== 'string') return false;
  if (typeof value.confidence !== 'undefined' && !isNumber(value.confidence)) return false;
  if (typeof value.confidenceLabel !== 'undefined' && !isConfidenceLabel(value.confidenceLabel)) return false;
  if (typeof value.analysisPending !== 'undefined' && typeof value.analysisPending !== 'boolean') return false;
  if (typeof value.parentId !== 'undefined' && value.parentId !== null && typeof value.parentId !== 'string') return false;
  return true;
};

const isNoteEventRecord = (value: unknown): value is NoteEvent => {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string') return false;
  if (typeof value.type !== 'string') return false;
  if (!isNumber(value.createdAt)) return false;
  if (!isRecord(value.payload)) return false;

  switch (value.type) {
    case 'NOTE_CREATED':
      return isRecord(value.payload) && isNote((value.payload as { note?: unknown }).note);
    case 'NOTE_UPDATED': {
      const payload = value.payload as { id?: unknown; content?: unknown; updatedAt?: unknown };
      return typeof payload.id === 'string' && typeof payload.content === 'string' && isNumber(payload.updatedAt);
    }
    case 'NOTE_META_UPDATED': {
      const payload = value.payload as {
        id?: unknown;
        updates?: unknown;
        updatedAt?: unknown;
      };
      if (typeof payload.id !== 'string' || !isNumber(payload.updatedAt) || !isRecord(payload.updates)) return false;
      const updates = payload.updates as Record<string, unknown>;
      if (typeof updates.parentId !== 'undefined' && updates.parentId !== null && typeof updates.parentId !== 'string') return false;
      if (typeof updates.type !== 'undefined' && !isNoteType(updates.type)) return false;
      if (typeof updates.subType !== 'undefined' && typeof updates.subType !== 'string') return false;
      if (typeof updates.confidence !== 'undefined' && !isNumber(updates.confidence)) return false;
      if (typeof updates.confidenceLabel !== 'undefined' && !isConfidenceLabel(updates.confidenceLabel)) return false;
      if (typeof updates.analysisPending !== 'undefined' && typeof updates.analysisPending !== 'boolean') return false;
      return true;
    }
    case 'NOTE_DELETED': {
      const payload = value.payload as { id?: unknown };
      return typeof payload.id === 'string';
    }
    case 'NOTE_TOUCHED': {
      const payload = value.payload as { id?: unknown; updatedAt?: unknown };
      return typeof payload.id === 'string' && isNumber(payload.updatedAt);
    }
    default:
      return false;
  }
};

const isTelemetryEvent = (value: unknown): value is TelemetryEvent => {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string') return false;
  if (typeof value.type !== 'string') return false;
  if (!isNumber(value.createdAt)) return false;
  if (!isRecord(value.payload)) return false;

  switch (value.type) {
    case 'AI_DARK_MATTER_ANALYSIS_REQUESTED': {
      const payload = value.payload as { noteCount?: unknown; questionCount?: unknown };
      return isNumber(payload.noteCount) && isNumber(payload.questionCount);
    }
    case 'AI_DARK_MATTER_SUGGESTION_APPLIED': {
      const payload = value.payload as { kind?: unknown; noteCount?: unknown; suggestionId?: unknown };
      const validKind = payload.kind === 'new_question' || payload.kind === 'existing_question';
      return validKind && isNumber(payload.noteCount) &&
        (typeof payload.suggestionId === 'undefined' || typeof payload.suggestionId === 'string');
    }
    case 'AI_DARK_MATTER_SUGGESTION_DISMISSED': {
      const payload = value.payload as { suggestionId?: unknown };
      return typeof payload.suggestionId === 'undefined' || typeof payload.suggestionId === 'string';
    }
    default:
      return false;
  }
};

const isAppEvent = (value: unknown): value is AppEvent =>
  isNoteEventRecord(value) || isTelemetryEvent(value);

export const parseAppDataExport = (value: unknown): AppDataExport | null => {
  if (!isRecord(value)) return null;
  if (!isNumber(value.version) || value.version !== EXPORT_VERSION) return null;
  if (!isNumber(value.exportedAt)) return null;
  if (!isRecord(value.db) || typeof value.db.name !== 'string' || !isNumber(value.db.version)) return null;
  if (!Array.isArray(value.notes) || !value.notes.every(isNote)) return null;
  if (!Array.isArray(value.events) || !value.events.every(isAppEvent)) return null;
  if (!isRecord(value.meta)) return null;

  const meta: Record<string, number> = {};
  Object.entries(value.meta).forEach(([key, metaValue]) => {
    if (isNumber(metaValue)) {
      meta[key] = metaValue;
    }
  });

  return {
    version: value.version,
    exportedAt: value.exportedAt,
    db: { name: value.db.name, version: value.db.version },
    notes: value.notes,
    events: value.events,
    meta
  };
};

export const exportAppData = async (): Promise<AppDataExport | null> => {
  return await withDb<AppDataExport | null>(
    null,
    async (db) => {
      await ensureProjection(db);
      const [notes, events, metaRecords] = await Promise.all([
        db.getAll(STORE_NOTES),
        db.getAll(STORE_EVENTS),
        db.getAll(STORE_META)
      ]);
      const meta = metaRecords.reduce<Record<string, number>>((acc, record) => {
        if (typeof record?.value === 'number') {
          acc[record.key] = record.value;
        }
        return acc;
      }, {});

      return {
        version: EXPORT_VERSION,
        exportedAt: Date.now(),
        db: {
          name: DB_NAME,
          version: DB_VERSION
        },
        notes,
        events,
        meta
      };
    },
    'Failed to export data'
  );
};

export const clearAllData = async (): Promise<boolean> => {
  return await withDb(
    false,
    async (db) => {
      const tx = db.transaction([STORE_NOTES, STORE_EVENTS, STORE_META], 'readwrite');
      await Promise.all([
        tx.objectStore(STORE_NOTES).clear(),
        tx.objectStore(STORE_EVENTS).clear(),
        tx.objectStore(STORE_META).clear()
      ]);
      await tx.done;
      return true;
    },
    'Failed to clear data'
  );
};

export const importAppData = async (payload: AppDataExport, mode: ImportMode): Promise<boolean> => {
  return await withDb(
    false,
    async (db) => {
      const tx = db.transaction([STORE_NOTES, STORE_EVENTS, STORE_META], 'readwrite');
      const notesStore = tx.objectStore(STORE_NOTES);
      const eventsStore = tx.objectStore(STORE_EVENTS);
      const metaStore = tx.objectStore(STORE_META);

      if (mode === 'replace') {
        await Promise.all([
          notesStore.clear(),
          eventsStore.clear(),
          metaStore.clear()
        ]);
      }

      for (const note of payload.notes) {
        normalizeNoteSubTypeInPlace(note);
        await notesStore.put(note);
      }

      for (const event of payload.events) {
        normalizeEventSubTypeInPlace(event);
        await eventsStore.put(event);
      }

      const existingMetaRecords = mode === 'merge' ? await metaStore.getAll() : [];
      const existingMeta = existingMetaRecords.reduce<Record<string, number>>((acc, record) => {
        if (typeof record?.value === 'number') {
          acc[record.key] = record.value;
        }
        return acc;
      }, {});

      const meta = mode === 'merge' ? { ...existingMeta, ...payload.meta } : { ...payload.meta };
      const maxImportedEventAt = payload.events.length > 0
        ? Math.max(...payload.events.map((event) => event.createdAt))
        : 0;
      const existingLastEventAt = typeof existingMeta[META_LAST_EVENT_AT] === 'number'
        ? existingMeta[META_LAST_EVENT_AT]
        : 0;
      const existingLastProjectionAt = typeof existingMeta[META_LAST_PROJECTION_AT] === 'number'
        ? existingMeta[META_LAST_PROJECTION_AT]
        : 0;
      const nextLastEventAt = mode === 'merge'
        ? Math.max(existingLastEventAt, maxImportedEventAt)
        : maxImportedEventAt;
      const nextLastProjectionAt = mode === 'merge'
        ? Math.max(existingLastProjectionAt, nextLastEventAt)
        : nextLastEventAt;

      meta[META_LAST_EVENT_AT] = nextLastEventAt;
      meta[META_LAST_PROJECTION_AT] = nextLastProjectionAt;
      meta[META_SUBTYPE_MIGRATION_V1] = Date.now();

      for (const [key, value] of Object.entries(meta)) {
        if (isNumber(value)) {
          await metaStore.put({ key, value });
        }
      }

      await tx.done;
      return true;
    },
    'Failed to import data'
  );
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
  updates: Pick<Partial<Note>, 'parentId' | 'type' | 'subType' | 'confidence' | 'confidenceLabel' | 'analysisPending'>
): Promise<void> => {
  const normalizedUpdates = {
    ...updates,
    ...(typeof updates.subType === 'string' ? { subType: normalizeSubType(updates.subType) } : {})
  };
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
          payload: { id: noteId, updates: normalizedUpdates, updatedAt }
        };
        await appendEvent(db, event);
        if (typeof normalizedUpdates.parentId !== 'undefined') note.parentId = normalizedUpdates.parentId;
        if (typeof normalizedUpdates.type !== 'undefined') note.type = normalizedUpdates.type;
        if (typeof normalizedUpdates.subType !== 'undefined') note.subType = normalizedUpdates.subType;
        if (typeof normalizedUpdates.confidence !== 'undefined') note.confidence = normalizedUpdates.confidence;
        if (typeof normalizedUpdates.confidenceLabel !== 'undefined') note.confidenceLabel = normalizedUpdates.confidenceLabel;
        if (typeof normalizedUpdates.analysisPending !== 'undefined') note.analysisPending = normalizedUpdates.analysisPending;
        note.updatedAt = updatedAt;
        await db.put(STORE_NOTES, note);
        const newParentId =
          typeof normalizedUpdates.parentId !== 'undefined' ? normalizedUpdates.parentId : note.parentId;
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
