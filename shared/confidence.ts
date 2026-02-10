import { ConfidenceLabel } from './domain';

export const CONFIDENCE_LABELS = new Set<ConfidenceLabel>(['likely', 'possible', 'loose']);

export const isConfidenceLabel = (value: unknown): value is ConfidenceLabel =>
  typeof value === 'string' && CONFIDENCE_LABELS.has(value as ConfidenceLabel);

export const scoreToConfidenceLabel = (score: number): ConfidenceLabel => {
  if (score >= 0.7) return 'likely';
  if (score >= 0.5) return 'possible';
  return 'loose';
};

export const confidenceLabelToScore = (label: ConfidenceLabel): number => {
  switch (label) {
    case 'likely':
      return 0.75;
    case 'possible':
      return 0.6;
    default:
      return 0.4;
  }
};

export const coerceConfidenceLabel = (
  label: unknown,
  score?: unknown,
  fallback: ConfidenceLabel = 'possible'
): ConfidenceLabel => {
  if (isConfidenceLabel(label)) return label;
  if (typeof score === 'number' && Number.isFinite(score)) {
    return scoreToConfidenceLabel(score);
  }
  return fallback;
};
