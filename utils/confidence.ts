import { ConfidenceLabel } from '../types';

const CONFIDENCE_LABELS: ConfidenceLabel[] = ['likely', 'possible', 'loose'];

export const isConfidenceLabel = (value: unknown): value is ConfidenceLabel =>
  typeof value === 'string' && CONFIDENCE_LABELS.includes(value as ConfidenceLabel);

export const scoreToConfidenceLabel = (score: number): ConfidenceLabel => {
  if (score >= 0.7) return 'likely';
  if (score >= 0.5) return 'possible';
  return 'loose';
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
