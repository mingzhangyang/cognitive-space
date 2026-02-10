import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { analyzeDarkMatter } from '../../services/aiService';
import {
  createNoteObject,
  getDarkMatter,
  getQuestions,
  recordDarkMatterAnalysisRequested,
  recordDarkMatterSuggestionApplied,
  recordDarkMatterSuggestionDismissed,
  saveNote,
  updateNoteMeta
} from '../../services/storageService';
import { DarkMatterSuggestion, Note, NoteType } from '../../types';
import { useAssistantInbox } from '../../contexts/AssistantInboxContext';
import { createMessageId } from '../../utils/ids';
import { coerceConfidenceLabel } from '../../utils/confidence';
import { containsCjk, formatTemplate } from '../../utils/text';
import type { TranslationKey } from '../../contexts/translations';

interface DarkMatterAnalysisOptions {
  t: (key: TranslationKey) => string;
  language: 'en' | 'zh';
  darkMatter: Note[];
  analysisNotes: Note[];
  darkMatterCount: number;
  aiRevealThreshold: number;
  loadInitial: () => Promise<void>;
  setAnalysisNotes: Dispatch<SetStateAction<Note[]>>;
  setQuestionsSorted: (notes: Note[]) => void;
  removeAnalysisNotes: (ids: string[]) => void;
}

type PendingAction = {
  type: 'create' | 'link';
  suggestion: DarkMatterSuggestion;
} | null;

const normalizeSuggestionForCompare = (suggestion: DarkMatterSuggestion) => ({
  ...suggestion,
  confidenceLabel: coerceConfidenceLabel(
    (suggestion as { confidenceLabel?: unknown }).confidenceLabel,
    (suggestion as { confidence?: unknown }).confidence
  ),
  existingQuestionId: suggestion.existingQuestionId ?? null,
  noteIds: [...suggestion.noteIds].sort()
});

