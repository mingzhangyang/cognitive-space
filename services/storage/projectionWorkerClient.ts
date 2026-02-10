import type { IDBPDatabase } from 'idb';
import type { ProjectionWorkerRequest, ProjectionWorkerResponse } from './projectionWorkerMessages';
import { ensureProjectionState } from './projectionRebuild';
import { CognitiveSpaceDB } from './schema';

type PendingRequest = {
  requestId: string;
  resolve: () => void;
  reject: (error: Error) => void;
};

let worker: Worker | null = null;
let pending: PendingRequest | null = null;
let ensurePromise: Promise<void> | null = null;
let requestCounter = 0;

const getWorker = (): Worker => {
  if (!worker) {
    worker = new Worker(new URL('./projection.worker.ts', import.meta.url), { type: 'module' });
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
  }
  return worker;
};

const resetWorker = () => {
  if (worker) {
    worker.terminate();
    worker = null;
  }
};

const handleMessage = (event: MessageEvent<ProjectionWorkerResponse>) => {
  if (!pending) return;
  const payload = event.data;
  if (!payload || payload.type !== 'projection-result' || payload.requestId !== pending.requestId) return;

  if (payload.ok) {
    pending.resolve();
  } else {
    const errorMessage = 'error' in payload ? payload.error : 'Projection rebuild failed';
    pending.reject(new Error(errorMessage));
  }
  pending = null;
};

const handleError = (event: ErrorEvent) => {
  if (!pending) return;
  pending.reject(event.error ?? new Error(event.message || 'Projection worker error'));
  pending = null;
  resetWorker();
};

const startWorkerEnsure = (): Promise<void> => {
  const requestId = `projection-${Date.now()}-${requestCounter++}`;
  const message: ProjectionWorkerRequest = { type: 'ensure-projection', requestId };
  const target = getWorker();

  return new Promise<void>((resolve, reject) => {
    pending = { requestId, resolve, reject };
    target.postMessage(message);
  });
};

export const ensureProjectionInWorker = async (db: IDBPDatabase<CognitiveSpaceDB>): Promise<void> => {
  if (typeof Worker === 'undefined') {
    await ensureProjectionState(db);
    return;
  }

  if (!ensurePromise) {
    ensurePromise = startWorkerEnsure().finally(() => {
      ensurePromise = null;
    });
  }
  await ensurePromise;
};
