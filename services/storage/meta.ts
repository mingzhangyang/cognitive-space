import type { IDBPDatabase } from 'idb';
import { STORE_META } from './constants';
import { CognitiveSpaceDB } from './schema';

export const getMetaValue = async (
  db: IDBPDatabase<CognitiveSpaceDB>,
  key: string
): Promise<number> => {
  const record = await db.get(STORE_META, key);
  return typeof record?.value === 'number' ? record.value : 0;
};

export const setMetaValue = async (
  db: IDBPDatabase<CognitiveSpaceDB>,
  key: string,
  value: number
): Promise<void> => {
  await db.put(STORE_META, { key, value });
};
