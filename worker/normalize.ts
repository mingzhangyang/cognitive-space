import { CONFIDENCE_LABELS, confidenceLabelToScore, scoreToConfidenceLabel } from '../shared/confidence';
import { normalizeSubType } from '../shared/subtypes';
import {
  CLASSIFICATIONS,
  CLASSIFICATION_CONFIDENCE_THRESHOLD,
  DARK_MATTER_CONFIDENCE_THRESHOLD,
  RELATION_CONFIDENCE_THRESHOLD
} from './constants';
import type { AnalyzeResponse, DarkMatterAnalyzeResponse, DarkMatterSuggestion } from './types';
import { asRecord } from './utils';

function normalizeConfidenceLabel(input: unknown): AnalyzeResponse['confidenceLabel'] {
  const record = asRecord(input);
  const labelRaw = typeof record?.confidenceLabel === 'string' ? record.confidenceLabel.toLowerCase() : '';
  if (CONFIDENCE_LABELS.has(labelRaw as AnalyzeResponse['confidenceLabel'])) {
    return labelRaw as AnalyzeResponse['confidenceLabel'];
  }
  if (typeof record?.confidence === 'number') {
    return scoreToConfidenceLabel(record.confidence);
  }
  return 'possible';
}

export function normalizeResult(input: unknown, validQuestionIds: Set<string>): AnalyzeResponse {
  const record = asRecord(input);
  const classificationRaw =
    typeof record?.classification === 'string' ? record.classification.toLowerCase() : '';
  const classification = CLASSIFICATIONS.has(classificationRaw as AnalyzeResponse['classification'])
    ? (classificationRaw as AnalyzeResponse['classification'])
    : 'trigger';

  const confidenceLabel = normalizeConfidenceLabel(record);
  const confidenceScore = confidenceLabelToScore(confidenceLabel);

  const shouldSuppressClassification = confidenceScore < CLASSIFICATION_CONFIDENCE_THRESHOLD;
  const finalClassification = shouldSuppressClassification ? 'uncategorized' : classification;

  // Validate relatedQuestionId - only accept if it exists in the provided questions
  let relatedQuestionId: string | null = null;
  if (
    confidenceScore >= RELATION_CONFIDENCE_THRESHOLD &&
    finalClassification !== 'trigger' &&
    finalClassification !== 'uncategorized' &&
    typeof record?.relatedQuestionId === 'string' &&
    record.relatedQuestionId
  ) {
    if (validQuestionIds.has(record.relatedQuestionId)) {
      relatedQuestionId = record.relatedQuestionId;
    }
    // If the AI returned an invalid ID, silently ignore it
  }

  const reasoning =
    typeof record?.reasoning === 'string' && record.reasoning.trim()
      ? record.reasoning
      : 'Analyzed by GLM';

  return {
    classification: finalClassification,
    subType: finalClassification === 'uncategorized' ? undefined : normalizeSubType(record?.subType),
    confidenceLabel,
    relatedQuestionId,
    reasoning
  };
}

export function normalizeDarkMatterResult(
  input: unknown,
  validNoteIds: Set<string>,
  validQuestionIds: Set<string>,
  questionTitleById: Map<string, string>,
  maxClusters: number
): DarkMatterAnalyzeResponse {
  const record = asRecord(input);
  const rawSuggestions = Array.isArray(record?.suggestions) ? record.suggestions : [];
  const suggestions: DarkMatterSuggestion[] = [];
  const usedNoteIds = new Set<string>();

  for (let i = 0; i < rawSuggestions.length; i += 1) {
    if (suggestions.length >= maxClusters) break;
    const suggestion = asRecord(rawSuggestions[i]);
    if (!suggestion) continue;

    const kindRaw = typeof suggestion.kind === 'string' ? suggestion.kind : '';
    const kind =
      kindRaw === 'new_question' || kindRaw === 'existing_question'
        ? (kindRaw as DarkMatterSuggestion['kind'])
        : null;
    if (!kind) continue;

    let existingQuestionId: string | undefined;
    if (kind === 'existing_question') {
      if (
        typeof suggestion.existingQuestionId === 'string' &&
        validQuestionIds.has(suggestion.existingQuestionId)
      ) {
        existingQuestionId = suggestion.existingQuestionId;
      } else {
        continue;
      }
    }

    const titleRaw = typeof suggestion.title === 'string' ? suggestion.title.trim() : '';
    const title = titleRaw || (existingQuestionId ? questionTitleById.get(existingQuestionId) || '' : '');
    if (!title) continue;

    const noteIdsRaw = Array.isArray(suggestion.noteIds) ? suggestion.noteIds : [];
    const uniqueNoteIds: string[] = [];
    const seenNoteIds = new Set<string>();
    for (const id of noteIdsRaw) {
      if (typeof id !== 'string') continue;
      if (seenNoteIds.has(id)) continue;
      seenNoteIds.add(id);
      uniqueNoteIds.push(id);
    }
    const filteredNoteIds = uniqueNoteIds.filter(
      (id) => validNoteIds.has(id) && !usedNoteIds.has(id)
    );
    if (filteredNoteIds.length < 2) continue;

    filteredNoteIds.forEach((id) => usedNoteIds.add(id));

    const confidenceLabel = normalizeConfidenceLabel(suggestion);
    const confidenceScore = confidenceLabelToScore(confidenceLabel);
    if (confidenceScore < DARK_MATTER_CONFIDENCE_THRESHOLD) continue;
    const reasoning =
      typeof suggestion.reasoning === 'string' && suggestion.reasoning.trim()
        ? suggestion.reasoning.trim()
        : 'Suggested by analysis.';

    const id =
      typeof suggestion.id === 'string' && suggestion.id.trim()
        ? suggestion.id.trim()
        : `s${suggestions.length + 1}`;

    suggestions.push({
      id,
      kind,
      title,
      existingQuestionId,
      noteIds: filteredNoteIds,
      confidenceLabel,
      reasoning
    });
  }

  return { suggestions };
}
