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

    const result = await response.json();

    return {
      classification: (result.classification as NoteType) || NoteType.TRIGGER,
      subType: result.subType || undefined,
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
      relatedQuestionId: result.relatedQuestionId || null,
      reasoning: result.reasoning || "Analyzed by GLM"
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
