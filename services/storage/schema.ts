import type { DBSchema } from 'idb';
import { Note, NoteType, AppEvent } from '../../types';

export interface CognitiveSpaceDB extends DBSchema {
  notes: {
    key: string;
    value: Note;
    indexes: {
      'by-type': NoteType;
      'by-parent': string | null;
      'by-updated': number;
    };
  };
  events: {
    key: string;
    value: AppEvent;
    indexes: {
      'by-created': number;
    };
  };
  meta: {
    key: string;
    value: {
      key: string;
      value: number;
    };
  };
}