const areSuggestionsEqual = (left: DarkMatterSuggestion[], right: DarkMatterSuggestion[]) => {
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

export const useDarkMatterAnalysis = ({
  t,
  language,
  darkMatter,
  analysisNotes,
  darkMatterCount,
  aiRevealThreshold,
  loadInitial,
  setAnalysisNotes,
  setQuestionsSorted,
  removeAnalysisNotes
}: DarkMatterAnalysisOptions) => {
  const {
    createJob,
    removeJob,
    addMessage,
    dismissMessagesByKind,
    setDarkMatterAnalysis,
    updateDarkMatterSuggestions,
    darkMatterAnalysis
  } = useAssistantInbox();

  const [suggestions, setSuggestions] = useState<DarkMatterSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  useEffect(() => {
    if (isAnalyzing) return;
    if (!darkMatterAnalysis) return;
    setHasAnalyzed(true);
    setSuggestions(darkMatterAnalysis.suggestions);
    if (darkMatterAnalysis.noteIds.length === 0) {
      setAnalysisNotes([]);
      return;
    }
    let isActive = true;
    void getDarkMatter().then((allNotes) => {
      if (!isActive) return;
      const noteIdSet = new Set(darkMatterAnalysis.noteIds);
      setAnalysisNotes(allNotes.filter((note) => noteIdSet.has(note.id)));
    });
    return () => {
      isActive = false;
    };
  }, [darkMatterAnalysis, isAnalyzing, setAnalysisNotes]);

  useEffect(() => {
    const suggestionSource = analysisNotes.length > 0 ? analysisNotes : darkMatter;
    if (suggestionSource.length === 0) {
      setSuggestions((prev) => {
        if (prev.length === 0) return prev;
        updateDarkMatterSuggestions([]);
        dismissMessagesByKind('dark_matter_ready');
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
      updateDarkMatterSuggestions(next);
      if (next.length === 0 && prev.length > 0) dismissMessagesByKind('dark_matter_ready');
      return next;
    });
  }, [analysisNotes, darkMatter, dismissMessagesByKind, updateDarkMatterSuggestions]);

  const getSuggestionReasoning = useCallback((suggestion: DarkMatterSuggestion) => {
    const raw = typeof suggestion.reasoning === 'string' ? suggestion.reasoning.trim() : '';
    if (!raw || (language === 'zh' && !containsCjk(raw))) {
      if (language !== 'zh') return raw;
      return formatTemplate(t('dark_matter_suggestion_reasoning_fallback'), { title: suggestion.title });
    }
    return raw;
  }, [language, t]);

  const getSuggestionConfidenceLabel = useCallback((suggestion: DarkMatterSuggestion) => {
    const label = coerceConfidenceLabel(
      (suggestion as { confidenceLabel?: unknown }).confidenceLabel,
      (suggestion as { confidence?: unknown }).confidence
    );
    if (label === 'likely') return t('dark_matter_ai_confidence_likely');
    if (label === 'possible') return t('dark_matter_ai_confidence_possible');
    return t('dark_matter_ai_confidence_loose');
  }, [t]);

  const handleAnalyze = useCallback(async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setHasAnalyzed(true);
    const [allDarkMatter, allQuestions] = await Promise.all([
      getDarkMatter(),
      getQuestions()
    ]);
    setAnalysisNotes(allDarkMatter);
    setQuestionsSorted(allQuestions);
    void recordDarkMatterAnalysisRequested(allDarkMatter.length, allQuestions.length);
    const jobId = createJob('dark_matter_analysis', { noteCount: allDarkMatter.length });
    const result = await analyzeDarkMatter(allDarkMatter, allQuestions, language, 5);
    setSuggestions(result.suggestions);
    setIsAnalyzing(false);
    removeJob(jobId);
    setDarkMatterAnalysis({
      suggestions: result.suggestions,
      noteIds: allDarkMatter.map((note) => note.id),
      createdAt: Date.now()
    });
    dismissMessagesByKind('dark_matter_ready');
    if (result.suggestions.length > 0) {
      addMessage({
        id: createMessageId(),
        kind: 'dark_matter_ready',
        title: t('assistant_dark_matter_ready_title'),
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
    setDarkMatterAnalysis,
    setQuestionsSorted,
    t
  ]);

  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions((prev) => {
      const next = prev.filter((suggestion) => suggestion.id !== id);
      updateDarkMatterSuggestions(next);
      if (next.length === 0) dismissMessagesByKind('dark_matter_ready');
      return next;
    });
    void recordDarkMatterSuggestionDismissed(id);
  }, [dismissMessagesByKind, updateDarkMatterSuggestions]);

  const requestApplySuggestion = useCallback((type: 'create' | 'link', suggestion: DarkMatterSuggestion) => {
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

      await recordDarkMatterSuggestionApplied(
        suggestion.kind,
        suggestion.noteIds.length,
        suggestion.id
      );
      removeAnalysisNotes(suggestion.noteIds);
      setSuggestions((prev) => {
        const next = prev.filter((item) => item.id !== suggestion.id);
        updateDarkMatterSuggestions(next);
        if (next.length === 0) dismissMessagesByKind('dark_matter_ready');
        return next;
      });
    } catch (error) {
      console.error('Failed to apply suggestion', error);
    } finally {
      await loadInitial();
    }
  }, [dismissMessagesByKind, loadInitial, pendingAction, removeAnalysisNotes, updateDarkMatterSuggestions]);

  const confirmMessage = pendingAction
    ? formatTemplate(
      pendingAction.type === 'create' ? t('dark_matter_confirm_create') : t('dark_matter_confirm_link'),
      {
        title: pendingAction.suggestion.title,
        count: pendingAction.suggestion.noteIds.length
      }
    )
    : '';
  const confirmLabel = pendingAction
    ? (pendingAction.type === 'create' ? t('dark_matter_ai_action_create') : t('dark_matter_ai_action_link'))
    : t('confirm');

  const shouldShowAiCard = darkMatterCount > 0
    && (darkMatterCount >= aiRevealThreshold || isAiPanelOpen);

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
