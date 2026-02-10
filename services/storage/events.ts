import type { IDBPDatabase, IDBPTransaction } from 'idb';
import { AppEvent, Note, NoteEvent } from '../../types';
import {
  META_EVENT_LOG_COMPACTED_AT,
  META_LAST_EVENT_AT,
  META_LAST_PROJECTION_AT,
  NOTE_EVENT_TYPES,
  STORE_EVENTS,
  STORE_META,
  STORE_NOTES
} from './constants';
import { CognitiveSpaceDB } from './schema';

export const isNoteEvent = (event: AppEvent): event is NoteEvent => {
  return NOTE_EVENT_TYPES.has(event.type as NoteEvent['type']);
};

type MetaTx = IDBPTransaction<
  CognitiveSpaceDB,
  | [typeof STORE_META]
  | [typeof STORE_EVENTS, typeof STORE_META]
  | [typeof STORE_NOTES, typeof STORE_META]
  | [typeof STORE_NOTES, typeof STORE_EVENTS, typeof STORE_META],
  'readwrite'
>;

type EventTx = IDBPTransaction<
  CognitiveSpaceDB,
  [typeof STORE_EVENTS, typeof STORE_META] | [typeof STORE_NOTES, typeof STORE_EVENTS, typeof STORE_META],
  'readwrite'
>;

const getMetaValueFromStore = async (
  tx: MetaTx,
  key: string
): Promise<number> => {
  const record = await tx.objectStore(STORE_META).get(key);
  return typeof record?.value === 'number' ? record.value : 0;
};

const setMetaValueInStore = async (tx: MetaTx, key: string, value: number): Promise<void> => {
  await tx.objectStore(STORE_META).put({ key, value });
};

export const appendEventTx = async (
  tx: EventTx,
  event: AppEvent
): Promise<void> => {
  await tx.objectStore(STORE_EVENTS).put(event);
  if (!isNoteEvent(event)) return;
  const lastEventAt = await getMetaValueFromStore(tx, META_LAST_EVENT_AT);
  const nextValue = Math.max(lastEventAt, event.createdAt);
  await setMetaValueInStore(tx, META_LAST_EVENT_AT, nextValue);
};

export const appendEvent = async (
  db: IDBPDatabase<CognitiveSpaceDB>,
  event: AppEvent
): Promise<void> => {
  const tx = db.transaction([STORE_EVENTS, STORE_META], 'readwrite');
  await appendEventTx(tx, event);
  await tx.done;
};

export const markProjectionUpToDateTx = async (tx: MetaTx): Promise<void> => {
  const lastEventAt = await getMetaValueFromStore(tx, META_LAST_EVENT_AT);
  if (lastEventAt) {
    await setMetaValueInStore(tx, META_LAST_PROJECTION_AT, lastEventAt);
  }
};

export const markProjectionUpToDate = async (db: IDBPDatabase<CognitiveSpaceDB>): Promise<void> => {
  const tx = db.transaction([STORE_META], 'readwrite');
  const record = await tx.objectStore(STORE_META).get(META_LAST_EVENT_AT);
  const lastEventAt = typeof record?.value === 'number' ? record.value : 0;
  if (lastEventAt) {
    await tx.objectStore(STORE_META).put({ key: META_LAST_PROJECTION_AT, value: lastEventAt });
  }
  await tx.done;
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

export const projectNotesFromEvents = (events: AppEvent[]): Note[] => {
  const state = new Map<string, Note>();
  for (const event of events) {
    applyEvent(state, event);
  }
  return Array.from(state.values());
};

const PROJECTION_REBUILD_BATCH_SIZE = 250;
const PROJECTION_REBUILD_WRITE_BATCH_SIZE = 200;
const PROJECTION_REBUILD_SLICE_MS = 12;
const PROJECTION_IDLE_TIMEOUT_MS = 200;

const getNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const yieldToMain = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: PROJECTION_IDLE_TIMEOUT_MS });
    } else {
      setTimeout(resolve, 0);
    }
  });
};

let projectionRebuildPromise: Promise<void> | null = null;

const rebuildProjectionFromEvents = async (db: IDBPDatabase<CognitiveSpaceDB>): Promise<void> => {
  if (projectionRebuildPromise) {
    await projectionRebuildPromise;
    return;
  }

  projectionRebuildPromise = (async () => {
    const events = await db.getAllFromIndex(STORE_EVENTS, 'by-created');
    if (events.length === 0) return;

    const state = new Map<string, Note>();
    let lastYield = getNow();

    for (let i = 0; i < events.length; i += 1) {
      applyEvent(state, events[i]);
      if (i > 0 && i % PROJECTION_REBUILD_BATCH_SIZE === 0 && getNow() - lastYield > PROJECTION_REBUILD_SLICE_MS) {
        await yieldToMain();
        lastYield = getNow();
      }
    }

    const projected = Array.from(state.values());
    if (projected.length === 0) {
      const tx = db.transaction([STORE_NOTES, STORE_META], 'readwrite');
      await tx.objectStore(STORE_NOTES).clear();
      await markProjectionUpToDateTx(tx);
      await tx.done;
      return;
    }

    for (let i = 0; i < projected.length; i += PROJECTION_REBUILD_WRITE_BATCH_SIZE) {
      const isFirstBatch = i === 0;
      const isLastBatch = i + PROJECTION_REBUILD_WRITE_BATCH_SIZE >= projected.length;
      const tx = db.transaction([STORE_NOTES, STORE_META], 'readwrite');
      const notesStore = tx.objectStore(STORE_NOTES);
      if (isFirstBatch) {
        await notesStore.clear();
      }
      const slice = projected.slice(i, i + PROJECTION_REBUILD_WRITE_BATCH_SIZE);
      for (const note of slice) {
        await notesStore.put(note);
      }
      if (isLastBatch) {
        await markProjectionUpToDateTx(tx);
      }
      await tx.done;
      if (!isLastBatch) {
        await yieldToMain();
      }
    }
  })();

  try {
    await projectionRebuildPromise;
  } finally {
    projectionRebuildPromise = null;
  }
};

