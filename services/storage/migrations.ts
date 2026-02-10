import type { IDBPDatabase } from 'idb';
import { META_SUBTYPE_MIGRATION_V1, STORE_EVENTS, STORE_META, STORE_NOTES } from './constants';
import { logDbError } from './logging';
import { getMetaValue } from './meta';
import { normalizeEventSubTypeInPlace, normalizeNoteSubTypeInPlace } from './normalize';
import { CognitiveSpaceDB } from './schema';

let subTypeMigrationPromise: Promise<void> | null = null;
let subTypeMigrationDone = false;

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

export const scheduleSubTypeMigration = (db: IDBPDatabase<CognitiveSpaceDB>): void => {
  if (subTypeMigrationDone || subTypeMigrationPromise) return;

  const run = () => {
    subTypeMigrationPromise = runSubTypeMigration(db)
      .then(() => {
        subTypeMigrationDone = true;
      })
      .catch((error) => {
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
