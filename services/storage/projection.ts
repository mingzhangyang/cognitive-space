import { AppEvent, Note } from '../../types';

export const applyEvent = (state: Map<string, Note>, event: AppEvent): void => {
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

export const projectNotesFromEvents = (events: AppEvent[]): Note[] => {
  const state = new Map<string, Note>();
  for (const event of events) {
    applyEvent(state, event);
  }
  return Array.from(state.values());
};
