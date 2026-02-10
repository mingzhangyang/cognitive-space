import { normalizeAnalysisResult, normalizeDarkMatterResult as normalizeDarkMatterResultShared } from '../shared/aiNormalize';
import type { AnalyzeResponse, DarkMatterAnalyzeResponse } from './types';

export function normalizeResult(input: unknown, validQuestionIds: Set<string>): AnalyzeResponse {
  return normalizeAnalysisResult(input, validQuestionIds);
}

export function normalizeDarkMatterResult(
  input: unknown,
  validNoteIds: Set<string>,
  validQuestionIds: Set<string>,
  questionTitleById: Map<string, string>,
  maxClusters: number
): DarkMatterAnalyzeResponse {
  return normalizeDarkMatterResultShared(
    input,
    validNoteIds,
    validQuestionIds,
    questionTitleById,
    maxClusters
  );
}
