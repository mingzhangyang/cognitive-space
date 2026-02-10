import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { analyzeWanderingPlanet } from '../../services/aiService';
import {
  createNoteObject,
  getWanderingPlanet,
  getQuestions,
  recordWanderingPlanetAnalysisRequested,
  recordWanderingPlanetSuggestionApplied,
  recordWanderingPlanetSuggestionDismissed,
  saveNote,
  updateNoteMeta
} from '../../services/storageService';
import { WanderingPlanetSuggestion, Note, NoteType } from '../../types';
import { useAssistantInbox } from '../../contexts/AssistantInboxContext';
import { createMessageId } from '../../utils/ids';
import { coerceConfidenceLabel } from '../../utils/confidence';
import { containsCjk, formatTemplate } from '../../utils/text';
import type { TranslationKey } from '../../contexts/translations';

interface WanderingPlanetAnalysisOptions {
  t: (key: TranslationKey) => string;
  language: 'en' | 'zh';
  wanderingPlanet: Note[];
  analysisNotes: Note[];
  wanderingPlanetCount: number;
  aiRevealThreshold: number;
  loadInitial: () => Promise<void>;
  setAnalysisNotes: Dispatch<SetStateAction<Note[]>>;
  setQuestionsSorted: (notes: Note[]) => void;
  removeAnalysisNotes: (ids: string[]) => void;
}

type PendingAction = {
  type: 'create' | 'link';
  suggestion: WanderingPlanetSuggestion;
} | null;

const normalizeSuggestionForCompare = (suggestion: WanderingPlanetSuggestion) => ({
  ...suggestion,
  confidenceLabel: coerceConfidenceLabel(
    (suggestion as { confidenceLabel?: unknown }).confidenceLabel,
    (suggestion as { confidence?: unknown }).confidence
  ),
  existingQuestionId: suggestion.existingQuestionId ?? null,
  noteIds: [...suggestion.noteIds].sort()
});

const areSuggestionsEqual = (left: WanderingPlanetSuggestion[], right: WanderingPlanetSuggestion[]) => {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  const normalizedLeft = left.map(normalizeSuggestionForCompare);
  const normalizedRight = right.map(normalizeSuggestionForCompare);
  for (let i = 0; i < normalizedLeft.length; i += 1) {
    const a = normalizedLeft[i];
    const b = normalizedRight[i];
    if (
      a.id !== b.id
      || a.kind !== b.kind
      || a.title !== b.title
      || a.existingQuestionId !== b.existingQuestionId
      || a.confidenceLabel !== b.confidenceLabel
      || a.reasoning !== b.reasoning
      || a.noteIds.length !== b.noteIds.length
    ) {
      return false;
    }
    for (let j = 0; j < a.noteIds.length; j += 1) {
      if (a.noteIds[j] !== b.noteIds[j]) return false;
    }
  }
  return true;
};

