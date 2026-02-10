import { AppEvent, Note, NoteEvent, NoteType, TelemetryEvent } from '../../types';
import { isConfidenceLabel } from '../../utils/confidence';
import {
  DB_NAME,
  DB_VERSION,
  META_LAST_EVENT_AT,
  META_LAST_PROJECTION_AT,
  META_SUBTYPE_MIGRATION_V1,
  STORE_EVENTS,
  STORE_META,
  STORE_NOTES
} from './constants';
import { withDb } from './db';
import { ensureProjection } from './events';
import { normalizeEventSubTypeInPlace, normalizeNoteSubTypeInPlace } from './normalize';

export type AppDataExport = {
  version: number;
  exportedAt: number;
  db: {
    name: string;
    version: number;
  };
  notes: Note[];
  events: AppEvent[];
  meta: Record<string, number>;
};

export type ImportMode = 'replace' | 'merge';

const EXPORT_VERSION = 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isNoteType = (value: unknown): value is NoteType =>
  typeof value === 'string' && Object.values(NoteType).includes(value as NoteType);

const isNote = (value: unknown): value is Note => {
  if (!isRecord(value)) return false;
  if (!isNonEmptyString(value.id)) return false;
  if (typeof value.content !== 'string') return false;
  if (!isNoteType(value.type)) return false;
  if (!isNumber(value.createdAt) || !isNumber(value.updatedAt)) return false;
  if (typeof value.subType !== 'undefined' && typeof value.subType !== 'string') return false;
  if (typeof value.confidence !== 'undefined' && !isNumber(value.confidence)) return false;
  if (typeof value.confidenceLabel !== 'undefined' && !isConfidenceLabel(value.confidenceLabel)) return false;
  if (typeof value.analysisPending !== 'undefined' && typeof value.analysisPending !== 'boolean') return false;
  if (
    typeof value.parentId !== 'undefined' &&
    value.parentId !== null &&
    !isNonEmptyString(value.parentId)
  ) {
    return false;
  }
  return true;
};

const isNoteEventRecord = (value: unknown): value is NoteEvent => {
  if (!isRecord(value)) return false;
  if (!isNonEmptyString(value.id)) return false;
  if (!isNonEmptyString(value.type)) return false;
  if (!isNumber(value.createdAt)) return false;
  if (!isRecord(value.payload)) return false;

  switch (value.type) {
    case 'NOTE_CREATED':
      return isRecord(value.payload) && isNote((value.payload as { note?: unknown }).note);
    case 'NOTE_UPDATED': {
      const payload = value.payload as { id?: unknown; content?: unknown; updatedAt?: unknown };
      return isNonEmptyString(payload.id) && typeof payload.content === 'string' && isNumber(payload.updatedAt);
    }
    case 'NOTE_META_UPDATED': {
      const payload = value.payload as {
        id?: unknown;
        updates?: unknown;
        updatedAt?: unknown;
      };
      if (!isNonEmptyString(payload.id) || !isNumber(payload.updatedAt) || !isRecord(payload.updates)) {
        return false;
      }
      const updates = payload.updates as Record<string, unknown>;
      if (
        typeof updates.parentId !== 'undefined' &&
        updates.parentId !== null &&
        !isNonEmptyString(updates.parentId)
      ) {
        return false;
      }
      if (typeof updates.type !== 'undefined' && !isNoteType(updates.type)) return false;
      if (typeof updates.subType !== 'undefined' && typeof updates.subType !== 'string') return false;
      if (typeof updates.confidence !== 'undefined' && !isNumber(updates.confidence)) return false;
      if (typeof updates.confidenceLabel !== 'undefined' && !isConfidenceLabel(updates.confidenceLabel)) return false;
      if (typeof updates.analysisPending !== 'undefined' && typeof updates.analysisPending !== 'boolean') return false;
      return true;
    }
    case 'NOTE_DELETED': {
      const payload = value.payload as { id?: unknown };
      return isNonEmptyString(payload.id);
    }
    case 'NOTE_TOUCHED': {
      const payload = value.payload as { id?: unknown; updatedAt?: unknown };
      return isNonEmptyString(payload.id) && isNumber(payload.updatedAt);
    }
    default:
      return false;
  }
};

const isTelemetryEvent = (value: unknown): value is TelemetryEvent => {
  if (!isRecord(value)) return false;
  if (!isNonEmptyString(value.id)) return false;
  if (!isNonEmptyString(value.type)) return false;
  if (!isNumber(value.createdAt)) return false;
  if (!isRecord(value.payload)) return false;

  switch (value.type) {
    case 'AI_WANDERING_PLANET_ANALYSIS_REQUESTED': {
      const payload = value.payload as { noteCount?: unknown; questionCount?: unknown };
      return isNumber(payload.noteCount) && isNumber(payload.questionCount);
    }
    case 'AI_WANDERING_PLANET_SUGGESTION_APPLIED': {
      const payload = value.payload as { kind?: unknown; noteCount?: unknown; suggestionId?: unknown };
      const validKind = payload.kind === 'new_question' || payload.kind === 'existing_question';
      return validKind && isNumber(payload.noteCount) &&
        (typeof payload.suggestionId === 'undefined' || typeof payload.suggestionId === 'string');
    }
    case 'AI_WANDERING_PLANET_SUGGESTION_DISMISSED': {
      const payload = value.payload as { suggestionId?: unknown };
      return typeof payload.suggestionId === 'undefined' || typeof payload.suggestionId === 'string';
    }
    default:
      return false;
  }
};

