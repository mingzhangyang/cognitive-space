import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, STORE_EVENTS, STORE_META, STORE_NOTES } from './constants';
import { logDbError } from './logging';
import { scheduleEventLogCompaction } from './events';
import { scheduleSubTypeMigration } from './migrations';
import { CognitiveSpaceDB } from './schema';

let dbPromise: Promise<IDBPDatabase<CognitiveSpaceDB>> | null = null;

export const getDb = async (): Promise<IDBPDatabase<CognitiveSpaceDB> | null> => {
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
    scheduleEventLogCompaction(db);
    return db;
  } catch (error) {
    logDbError('Failed to open IndexedDB', error);
    dbPromise = null;
    return null;
  }
};

export const withDb = async <T>(
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
