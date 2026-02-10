import { ConfidenceLabel, DarkMatterSuggestionKind } from '../shared/domain';

export interface Env {
  BIGMODEL_API_KEY: string;
  BIGMODEL_MODEL?: string;
  MODEL_ID?: string;
  BIGMODEL_BASE_URL?: string;
  ASSETS: Fetcher;
}

export type Language = 'en' | 'zh';

export type AnalyzeRequest = {
  text?: string;
  language?: Language;
  existingQuestions?: Array<{ id: string; content: string }>;
};

export type AnalyzeResponse = {
  classification: 'question' | 'claim' | 'evidence' | 'trigger' | 'uncategorized';
  subType?: string;
  confidenceLabel: ConfidenceLabel;
  relatedQuestionId?: string | null;
  reasoning: string;
};

export type DarkMatterAnalyzeRequest = {
  language?: Language;
  notes?: Array<{
    id: string;
    content: string;
    type?: 'claim' | 'evidence' | 'trigger' | 'uncategorized';
    createdAt?: number;
  }>;
  existingQuestions?: Array<{ id: string; content: string }>;
  maxClusters?: number;
};

export type DarkMatterSuggestion = {
  id: string;
  kind: DarkMatterSuggestionKind;
  title: string;
  existingQuestionId?: string;
  noteIds: string[];
  confidenceLabel: ConfidenceLabel;
  reasoning: string;
};

export type DarkMatterAnalyzeResponse = {
  suggestions: DarkMatterSuggestion[];
};

export interface BigModelResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<string | { text?: string }>;
    };
  }>;
  error?: string | { message?: string };
}
