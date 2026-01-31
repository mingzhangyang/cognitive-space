import { GoogleGenAI, Type } from "@google/genai";
import { Note, NoteType, AnalysisResult } from "../types";

// Define the schema for the AI response
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    classification: {
      type: Type.STRING,
      enum: [
        NoteType.QUESTION,
        NoteType.CLAIM,
        NoteType.EVIDENCE,
        NoteType.TRIGGER
      ],
      description: "Classify the text into one of the 4 cognitive types."
    },
    subType: {
      type: Type.STRING,
      description: "Specific nuance. CLAIM: 'hypothesis', 'opinion', 'conclusion'. EVIDENCE: 'fact', 'observation', 'anecdote', 'citation'. QUESTION: 'exploratory', 'specific'. TRIGGER: 'quote', 'feeling', 'idea'.",
      nullable: true
    },
    confidence: {
      type: Type.NUMBER,
      description: "Confidence score (0.0 - 1.0) of the classification.",
    },
    relatedQuestionId: {
      type: Type.STRING,
      description: "The ID of the most relevant existing question from the provided list, or null if none match strongly.",
      nullable: true
    },
    reasoning: {
      type: Type.STRING,
      description: "A short sentence explaining why this classification was made."
    }
  },
  required: ["classification", "confidence", "reasoning"]
};

export const analyzeText = async (
  text: string, 
  existingQuestions: Note[],
  language: 'en' | 'zh' = 'en'
): Promise<AnalysisResult> => {
  
  if (!process.env.API_KEY) {
    console.warn("No API Key found. Returning default.");
    return { classification: NoteType.TRIGGER, reasoning: "No API Key provided.", confidence: 0 };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Format existing questions for context
  const questionsContext = existingQuestions.map(q => 
    `ID: ${q.id} | Content: "${q.content.substring(0, 100)}..."`
  ).join('\n');

  const langInstruction = language === 'zh' 
    ? "Provide the 'reasoning' and 'subType' in Chinese (Simplified)." 
    : "Provide the 'reasoning' and 'subType' in English.";

  const prompt = `
    You are a cognitive assistant helping to externalize thought.
    
    Here is a new piece of text written by the user:
    "${text}"

    Here is a list of "Living Questions" the user is currently pondering:
    ${questionsContext || "No existing questions."}

    Your task is to analyze the cognitive role of this text.
    
    1. **Classify** the text:
       - **QUESTION**: An inquiry or problem statement.
         - Subtypes: 'exploratory' (broad/vague), 'specific' (targeted).
       - **CLAIM**: A statement of belief, argument, or hypothesis.
         - Subtypes: 'hypothesis' (tentative), 'opinion' (subjective), 'conclusion' (derived).
       - **EVIDENCE**: Data or experience supporting/refuting a claim.
         - Subtypes: 'fact' (verifiable), 'observation' (personal), 'anecdote' (story), 'citation' (reference).
       - **TRIGGER**: Raw input, inspiration, or fragments.
         - Subtypes: 'quote', 'feeling', 'idea'.

    2. **Connect**: If the text is NOT a 'question' itself, determine if it strongly relates to one of the "Living Questions". 
       - If yes, provide the ID. 
       - If it's a new topic entirely, return null.
       - If the text IS a 'question', return null for relatedQuestionId.

    3. **Confidence**: Assign a confidence score (0.0 to 1.0) based on how clear the intent is.

    ${langInstruction}

    Return the result in JSON matching the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    return {
      classification: result.classification as NoteType,
      subType: result.subType || undefined,
      confidence: result.confidence || 0.5,
      relatedQuestionId: result.relatedQuestionId || null,
      reasoning: result.reasoning || "Analyzed by Gemini"
    };

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    // Fallback
    return {
      classification: NoteType.TRIGGER,
      reasoning: "Analysis failed, defaulted to Trigger.",
      confidence: 0
    };
  }
};