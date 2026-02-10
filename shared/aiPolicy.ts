import { NoteType } from './domain';

export const CLASSIFICATION_CONFIDENCE_THRESHOLD = 0.55;
export const RELATION_CONFIDENCE_THRESHOLD = 0.7;
export const DARK_MATTER_CONFIDENCE_THRESHOLD = 0.6;

export const CLASSIFICATIONS = new Set<NoteType>(Object.values(NoteType));

export const DEFAULT_ANALYSIS_REASONING = 'Analyzed by GLM';
export const DEFAULT_DARK_MATTER_REASONING = 'Suggested by analysis.';