export const useWanderingPlanetAnalysis = ({
  t,
  language,
  wanderingPlanet,
  analysisNotes,
  wanderingPlanetCount,
  aiRevealThreshold,
  loadInitial,
  setAnalysisNotes,
  setQuestionsSorted,
  removeAnalysisNotes
}: WanderingPlanetAnalysisOptions) => {
  const {
    createJob,
    removeJob,
    addMessage,
    dismissMessagesByKind,
    setWanderingPlanetAnalysis,
    updateWanderingPlanetSuggestions,
    wanderingPlanetAnalysis
  } = useAssistantInbox();

  const [suggestions, setSuggestions] = useState<WanderingPlanetSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  useEffect(() => {
    if (isAnalyzing) return;
    if (!wanderingPlanetAnalysis) return;
    setHasAnalyzed(true);
    setSuggestions(wanderingPlanetAnalysis.suggestions);
    if (wanderingPlanetAnalysis.noteIds.length === 0) {
      setAnalysisNotes([]);
      return;
    }
    let isActive = true;
    void getWanderingPlanet().then((allNotes) => {
      if (!isActive) return;
      const noteIdSet = new Set(wanderingPlanetAnalysis.noteIds);
      setAnalysisNotes(allNotes.filter((note) => noteIdSet.has(note.id)));
    });
    return () => {
      isActive = false;
    };
  }, [wanderingPlanetAnalysis, isAnalyzing, setAnalysisNotes]);

  useEffect(() => {
    const suggestionSource = analysisNotes.length > 0 ? analysisNotes : wanderingPlanet;
    if (suggestionSource.length === 0) {
      setSuggestions((prev) => {
        if (prev.length === 0) return prev;
        updateWanderingPlanetSuggestions([]);
        dismissMessagesByKind('wandering_planet_ready');
        return [];
      });
      return;
    }
    const validIds = new Set(suggestionSource.map((note) => note.id));
    setSuggestions((prev) => {
      const next = prev
        .map((suggestion) => ({
          ...suggestion,
          noteIds: suggestion.noteIds.filter((id) => validIds.has(id))
        }))
        .filter((suggestion) => suggestion.noteIds.length >= 2);
      if (areSuggestionsEqual(prev, next)) return prev;
      updateWanderingPlanetSuggestions(next);
      if (next.length === 0 && prev.length > 0) dismissMessagesByKind('wandering_planet_ready');
      return next;
    });
  }, [analysisNotes, wanderingPlanet, dismissMessagesByKind, updateWanderingPlanetSuggestions]);

  const getSuggestionReasoning = useCallback((suggestion: WanderingPlanetSuggestion) => {
    const raw = typeof suggestion.reasoning === 'string' ? suggestion.reasoning.trim() : '';
    if (!raw || (language === 'zh' && !containsCjk(raw))) {
      if (language !== 'zh') return raw;
      return formatTemplate(t('wandering_planet_suggestion_reasoning_fallback'), { title: suggestion.title });
    }
    return raw;
  }, [language, t]);

  const getSuggestionConfidenceLabel = useCallback((suggestion: WanderingPlanetSuggestion) => {
    const label = coerceConfidenceLabel(
      (suggestion as { confidenceLabel?: unknown }).confidenceLabel,
      (suggestion as { confidence?: unknown }).confidence
    );
    if (label === 'likely') return t('wandering_planet_ai_confidence_likely');
    if (label === 'possible') return t('wandering_planet_ai_confidence_possible');
    return t('wandering_planet_ai_confidence_loose');
  }, [t]);

  const handleAnalyze = useCallback(async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setHasAnalyzed(true);
    const [allWanderingPlanet, allQuestions] = await Promise.all([
      getWanderingPlanet(),
      getQuestions()
    ]);
    setAnalysisNotes(allWanderingPlanet);
    setQuestionsSorted(allQuestions);
    void recordWanderingPlanetAnalysisRequested(allWanderingPlanet.length, allQuestions.length);
    const jobId = createJob('wandering_planet_analysis', { noteCount: allWanderingPlanet.length });
    const result = await analyzeWanderingPlanet(allWanderingPlanet, allQuestions, language, 5);
    setSuggestions(result.suggestions);
    setIsAnalyzing(false);
    removeJob(jobId);
    setWanderingPlanetAnalysis({
      suggestions: result.suggestions,
      noteIds: allWanderingPlanet.map((note) => note.id),
      createdAt: Date.now()
    });
    dismissMessagesByKind('wandering_planet_ready');
    if (result.suggestions.length > 0) {
      addMessage({
        id: createMessageId(),
        kind: 'wandering_planet_ready',
        title: t('assistant_wandering_planet_ready_title'),
        createdAt: Date.now(),
        payload: { suggestionCount: result.suggestions.length }
      });
    }
  }, [
    addMessage,
    createJob,
    dismissMessagesByKind,
    isAnalyzing,
    language,
    removeJob,
    setAnalysisNotes,
    setWanderingPlanetAnalysis,
    setQuestionsSorted,
    t
  ]);

  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions((prev) => {
      const next = prev.filter((suggestion) => suggestion.id !== id);
      updateWanderingPlanetSuggestions(next);
      if (next.length === 0) dismissMessagesByKind('wandering_planet_ready');
      return next;
    });
    void recordWanderingPlanetSuggestionDismissed(id);
  }, [dismissMessagesByKind, updateWanderingPlanetSuggestions]);

  const requestApplySuggestion = useCallback((type: 'create' | 'link', suggestion: WanderingPlanetSuggestion) => {
    setPendingAction({ type, suggestion });
  }, []);

  const applySuggestion = useCallback(async () => {
    if (!pendingAction) return;
    const { type, suggestion } = pendingAction;
    setPendingAction(null);

    try {
      if (type === 'create') {
        const title = suggestion.title.trim();
        if (!title) return;
        const newQuestion = createNoteObject(title);
        newQuestion.type = NoteType.QUESTION;
        newQuestion.parentId = null;
        await saveNote(newQuestion);
        await Promise.all(
          suggestion.noteIds.map((noteId) => updateNoteMeta(noteId, { parentId: newQuestion.id }))
        );
      } else {
        const questionId = suggestion.existingQuestionId;
        if (!questionId) return;
        await Promise.all(
          suggestion.noteIds.map((noteId) => updateNoteMeta(noteId, { parentId: questionId }))
        );
      }

      await recordWanderingPlanetSuggestionApplied(
        suggestion.kind,
        suggestion.noteIds.length,
        suggestion.id
      );
      removeAnalysisNotes(suggestion.noteIds);
      setSuggestions((prev) => {
        const next = prev.filter((item) => item.id !== suggestion.id);
        updateWanderingPlanetSuggestions(next);
        if (next.length === 0) dismissMessagesByKind('wandering_planet_ready');
        return next;
      });
    } catch (error) {
      console.error('Failed to apply suggestion', error);
    } finally {
      await loadInitial();
    }
  }, [dismissMessagesByKind, loadInitial, pendingAction, removeAnalysisNotes, updateWanderingPlanetSuggestions]);

  const confirmMessage = pendingAction
    ? formatTemplate(
      pendingAction.type === 'create' ? t('wandering_planet_confirm_create') : t('wandering_planet_confirm_link'),
      {
        title: pendingAction.suggestion.title,
        count: pendingAction.suggestion.noteIds.length
      }
    )
    : '';
  const confirmLabel = pendingAction
    ? (pendingAction.type === 'create' ? t('wandering_planet_ai_action_create') : t('wandering_planet_ai_action_link'))
    : t('confirm');

  const shouldShowAiCard = wanderingPlanetCount > 0
    && (wanderingPlanetCount >= aiRevealThreshold || isAiPanelOpen);

  return {
    suggestions,
    isAnalyzing,
    hasAnalyzed,
    isAiPanelOpen,
    pendingAction,
    confirmMessage,
    confirmLabel,
    shouldShowAiCard,
    setIsAiPanelOpen,
    setPendingAction,
    handleAnalyze,
    dismissSuggestion,
    requestApplySuggestion,
    applySuggestion,
    getSuggestionReasoning,
    getSuggestionConfidenceLabel
  };
};
