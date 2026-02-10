import type { IDBPDatabase } from 'idb';
import type { NoteEvent } from '../../types';
import { META_LAST_EVENT_AT, META_LAST_PROJECTION_AT, STORE_EVENTS, STORE_META, STORE_NOTES } from './constants';
import { CognitiveSpaceDB } from './schema';

export const ensureEventLog = async (db: IDBPDatabase<CognitiveSpaceDB>): Promise<void> => {
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
