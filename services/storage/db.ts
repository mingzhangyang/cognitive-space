import type { IDBPDatabase } from 'idb';
import { logDbError } from './logging';
import { scheduleEventLogCompaction } from './events';
import { scheduleSubTypeMigration } from './migrations';
import { CognitiveSpaceDB } from './schema';
import { openCognitiveSpaceDb } from './openDb';

let dbPromise: Promise<IDBPDatabase<CognitiveSpaceDB>> | null = null;

export const getDb = async (): Promise<IDBPDatabase<CognitiveSpaceDB> | null> => {
  if (!dbPromise) {
    dbPromise = openCognitiveSpaceDb();
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

export const withDbOrThrow = async <T>(
  action: (db: IDBPDatabase<CognitiveSpaceDB>) => Promise<T>,
  errorMessage: string
): Promise<T> => {
  const db = await getDb();
  if (!db) {
    const error = new Error('IndexedDB is unavailable');
    logDbError(errorMessage, error);
    throw error;
  }
  try {
    return await action(db);
  } catch (error) {
    logDbError(errorMessage, error);
    throw error;
  }
};
