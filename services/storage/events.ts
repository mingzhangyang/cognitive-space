import type { IDBPDatabase } from 'idb';
import { AppEvent, Note, NoteEvent } from '../../types';
import {
  META_LAST_EVENT_AT,
  META_LAST_PROJECTION_AT,
  NOTE_EVENT_TYPES,
  STORE_EVENTS,
  STORE_NOTES
} from './constants';
import { getMetaValue, setMetaValue } from './meta';
import { CognitiveSpaceDB } from './schema';

export const isNoteEvent = (event: AppEvent): event is NoteEvent => {
  return NOTE_EVENT_TYPES.has(event.type as NoteEvent['type']);
};

export const appendEvent = async (
  db: IDBPDatabase<CognitiveSpaceDB>,
  event: AppEvent
): Promise<void> => {
  await db.put(STORE_EVENTS, event);
  if (isNoteEvent(event)) {
    const lastEventAt = await getMetaValue(db, META_LAST_EVENT_AT);
    const nextValue = Math.max(lastEventAt, event.createdAt);
    await setMetaValue(db, META_LAST_EVENT_AT, nextValue);
  }
};

export const markProjectionUpToDate = async (db: IDBPDatabase<CognitiveSpaceDB>): Promise<void> => {
  const lastEventAt = await getMetaValue(db, META_LAST_EVENT_AT);
  if (lastEventAt) {
    await setMetaValue(db, META_LAST_PROJECTION_AT, lastEventAt);
  }
};

const applyEvent = (state: Map<string, Note>, event: AppEvent): void => {
  switch (event.type) {
    case 'NOTE_CREATED': {
      state.set(event.payload.note.id, { ...event.payload.note });
      return;
    }
    case 'NOTE_UPDATED': {
      const existing = state.get(event.payload.id);
      if (!existing) return;
      existing.content = event.payload.content;
      existing.updatedAt = event.payload.updatedAt;
      return;
    }
    case 'NOTE_META_UPDATED': {
      const existing = state.get(event.payload.id);
      if (!existing) return;
      const { updates } = event.payload;
      if (typeof updates.parentId !== 'undefined') existing.parentId = updates.parentId;
      if (typeof updates.type !== 'undefined') existing.type = updates.type;
      if (typeof updates.subType !== 'undefined') existing.subType = updates.subType;
      if (typeof updates.confidence !== 'undefined') existing.confidence = updates.confidence;
      if (typeof updates.confidenceLabel !== 'undefined') existing.confidenceLabel = updates.confidenceLabel;
      if (typeof updates.analysisPending !== 'undefined') {
        existing.analysisPending = updates.analysisPending;
      }
      existing.updatedAt = event.payload.updatedAt;
      return;
    }
    case 'NOTE_TOUCHED': {
      const existing = state.get(event.payload.id);
      if (!existing) return;
      existing.updatedAt = event.payload.updatedAt;
      return;
    }
    case 'NOTE_DELETED': {
      state.delete(event.payload.id);
      return;
    }
    case 'AI_DARK_MATTER_ANALYSIS_REQUESTED':
    case 'AI_DARK_MATTER_SUGGESTION_APPLIED':
    case 'AI_DARK_MATTER_SUGGESTION_DISMISSED':
    default:
      return;
  }
};

const rebuildProjectionFromEvents = async (db: IDBPDatabase<CognitiveSpaceDB>): Promise<void> => {
  const events = await db.getAllFromIndex(STORE_EVENTS, 'by-created');
  if (events.length === 0) return;
  const state = new Map<string, Note>();
  for (const event of events) {
    applyEvent(state, event);
  }
  const tx = db.transaction(STORE_NOTES, 'readwrite');
  await tx.store.clear();
  await Promise.all(Array.from(state.values()).map((note) => tx.store.put(note)));
  await tx.done;
  await markProjectionUpToDate(db);
};

const ensureEventLog = async (db: IDBPDatabase<CognitiveSpaceDB>): Promise<void> => {
  const lastEventAt = await getMetaValue(db, META_LAST_EVENT_AT);
  if (lastEventAt > 0) return;
  const existingNotes = await db.getAll(STORE_NOTES);
  if (existingNotes.length === 0) return;
  for (const note of existingNotes) {
    const createdAt = typeof note.updatedAt === 'number' ? note.updatedAt : note.createdAt;
    const event: NoteEvent = {
      id: crypto.randomUUID(),
      type: 'NOTE_CREATED',
      createdAt,
      payload: { note }
    };
    await appendEvent(db, event);
  }
  await markProjectionUpToDate(db);
};

export const ensureProjection = async (db: IDBPDatabase<CognitiveSpaceDB>): Promise<void> => {
  await ensureEventLog(db);
  const lastEventAt = await getMetaValue(db, META_LAST_EVENT_AT);
  if (!lastEventAt) return;
  const lastProjectionAt = await getMetaValue(db, META_LAST_PROJECTION_AT);
  if (lastProjectionAt >= lastEventAt) return;
  await rebuildProjectionFromEvents(db);
};