const ensureEventLog = async (db: IDBPDatabase<CognitiveSpaceDB>): Promise<void> => {
  const lastEventAt = await db.get(STORE_META, META_LAST_EVENT_AT);
  if (typeof lastEventAt?.value === 'number' && lastEventAt.value > 0) return;
  const existingNotes = await db.getAll(STORE_NOTES);
  if (existingNotes.length === 0) return;

  const tx = db.transaction([STORE_EVENTS, STORE_META], 'readwrite');
  const eventsStore = tx.objectStore(STORE_EVENTS);
  let nextLastEventAt = 0;

  for (const note of existingNotes) {
    const createdAt = typeof note.updatedAt === 'number' ? note.updatedAt : note.createdAt;
    const event: NoteEvent = {
      id: crypto.randomUUID(),
      type: 'NOTE_CREATED',
      createdAt,
      payload: { note }
    };
    await eventsStore.put(event);
    nextLastEventAt = Math.max(nextLastEventAt, createdAt);
  }

  if (nextLastEventAt) {
    await tx.objectStore(STORE_META).put({ key: META_LAST_EVENT_AT, value: nextLastEventAt });
    await tx.objectStore(STORE_META).put({ key: META_LAST_PROJECTION_AT, value: nextLastEventAt });
  }
  await tx.done;
};

export const ensureProjection = async (db: IDBPDatabase<CognitiveSpaceDB>): Promise<void> => {
  await ensureEventLog(db);
  const lastEventAtRecord = await db.get(STORE_META, META_LAST_EVENT_AT);
  const lastEventAt = typeof lastEventAtRecord?.value === 'number' ? lastEventAtRecord.value : 0;
  if (!lastEventAt) return;
  const lastProjectionAtRecord = await db.get(STORE_META, META_LAST_PROJECTION_AT);
  const lastProjectionAt = typeof lastProjectionAtRecord?.value === 'number'
    ? lastProjectionAtRecord.value
    : 0;
  if (lastProjectionAt >= lastEventAt) return;
  await rebuildProjectionFromEvents(db);
};

const EVENT_LOG_COMPACT_MIN_EVENTS = 2000;
const EVENT_LOG_COMPACT_RATIO = 3;

const shouldCompactEventLog = (eventCount: number, noteCount: number): boolean => {
  if (eventCount < EVENT_LOG_COMPACT_MIN_EVENTS) return false;
  if (noteCount === 0) return true;
  return eventCount > noteCount * EVENT_LOG_COMPACT_RATIO;
};

export const compactEventLog = async (db: IDBPDatabase<CognitiveSpaceDB>): Promise<void> => {
  await ensureProjection(db);
  const [notes, events] = await Promise.all([
    db.getAll(STORE_NOTES),
    db.getAll(STORE_EVENTS)
  ]);

  const telemetryEvents = events.filter((event) => !isNoteEvent(event));
  const noteEvents: NoteEvent[] = notes.map((note) => ({
    id: crypto.randomUUID(),
    type: 'NOTE_CREATED',
    createdAt: typeof note.updatedAt === 'number' ? note.updatedAt : note.createdAt,
    payload: { note }
  }));
  const compactedEvents: AppEvent[] = [...telemetryEvents, ...noteEvents];

  const tx = db.transaction([STORE_EVENTS, STORE_META], 'readwrite');
  const eventsStore = tx.objectStore(STORE_EVENTS);
  const metaStore = tx.objectStore(STORE_META);
  await eventsStore.clear();
  for (const event of compactedEvents) {
    await eventsStore.put(event);
  }
  const lastEventAt = noteEvents.reduce((max, event) => Math.max(max, event.createdAt), 0);
  await metaStore.put({ key: META_LAST_EVENT_AT, value: lastEventAt });
  await metaStore.put({ key: META_LAST_PROJECTION_AT, value: lastEventAt });
  await metaStore.put({ key: META_EVENT_LOG_COMPACTED_AT, value: Date.now() });
  await tx.done;
};

let compactionPromise: Promise<void> | null = null;

const maybeCompactEventLog = async (db: IDBPDatabase<CognitiveSpaceDB>): Promise<void> => {
  const eventTx = db.transaction(STORE_EVENTS, 'readonly');
  const eventCount = await eventTx.store.count();
  await eventTx.done;
  if (eventCount < EVENT_LOG_COMPACT_MIN_EVENTS) return;

  const noteTx = db.transaction(STORE_NOTES, 'readonly');
  const noteCount = await noteTx.store.count();
  await noteTx.done;
  if (!shouldCompactEventLog(eventCount, noteCount)) return;

  await compactEventLog(db);
};

export const scheduleEventLogCompaction = (db: IDBPDatabase<CognitiveSpaceDB>): void => {
  if (compactionPromise) return;
  const run = () => {
    compactionPromise = maybeCompactEventLog(db)
      .finally(() => {
        compactionPromise = null;
      });
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 0);
  }
};
