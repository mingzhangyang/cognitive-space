import { WanderingPlanetSuggestionKind, TelemetryEvent } from '../../types';
import { withDb } from './db';
import { appendEvent } from './events';

const logTelemetryEvent = async (event: TelemetryEvent): Promise<void> => {
  await withDb<void>(
    undefined,
    async (db) => {
      await appendEvent(db, event);
    },
    'Failed to record telemetry event'
  );
};

export const recordWanderingPlanetAnalysisRequested = async (
  noteCount: number,
  questionCount: number
): Promise<void> => {
  const createdAt = Date.now();
  await logTelemetryEvent({
    id: crypto.randomUUID(),
    type: 'AI_WANDERING_PLANET_ANALYSIS_REQUESTED',
    createdAt,
    payload: { noteCount, questionCount }
  });
};

export const recordWanderingPlanetSuggestionApplied = async (
  kind: WanderingPlanetSuggestionKind,
  noteCount: number,
  suggestionId?: string
): Promise<void> => {
  const createdAt = Date.now();
  await logTelemetryEvent({
    id: crypto.randomUUID(),
    type: 'AI_WANDERING_PLANET_SUGGESTION_APPLIED',
    createdAt,
    payload: { kind, noteCount, suggestionId }
  });
};

export const recordWanderingPlanetSuggestionDismissed = async (suggestionId?: string): Promise<void> => {
  const createdAt = Date.now();
  await logTelemetryEvent({
    id: crypto.randomUUID(),
    type: 'AI_WANDERING_PLANET_SUGGESTION_DISMISSED',
    createdAt,
    payload: { suggestionId }
  });
};
