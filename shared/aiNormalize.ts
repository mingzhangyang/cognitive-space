import { ConfidenceLabel, WanderingPlanetSuggestionKind, NoteType } from './domain';
import { confidenceLabelToScore, coerceConfidenceLabel } from './confidence';
import { normalizeSubType } from './subtypes';
import {
  CLASSIFICATIONS,
  CLASSIFICATION_CONFIDENCE_THRESHOLD,
  WANDERING_PLANET_CONFIDENCE_THRESHOLD,
  DEFAULT_ANALYSIS_REASONING,
  DEFAULT_WANDERING_PLANET_REASONING,
  RELATION_CONFIDENCE_THRESHOLD
} from './aiPolicy';

export type NormalizedAnalysisResult = {
  classification: NoteType;
  subType?: string;
  confidenceLabel: ConfidenceLabel;
  relatedQuestionId?: string | null;
  reasoning: string;
};

export type NormalizedWanderingPlanetSuggestion = {
  id: string;
  kind: WanderingPlanetSuggestionKind;
  title: string;
  existingQuestionId?: string;
  noteIds: string[];
  confidenceLabel: ConfidenceLabel;
  reasoning: string;
};

export type NormalizedWanderingPlanetResult = {
  suggestions: NormalizedWanderingPlanetSuggestion[];
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const normalizeId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeConfidenceLabel = (record: Record<string, unknown> | null): ConfidenceLabel => {
  if (!record) return 'possible';
  const labelRaw =
    typeof record.confidenceLabel === 'string'
      ? record.confidenceLabel.toLowerCase()
      : record.confidenceLabel;
  return coerceConfidenceLabel(labelRaw, record.confidence);
};

export function normalizeAnalysisResult(
  input: unknown,
  validQuestionIds: Set<string>
): NormalizedAnalysisResult {
  const record = asRecord(input);
  const classificationRaw =
    typeof record?.classification === 'string' ? record.classification.toLowerCase() : '';
  const classification = CLASSIFICATIONS.has(classificationRaw as NoteType)
    ? (classificationRaw as NoteType)
    : NoteType.UNCATEGORIZED;

  const confidenceLabel = normalizeConfidenceLabel(record);
  const confidenceScore = confidenceLabelToScore(confidenceLabel);
  const shouldSuppressClassification = confidenceScore < CLASSIFICATION_CONFIDENCE_THRESHOLD;
  const finalClassification = shouldSuppressClassification ? NoteType.UNCATEGORIZED : classification;

  let relatedQuestionId: string | null = null;
  if (
    confidenceScore >= RELATION_CONFIDENCE_THRESHOLD &&
    finalClassification !== NoteType.TRIGGER &&
    finalClassification !== NoteType.UNCATEGORIZED &&
    record?.relatedQuestionId
  ) {
    const normalizedId = normalizeId(record.relatedQuestionId);
    if (normalizedId && validQuestionIds.has(normalizedId)) {
      relatedQuestionId = normalizedId;
    }
  }

  const reasoning =
    typeof record?.reasoning === 'string' && record.reasoning.trim()
      ? record.reasoning
      : DEFAULT_ANALYSIS_REASONING;

  return {
    classification: finalClassification,
    subType: finalClassification === NoteType.UNCATEGORIZED ? undefined : normalizeSubType(record?.subType),
    confidenceLabel,
    relatedQuestionId,
    reasoning
  };
}

export function normalizeWanderingPlanetResult(
  input: unknown,
  validNoteIds: Set<string>,
  validQuestionIds: Set<string>,
  questionTitleById: Map<string, string>,
  maxClusters: number
): NormalizedWanderingPlanetResult {
  const record = asRecord(input);
  const rawSuggestions = Array.isArray(record?.suggestions) ? record.suggestions : [];
  const suggestions: NormalizedWanderingPlanetSuggestion[] = [];
  const usedNoteIds = new Set<string>();
  const usedSuggestionIds = new Set<string>();

  for (let i = 0; i < rawSuggestions.length; i += 1) {
    if (suggestions.length >= maxClusters) break;
    const suggestion = asRecord(rawSuggestions[i]);
    if (!suggestion) continue;

    const kindRaw = typeof suggestion.kind === 'string' ? suggestion.kind : '';
    const kind =
      kindRaw === 'new_question' || kindRaw === 'existing_question'
        ? (kindRaw as WanderingPlanetSuggestionKind)
        : null;
    if (!kind) continue;

    let existingQuestionId: string | undefined;
    if (kind === 'existing_question') {
      const normalizedId = normalizeId(suggestion.existingQuestionId);
      if (normalizedId && validQuestionIds.has(normalizedId)) {
        existingQuestionId = normalizedId;
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
      const normalizedId = normalizeId(id);
      if (!normalizedId) continue;
      if (seenNoteIds.has(normalizedId)) continue;
      seenNoteIds.add(normalizedId);
      uniqueNoteIds.push(normalizedId);
    }

    const filteredNoteIds = uniqueNoteIds.filter(
      (id) => validNoteIds.has(id) && !usedNoteIds.has(id)
    );
    if (filteredNoteIds.length < 2) continue;
    filteredNoteIds.forEach((id) => usedNoteIds.add(id));

    const confidenceLabel = normalizeConfidenceLabel(suggestion);
    const confidenceScore = confidenceLabelToScore(confidenceLabel);
    if (confidenceScore < WANDERING_PLANET_CONFIDENCE_THRESHOLD) continue;

    const reasoning =
      typeof suggestion.reasoning === 'string' && suggestion.reasoning.trim()
        ? suggestion.reasoning.trim()
        : DEFAULT_WANDERING_PLANET_REASONING;

    let id = normalizeId(suggestion.id) || `s${suggestions.length + 1}`;
    if (usedSuggestionIds.has(id)) {
      let suffix = suggestions.length + 1;
      while (usedSuggestionIds.has(`s${suffix}`)) {
        suffix += 1;
      }
      id = `s${suffix}`;
    }
    usedSuggestionIds.add(id);

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
