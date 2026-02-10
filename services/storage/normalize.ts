import { AppEvent, Note } from '../../types';
import { normalizeSubType } from '../../utils/subtypes';

export const normalizeNoteSubTypeInPlace = (note: Note): boolean => {
  if (typeof note.subType !== 'string') return false;
  const normalized = normalizeSubType(note.subType);
  if (normalized === note.subType) return false;
  if (normalized) {
    note.subType = normalized;
  } else {
    delete note.subType;
  }
  return true;
};

export const normalizeEventSubTypeInPlace = (event: AppEvent): boolean => {
  if (event.type === 'NOTE_CREATED') {
    return normalizeNoteSubTypeInPlace(event.payload.note);
  }
  if (event.type === 'NOTE_META_UPDATED') {
    if (!Object.prototype.hasOwnProperty.call(event.payload.updates, 'subType')) return false;
    const normalized = normalizeSubType(event.payload.updates.subType);
    if (normalized === event.payload.updates.subType) return false;
    if (normalized) {
      event.payload.updates.subType = normalized;
    } else {
      delete event.payload.updates.subType;
    }
    return true;
  }
  return false;
};
