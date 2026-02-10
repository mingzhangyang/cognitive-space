import { NoteEvent } from '../../types';

export const DB_NAME = 'cognitive_space_db';
export const DB_VERSION = 2;
export const STORE_NOTES = 'notes';
export const STORE_EVENTS = 'events';
export const STORE_META = 'meta';
export const META_LAST_EVENT_AT = 'lastEventAt';
export const META_LAST_PROJECTION_AT = 'lastProjectionAt';
export const META_SUBTYPE_MIGRATION_V1 = 'subTypeMigrationV1';
export const NOTE_EVENT_TYPES = new Set<NoteEvent['type']>([
  'NOTE_CREATED',
  'NOTE_UPDATED',
  'NOTE_META_UPDATED',
  'NOTE_DELETED',
  'NOTE_TOUCHED'
]);
