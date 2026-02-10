import { NoteType, ConfidenceLabel, WanderingPlanetSuggestionKind } from './shared/domain';

export { NoteType };
export type { ConfidenceLabel, WanderingPlanetSuggestionKind };

export interface Note {
  id: string;
  content: string;
  type: NoteType;
  subType?: string; // e.g., 'hypothesis', 'fact', 'opinion', 'inspiration'
  confidence?: number; // legacy numeric confidence (0.0 to 1.0)
  confidenceLabel?: ConfidenceLabel;
  analysisPending?: boolean;
  createdAt: number;
  updatedAt: number;
  // If this note belongs to a "Question" (Gravity Center), this is the ID of that question.
  // If this note IS a question, this is usually null (unless it's a sub-question, not implemented yet).
  parentId?: string | null; 
}

export interface AnalysisResult {
  classification: NoteType;
  subType?: string;
  confidenceLabel?: ConfidenceLabel;
  relatedQuestionId?: string | null;
  reasoning: string;
}

export interface WanderingPlanetSuggestion {
  id: string;
  kind: WanderingPlanetSuggestionKind;
  title: string;
  existingQuestionId?: string;
  noteIds: string[];
  confidence?: number; // legacy numeric confidence (0.0 to 1.0)
  confidenceLabel: ConfidenceLabel;
  reasoning: string;
}

export interface WanderingPlanetAnalysisResult {
  suggestions: WanderingPlanetSuggestion[];
}

export type NoteEvent =
  | {
      id: string;
      type: 'NOTE_CREATED';
      createdAt: number;
      payload: { note: Note };
    }
  | {
      id: string;
      type: 'NOTE_UPDATED';
      createdAt: number;
      payload: { id: string; content: string; updatedAt: number };
    }
  | {
      id: string;
      type: 'NOTE_META_UPDATED';
      createdAt: number;
      payload: {
        id: string;
        updates: Pick<Partial<Note>, 'parentId' | 'type' | 'subType' | 'confidence' | 'confidenceLabel' | 'analysisPending'>;
        updatedAt: number;
      };
    }
  | {
      id: string;
      type: 'NOTE_DELETED';
      createdAt: number;
      payload: { id: string };
    }
  | {
      id: string;
      type: 'NOTE_TOUCHED';
      createdAt: number;
      payload: { id: string; updatedAt: number };
    };

export type TelemetryEvent =
  | {
      id: string;
      type: 'AI_WANDERING_PLANET_ANALYSIS_REQUESTED';
      createdAt: number;
      payload: { noteCount: number; questionCount: number };
    }
  | {
      id: string;
      type: 'AI_WANDERING_PLANET_SUGGESTION_APPLIED';
      createdAt: number;
      payload: {
        kind: WanderingPlanetSuggestionKind;
        noteCount: number;
        suggestionId?: string;
      };
    }
  | {
      id: string;
      type: 'AI_WANDERING_PLANET_SUGGESTION_DISMISSED';
      createdAt: number;
      payload: { suggestionId?: string };
    };

export type AppEvent = NoteEvent | TelemetryEvent;

export interface AppState {
  notes: Note[];
  isLoading: boolean;
}
