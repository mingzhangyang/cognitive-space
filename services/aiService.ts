import { Note, NoteType, AnalysisResult, DarkMatterAnalysisResult } from "../types";
import { coerceConfidenceLabel } from "../utils/confidence";

export const analyzeText = async (
  text: string, 
  existingQuestions: Note[],
  language: 'en' | 'zh' = 'en'
): Promise<AnalysisResult> => {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        language,
        existingQuestions: existingQuestions.map(q => ({
          id: q.id,
          content: q.content
        }))
      })
    });

    if (!response.ok) {
      throw new Error(`Analyze request failed: ${response.status}`);
    }

    const result = (await response.json()) as Record<string, unknown>;

    const classificationValue =
      typeof result.classification === 'string' ? result.classification : undefined;
    const classification = Object.values(NoteType).includes(
      classificationValue as NoteType
    )
      ? (classificationValue as NoteType)
      : NoteType.TRIGGER;
    const subType = typeof result.subType === 'string' ? result.subType : undefined;
    const confidenceLabel = coerceConfidenceLabel(
      (result as { confidenceLabel?: unknown }).confidenceLabel,
      (result as { confidence?: unknown }).confidence
    );
    const relatedQuestionId =
      typeof result.relatedQuestionId === 'string' ? result.relatedQuestionId : null;
    const reasoning = typeof result.reasoning === 'string' ? result.reasoning : 'Analyzed by GLM';

    return {
      classification,
      subType,
      confidenceLabel,
      relatedQuestionId,
      reasoning
    };

  } catch (error) {
    console.error("AI analysis failed:", error);
    return {
      classification: NoteType.TRIGGER,
      reasoning: "Analysis failed, defaulted to Trigger.",
      confidenceLabel: 'loose'
    };
  }
};

export const analyzeDarkMatter = async (
  notes: Note[],
  existingQuestions: Note[],
  language: 'en' | 'zh' = 'en',
  maxClusters = 5
): Promise<DarkMatterAnalysisResult> => {
  try {
    const response = await fetch('/api/dark-matter/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language,
        maxClusters,
        notes: notes.map((note) => ({
          id: note.id,
          content: note.content,
          type: note.type,
          createdAt: note.createdAt
        })),
        existingQuestions: existingQuestions.map((q) => ({
          id: q.id,
          content: q.content
        }))
      })
    });

    if (!response.ok) {
      throw new Error(`Dark matter analyze request failed: ${response.status}`);
    }

    const result = (await response.json()) as DarkMatterAnalysisResult;
    const suggestions = Array.isArray(result?.suggestions)
      ? result.suggestions.map((suggestion) => ({
          ...suggestion,
          confidenceLabel: coerceConfidenceLabel(
            (suggestion as { confidenceLabel?: unknown }).confidenceLabel,
            (suggestion as { confidence?: unknown }).confidence
          )
        }))
      : [];
    return { suggestions };
  } catch (error) {
    console.error("Dark matter AI analysis failed:", error);
    return { suggestions: [] };
  }
};
