import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DarkMatterSuggestion, NoteType } from '../types';

const STORAGE_KEY = 'cs_assistant_inbox_v1';

export type AssistantJobKind = 'note_analysis' | 'dark_matter_analysis';

export type AssistantJob = {
  id: string;
  kind: AssistantJobKind;
  status: 'running';
  createdAt: number;
  updatedAt: number;
  meta?: {
    notePreview?: string;
    noteCount?: number;
  };
};

export type NoteSuggestionPayload = {
  noteId: string;
  notePreview: string;
  updates: {
    type: NoteType;
    subType?: string;
    confidence?: number;
    parentId?: string | null;
  };
  classification: NoteType;
  subType?: string;
  confidence?: number;
  relatedQuestionId?: string | null;
  relatedQuestionTitle?: string;
  reasoning?: string;
};

export type DarkMatterReadyPayload = {
  suggestionCount: number;
};

export type AssistantMessage =
  | {
      id: string;
      kind: 'note_suggestion';
      title: string;
      createdAt: number;
      payload: NoteSuggestionPayload;
    }
  | {
      id: string;
      kind: 'dark_matter_ready';
      title: string;
      createdAt: number;
      payload: DarkMatterReadyPayload;
    };

export type DarkMatterAnalysisSession = {
  suggestions: DarkMatterSuggestion[];
  noteIds: string[];
  createdAt: number;
};

type AssistantInboxState = {
  jobs: AssistantJob[];
  messages: AssistantMessage[];
  darkMatterAnalysis: DarkMatterAnalysisSession | null;
};

type AssistantInboxContextProps = {
  jobs: AssistantJob[];
  messages: AssistantMessage[];
  darkMatterAnalysis: DarkMatterAnalysisSession | null;
  createJob: (kind: AssistantJobKind, meta?: AssistantJob['meta']) => string;
  removeJob: (id: string) => void;
  addMessage: (message: AssistantMessage) => void;
  dismissMessage: (id: string) => void;
  dismissMessagesByKind: (kind: AssistantMessage['kind']) => void;
  setDarkMatterAnalysis: (analysis: DarkMatterAnalysisSession | null) => void;
  updateDarkMatterSuggestions: (suggestions: DarkMatterSuggestion[]) => void;
  messageCount: number;
  hasMessages: boolean;
};

const AssistantInboxContext = createContext<AssistantInboxContextProps | undefined>(undefined);

const createInboxId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `inbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const sanitizeState = (value: unknown): AssistantInboxState => {
  if (!value || typeof value !== 'object') {
    return { jobs: [], messages: [], darkMatterAnalysis: null };
  }
  const raw = value as Partial<AssistantInboxState>;
  return {
    jobs: Array.isArray(raw.jobs) ? raw.jobs : [],
    messages: Array.isArray(raw.messages) ? raw.messages : [],
    darkMatterAnalysis: raw.darkMatterAnalysis ?? null
  };
};

const loadStoredState = (): AssistantInboxState => {
  if (typeof window === 'undefined') {
    return { jobs: [], messages: [], darkMatterAnalysis: null };
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { jobs: [], messages: [], darkMatterAnalysis: null };
    const stored = sanitizeState(JSON.parse(raw));
    return { ...stored, jobs: [] };
  } catch {
    return { jobs: [], messages: [], darkMatterAnalysis: null };
  }
};

export const AssistantInboxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AssistantInboxState>(() => loadStoredState());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore persistence errors (e.g., storage disabled)
    }
  }, [state]);

  const createJob = useCallback((kind: AssistantJobKind, meta?: AssistantJob['meta']) => {
    const id = createInboxId();
    const now = Date.now();
    const job: AssistantJob = {
      id,
      kind,
      status: 'running',
      createdAt: now,
      updatedAt: now,
      meta
    };
    setState((prev) => ({ ...prev, jobs: [job, ...prev.jobs] }));
    return id;
  }, []);

  const removeJob = useCallback((id: string) => {
    setState((prev) => ({ ...prev, jobs: prev.jobs.filter((job) => job.id !== id) }));
  }, []);

  const addMessage = useCallback((message: AssistantMessage) => {
    setState((prev) => ({ ...prev, messages: [message, ...prev.messages].slice(0, 30) }));
  }, []);

  const dismissMessage = useCallback((id: string) => {
    setState((prev) => ({ ...prev, messages: prev.messages.filter((message) => message.id !== id) }));
  }, []);

  const dismissMessagesByKind = useCallback((kind: AssistantMessage['kind']) => {
    setState((prev) => ({ ...prev, messages: prev.messages.filter((message) => message.kind !== kind) }));
  }, []);

  const setDarkMatterAnalysis = useCallback((analysis: DarkMatterAnalysisSession | null) => {
    setState((prev) => ({ ...prev, darkMatterAnalysis: analysis }));
  }, []);

  const updateDarkMatterSuggestions = useCallback((suggestions: DarkMatterSuggestion[]) => {
    setState((prev) => {
      if (!prev.darkMatterAnalysis) return prev;
      return {
        ...prev,
        darkMatterAnalysis: {
          ...prev.darkMatterAnalysis,
          suggestions
        }
      };
    });
  }, []);

  const messageCount = state.jobs.length + state.messages.length;
  const hasMessages = messageCount > 0;

  const value = useMemo(
    () => ({
      jobs: state.jobs,
      messages: state.messages,
      darkMatterAnalysis: state.darkMatterAnalysis,
      createJob,
      removeJob,
      addMessage,
      dismissMessage,
      dismissMessagesByKind,
      setDarkMatterAnalysis,
      updateDarkMatterSuggestions,
      messageCount,
      hasMessages
    }),
    [
      state.jobs,
      state.messages,
      state.darkMatterAnalysis,
      createJob,
      removeJob,
      addMessage,
      dismissMessage,
      dismissMessagesByKind,
      setDarkMatterAnalysis,
      updateDarkMatterSuggestions,
      messageCount,
      hasMessages
    ]
  );

  return (
    <AssistantInboxContext.Provider value={value}>
      {children}
    </AssistantInboxContext.Provider>
  );
};

export const useAssistantInbox = () => {
  const context = useContext(AssistantInboxContext);
  if (!context) {
    throw new Error('useAssistantInbox must be used within AssistantInboxProvider');
  }
  return context;
};
