import type { IDBPDatabase } from 'idb';
import { openCognitiveSpaceDb } from './openDb';
import { ensureProjectionState } from './projectionRebuild';
import type { ProjectionWorkerRequest, ProjectionWorkerResponse } from './projectionWorkerMessages';
import { CognitiveSpaceDB } from './schema';

const ctx = self;

let dbPromise: Promise<IDBPDatabase<CognitiveSpaceDB>> | null = null;
let ensurePromise: Promise<void> | null = null;

const getDb = async (): Promise<IDBPDatabase<CognitiveSpaceDB>> => {
  if (!dbPromise) {
    dbPromise = openCognitiveSpaceDb();
  }
  try {
    return await dbPromise;
  } catch (error) {
    dbPromise = null;
    throw error;
  }
};

const runEnsureProjection = async (): Promise<void> => {
  const db = await getDb();
  await ensureProjectionState(db);
};

const handleEnsureProjection = async (requestId: string): Promise<void> => {
  const activePromise = ensurePromise ?? (ensurePromise = runEnsureProjection());
  try {
    await activePromise;
    const response: ProjectionWorkerResponse = {
      type: 'projection-result',
      requestId,
      ok: true
    };
    ctx.postMessage(response);
  } catch (error) {
    const response: ProjectionWorkerResponse = {
      type: 'projection-result',
      requestId,
      ok: false,
      error: error instanceof Error ? error.message : 'Projection rebuild failed'
    };
    ctx.postMessage(response);
  } finally {
    if (ensurePromise === activePromise) {
      ensurePromise = null;
    }
  }
};

ctx.addEventListener('message', (event: MessageEvent<ProjectionWorkerRequest>) => {
  const payload = event.data;
  if (!payload || payload.type !== 'ensure-projection') return;
  void handleEnsureProjection(payload.requestId);
});
