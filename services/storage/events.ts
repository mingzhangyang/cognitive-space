import type { IDBPDatabase, IDBPTransaction } from 'idb';
import { AppEvent, NoteEvent } from '../../types';
import {
  META_EVENT_LOG_COMPACTED_AT,
  META_LAST_EVENT_AT,
  META_LAST_PROJECTION_AT,
  NOTE_EVENT_TYPES,
  STORE_EVENTS,
  STORE_META,
  STORE_NOTES
} from './constants';
import { ensureProjectionInWorker } from './projectionWorkerClient';
import { CognitiveSpaceDB } from './schema';
export { projectNotesFromEvents } from './projection';

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

export const ensureProjection = async (db: IDBPDatabase<CognitiveSpaceDB>): Promise<void> => {
  await ensureProjectionInWorker(db);
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
