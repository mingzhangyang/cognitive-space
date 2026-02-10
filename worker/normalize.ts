import { normalizeAnalysisResult, normalizeWanderingPlanetResult as normalizeWanderingPlanetResultShared } from '../shared/aiNormalize';
import type { AnalyzeResponse, WanderingPlanetAnalyzeResponse } from './types';

export function normalizeResult(input: unknown, validQuestionIds: Set<string>): AnalyzeResponse {
  return normalizeAnalysisResult(input, validQuestionIds);
}

export function normalizeWanderingPlanetResult(
  input: unknown,
  validNoteIds: Set<string>,
  validQuestionIds: Set<string>,
  questionTitleById: Map<string, string>,
  maxClusters: number
): WanderingPlanetAnalyzeResponse {
  return normalizeWanderingPlanetResultShared(
    input,
    validNoteIds,
    validQuestionIds,
    questionTitleById,
    maxClusters
  );
}
