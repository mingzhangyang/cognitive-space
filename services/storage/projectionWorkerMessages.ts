export type ProjectionWorkerRequest = {
  type: 'ensure-projection';
  requestId: string;
};

export type ProjectionWorkerResponse =
  | {
      type: 'projection-result';
      requestId: string;
      ok: true;
    }
  | {
      type: 'projection-result';
      requestId: string;
      ok: false;
      error: string;
    };
