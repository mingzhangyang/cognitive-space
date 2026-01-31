export enum NoteType {
  QUESTION = 'question',
  CLAIM = 'claim',
  EVIDENCE = 'evidence',
  TRIGGER = 'trigger',
  UNCATEGORIZED = 'uncategorized'
}

export interface Note {
  id: string;
  content: string;
  type: NoteType;
  subType?: string; // e.g., 'hypothesis', 'fact', 'opinion'
  confidence?: number; // 0.0 to 1.0
  createdAt: number;
  updatedAt: number;
  // If this note belongs to a "Question" (Gravity Center), this is the ID of that question.
  // If this note IS a question, this is usually null (unless it's a sub-question, not implemented yet).
  parentId?: string | null; 
}

export interface AnalysisResult {
  classification: NoteType;
  subType?: string;
  confidence?: number;
  relatedQuestionId?: string | null;
  reasoning: string;
}

export interface AppState {
  notes: Note[];
  isLoading: boolean;
}