const isAppEvent = (value: unknown): value is AppEvent =>
  isNoteEventRecord(value) || isTelemetryEvent(value);

export const parseAppDataExport = (value: unknown): AppDataExport | null => {
  if (!isRecord(value)) return null;
  if (!isNumber(value.version) || value.version !== EXPORT_VERSION) return null;
  if (!isNumber(value.exportedAt)) return null;
  if (!isRecord(value.db) || typeof value.db.name !== 'string' || !isNumber(value.db.version)) return null;
  if (!Array.isArray(value.notes) || !value.notes.every(isNote)) return null;
  if (!Array.isArray(value.events) || !value.events.every(isAppEvent)) return null;
  if (!isRecord(value.meta)) return null;

  const noteIds = new Set<string>();
  for (const note of value.notes) {
    if (noteIds.has(note.id)) return null;
    noteIds.add(note.id);
  }

  const eventIds = new Set<string>();
  for (const event of value.events) {
    if (eventIds.has(event.id)) return null;
    eventIds.add(event.id);
  }

  const meta: Record<string, number> = {};
  Object.entries(value.meta).forEach(([key, metaValue]) => {
    if (isNumber(metaValue)) {
      meta[key] = metaValue;
    }
  });

  return {
    version: value.version,
    exportedAt: value.exportedAt,
    db: { name: value.db.name, version: value.db.version },
    notes: value.notes,
    events: value.events,
    meta
  };
};

export const exportAppData = async (): Promise<AppDataExport | null> => {
  return await withDb<AppDataExport | null>(
    null,
    async (db) => {
      await ensureProjection(db);
      const [notes, events, metaRecords] = await Promise.all([
        db.getAll(STORE_NOTES),
        db.getAll(STORE_EVENTS),
        db.getAll(STORE_META)
      ]);
      const meta = metaRecords.reduce<Record<string, number>>((acc, record) => {
        if (typeof record?.value === 'number') {
          acc[record.key] = record.value;
        }
        return acc;
      }, {});

      return {
        version: EXPORT_VERSION,
        exportedAt: Date.now(),
        db: {
          name: DB_NAME,
          version: DB_VERSION
        },
        notes,
        events,
        meta
      };
    },
    'Failed to export data'
  );
};

export const clearAllData = async (): Promise<boolean> => {
  return await withDb(
    false,
    async (db) => {
      const tx = db.transaction([STORE_NOTES, STORE_EVENTS, STORE_META], 'readwrite');
      await Promise.all([
        tx.objectStore(STORE_NOTES).clear(),
        tx.objectStore(STORE_EVENTS).clear(),
        tx.objectStore(STORE_META).clear()
      ]);
      await tx.done;
      return true;
    },
    'Failed to clear data'
  );
};

export const importAppData = async (payload: AppDataExport, mode: ImportMode): Promise<boolean> => {
  return await withDb(
    false,
    async (db) => {
      const tx = db.transaction([STORE_NOTES, STORE_EVENTS, STORE_META], 'readwrite');
      const notesStore = tx.objectStore(STORE_NOTES);
      const eventsStore = tx.objectStore(STORE_EVENTS);
      const metaStore = tx.objectStore(STORE_META);

      if (mode === 'replace') {
        await Promise.all([
          notesStore.clear(),
          eventsStore.clear(),
          metaStore.clear()
        ]);
      }

      for (const note of payload.notes) {
        normalizeNoteSubTypeInPlace(note);
        if (mode === 'merge') {
          const existing = await notesStore.get(note.id);
          if (existing && typeof existing.updatedAt === 'number' && existing.updatedAt >= note.updatedAt) {
            continue;
          }
        }
        await notesStore.put(note);
      }

      for (const event of payload.events) {
        normalizeEventSubTypeInPlace(event);
        if (mode === 'merge') {
          const existing = await eventsStore.get(event.id);
          if (existing) continue;
        }
        await eventsStore.put(event);
      }

      const existingMetaRecords = mode === 'merge' ? await metaStore.getAll() : [];
      const existingMeta = existingMetaRecords.reduce<Record<string, number>>((acc, record) => {
        if (typeof record?.value === 'number') {
          acc[record.key] = record.value;
        }
        return acc;
      }, {});

      const meta = mode === 'merge' ? { ...existingMeta, ...payload.meta } : { ...payload.meta };
      const maxImportedEventAt = payload.events.length > 0
        ? Math.max(...payload.events.map((event) => event.createdAt))
        : 0;
      const existingLastEventAt = typeof existingMeta[META_LAST_EVENT_AT] === 'number'
        ? existingMeta[META_LAST_EVENT_AT]
        : 0;
      const existingLastProjectionAt = typeof existingMeta[META_LAST_PROJECTION_AT] === 'number'
        ? existingMeta[META_LAST_PROJECTION_AT]
        : 0;
      const nextLastEventAt = mode === 'merge'
        ? Math.max(existingLastEventAt, maxImportedEventAt)
        : maxImportedEventAt;
      const nextLastProjectionAt = mode === 'merge'
        ? Math.max(existingLastProjectionAt, nextLastEventAt)
        : nextLastEventAt;

      meta[META_LAST_EVENT_AT] = nextLastEventAt;
      meta[META_LAST_PROJECTION_AT] = nextLastProjectionAt;
      meta[META_SUBTYPE_MIGRATION_V1] = Date.now();

      for (const [key, metaValue] of Object.entries(meta)) {
        if (isNumber(metaValue)) {
          await metaStore.put({ key, value: metaValue });
        }
      }

      await tx.done;
      return true;
    },
    'Failed to import data'
  );
};
