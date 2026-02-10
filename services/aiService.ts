import { Note, NoteType, AnalysisResult, DarkMatterAnalysisResult } from "../types";
import { normalizeAnalysisResult, normalizeDarkMatterResult } from "../shared/aiNormalize";

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

    const result = await response.json();
    const validQuestionIds = new Set(existingQuestions.map((question) => question.id));
    return normalizeAnalysisResult(result, validQuestionIds);

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

    const result = await response.json();
    const validNoteIds = new Set(notes.map((note) => note.id));
    const validQuestionIds = new Set(existingQuestions.map((question) => question.id));
    const questionTitleById = new Map(existingQuestions.map((question) => [question.id, question.content]));
    return normalizeDarkMatterResult(result, validNoteIds, validQuestionIds, questionTitleById, maxClusters);
  } catch (error) {
    console.error("Dark matter AI analysis failed:", error);
    return { suggestions: [] };
  }
};
