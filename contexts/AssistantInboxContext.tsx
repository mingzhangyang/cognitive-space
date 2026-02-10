import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { WanderingPlanetSuggestion, NoteType, ConfidenceLabel } from '../types';

const STORAGE_KEY = 'cs_assistant_inbox_v1';
const STALE_JOB_MS = 20 * 60 * 1000;

export type AssistantJobKind = 'note_analysis' | 'wandering_planet_analysis';

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
    confidenceLabel?: ConfidenceLabel;
    parentId?: string | null;
  };
  classification: NoteType;
  subType?: string;
  confidenceLabel?: ConfidenceLabel;
  relatedQuestionId?: string | null;
  relatedQuestionTitle?: string;
  reasoning?: string;
};

export type WanderingPlanetReadyPayload = {
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
      kind: 'wandering_planet_ready';
      title: string;
      createdAt: number;
      payload: WanderingPlanetReadyPayload;
    };

export type WanderingPlanetAnalysisSession = {
  suggestions: WanderingPlanetSuggestion[];
  noteIds: string[];
  createdAt: number;
};

type AssistantInboxState = {
  jobs: AssistantJob[];
  messages: AssistantMessage[];
  wanderingPlanetAnalysis: WanderingPlanetAnalysisSession | null;
};

type AssistantInboxContextProps = {
  jobs: AssistantJob[];
  messages: AssistantMessage[];
  wanderingPlanetAnalysis: WanderingPlanetAnalysisSession | null;
  createJob: (kind: AssistantJobKind, meta?: AssistantJob['meta']) => string;
  removeJob: (id: string) => void;
  addMessage: (message: AssistantMessage) => void;
  dismissMessage: (id: string) => void;
  dismissMessagesByKind: (kind: AssistantMessage['kind']) => void;
  setWanderingPlanetAnalysis: (analysis: WanderingPlanetAnalysisSession | null) => void;
  updateWanderingPlanetSuggestions: (suggestions: WanderingPlanetSuggestion[]) => void;
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
    return { jobs: [], messages: [], wanderingPlanetAnalysis: null };
  }
  const raw = value as Partial<AssistantInboxState>;
  return {
    jobs: Array.isArray(raw.jobs) ? raw.jobs : [],
    messages: Array.isArray(raw.messages) ? raw.messages : [],
    wanderingPlanetAnalysis: raw.wanderingPlanetAnalysis ?? null
  };
};

const loadStoredState = (): AssistantInboxState => {
  if (typeof window === 'undefined') {
    return { jobs: [], messages: [], wanderingPlanetAnalysis: null };
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { jobs: [], messages: [], wanderingPlanetAnalysis: null };
    const stored = sanitizeState(JSON.parse(raw));
    return { ...stored, jobs: [] };
  } catch {
    return { jobs: [], messages: [], wanderingPlanetAnalysis: null };
  }
};

export const AssistantInboxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AssistantInboxState>(() => loadStoredState());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const persistedState: AssistantInboxState = {
        jobs: [],
        messages: state.messages,
        wanderingPlanetAnalysis: state.wanderingPlanetAnalysis
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
    } catch {
      // Ignore persistence errors (e.g., storage disabled)
    }
  }, [state]);

  useEffect(() => {
    setState((prev) => {
      if (prev.jobs.length === 0) return prev;
      const cutoff = Date.now() - STALE_JOB_MS;
      const active = prev.jobs.filter((job) => job.updatedAt >= cutoff);
      if (active.length === prev.jobs.length) return prev;
      return { ...prev, jobs: active };
    });
  }, []);

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

  const setWanderingPlanetAnalysis = useCallback((analysis: WanderingPlanetAnalysisSession | null) => {
    setState((prev) => ({ ...prev, wanderingPlanetAnalysis: analysis }));
  }, []);

  const updateWanderingPlanetSuggestions = useCallback((suggestions: WanderingPlanetSuggestion[]) => {
    setState((prev) => {
      if (!prev.wanderingPlanetAnalysis) return prev;
      return {
        ...prev,
        wanderingPlanetAnalysis: {
          ...prev.wanderingPlanetAnalysis,
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
      wanderingPlanetAnalysis: state.wanderingPlanetAnalysis,
      createJob,
      removeJob,
      addMessage,
      dismissMessage,
      dismissMessagesByKind,
      setWanderingPlanetAnalysis,
      updateWanderingPlanetSuggestions,
      messageCount,
      hasMessages
    }),
    [
      state.jobs,
      state.messages,
      state.wanderingPlanetAnalysis,
      createJob,
      removeJob,
      addMessage,
      dismissMessage,
      dismissMessagesByKind,
      setWanderingPlanetAnalysis,
      updateWanderingPlanetSuggestions,
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
