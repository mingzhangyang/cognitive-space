export type NoteStoreEventKind =
  | 'created'
  | 'updated'
  | 'meta_updated'
  | 'deleted'
  | 'touched';

export interface NoteStoreEventDetail {
  id: string;
  kind: NoteStoreEventKind;
}

const noteEventTarget = typeof EventTarget !== 'undefined' ? new EventTarget() : null;

export const subscribeToNoteEvents = (
  handler: (detail: NoteStoreEventDetail) => void
): (() => void) => {
  if (!noteEventTarget) return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<NoteStoreEventDetail>).detail;
    if (detail) handler(detail);
  };
  noteEventTarget.addEventListener('note', listener);
  return () => noteEventTarget.removeEventListener('note', listener);
};

export const emitNoteEvent = (detail: NoteStoreEventDetail): void => {
  if (!noteEventTarget) return;
  noteEventTarget.dispatchEvent(new CustomEvent('note', { detail }));
};
