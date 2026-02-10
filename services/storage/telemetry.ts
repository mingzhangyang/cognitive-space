import { DarkMatterSuggestionKind, TelemetryEvent } from '../../types';
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

export const recordDarkMatterAnalysisRequested = async (
  noteCount: number,
  questionCount: number
): Promise<void> => {
  const createdAt = Date.now();
  await logTelemetryEvent({
    id: crypto.randomUUID(),
    type: 'AI_DARK_MATTER_ANALYSIS_REQUESTED',
    createdAt,
    payload: { noteCount, questionCount }
  });
};

export const recordDarkMatterSuggestionApplied = async (
  kind: DarkMatterSuggestionKind,
  noteCount: number,
  suggestionId?: string
): Promise<void> => {
  const createdAt = Date.now();
  await logTelemetryEvent({
    id: crypto.randomUUID(),
    type: 'AI_DARK_MATTER_SUGGESTION_APPLIED',
    createdAt,
    payload: { kind, noteCount, suggestionId }
  });
};

export const recordDarkMatterSuggestionDismissed = async (suggestionId?: string): Promise<void> => {
  const createdAt = Date.now();
  await logTelemetryEvent({
    id: crypto.randomUUID(),
    type: 'AI_DARK_MATTER_SUGGESTION_DISMISSED',
    createdAt,
    payload: { suggestionId }
  });
};
