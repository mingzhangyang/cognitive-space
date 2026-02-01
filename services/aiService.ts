import { Note, NoteType, AnalysisResult } from "../types";

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
    const confidence = typeof result.confidence === 'number' ? result.confidence : 0.5;
    const relatedQuestionId =
      typeof result.relatedQuestionId === 'string' ? result.relatedQuestionId : null;
    const reasoning = typeof result.reasoning === 'string' ? result.reasoning : 'Analyzed by GLM';

    return {
      classification,
      subType,
      confidence,
      relatedQuestionId,
      reasoning
    };

  } catch (error) {
    console.error("AI analysis failed:", error);
    return {
      classification: NoteType.TRIGGER,
      reasoning: "Analysis failed, defaulted to Trigger.",
      confidence: 0
    };
  }
};
