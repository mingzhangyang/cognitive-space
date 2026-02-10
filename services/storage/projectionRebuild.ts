import type { IDBPDatabase, IDBPTransaction } from 'idb';
import type { Note } from '../../types';
import {
  META_LAST_EVENT_AT,
  META_LAST_PROJECTION_AT,
  STORE_EVENTS,
  STORE_META,
  STORE_NOTES
} from './constants';
import { ensureEventLog } from './eventLog';
import { applyEvent } from './projection';
import { CognitiveSpaceDB } from './schema';

type MetaTx = IDBPTransaction<
  CognitiveSpaceDB,
  [typeof STORE_META] | [typeof STORE_NOTES, typeof STORE_META],
  'readwrite'
>;

const getMetaValueFromStore = async (tx: MetaTx, key: string): Promise<number> => {
  const record = await tx.objectStore(STORE_META).get(key);
  return typeof record?.value === 'number' ? record.value : 0;
};

const setMetaValueInStore = async (tx: MetaTx, key: string, value: number): Promise<void> => {
  await tx.objectStore(STORE_META).put({ key, value });
};

const markProjectionUpToDateTx = async (tx: MetaTx): Promise<void> => {
  const lastEventAt = await getMetaValueFromStore(tx, META_LAST_EVENT_AT);
  if (lastEventAt) {
    await setMetaValueInStore(tx, META_LAST_PROJECTION_AT, lastEventAt);
  }
};

const PROJECTION_REBUILD_WRITE_BATCH_SIZE = 200;

export const rebuildProjectionFromEvents = async (db: IDBPDatabase<CognitiveSpaceDB>): Promise<void> => {
  const events = await db.getAllFromIndex(STORE_EVENTS, 'by-created');
  if (events.length === 0) return;

  const state = new Map<string, Note>();
  for (const event of events) {
    applyEvent(state, event);
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
  }
};

export const ensureProjectionState = async (db: IDBPDatabase<CognitiveSpaceDB>): Promise<void> => {
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
