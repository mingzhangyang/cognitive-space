import { NoteType } from './domain';

export const CLASSIFICATION_CONFIDENCE_THRESHOLD = 0.55;
export const RELATION_CONFIDENCE_THRESHOLD = 0.7;
export const WANDERING_PLANET_CONFIDENCE_THRESHOLD = 0.6;

export const CLASSIFICATIONS = new Set<NoteType>(Object.values(NoteType));

export const DEFAULT_ANALYSIS_REASONING = 'Analyzed by GLM';
export const DEFAULT_WANDERING_PLANET_REASONING = 'Suggested by analysis.';
