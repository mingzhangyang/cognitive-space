import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  getDarkMatter,
  getDarkMatterCount,
  getDarkMatterPage,
  getQuestions,
  updateNoteMeta,
  updateNoteContent,
  deleteNote,
  createNoteObject,
  saveNote,
  recordDarkMatterAnalysisRequested,
  recordDarkMatterSuggestionApplied,
  recordDarkMatterSuggestionDismissed
} from '../services/storageService';
import { DarkMatterSuggestion, Note, NoteType } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { useAssistantInbox } from '../contexts/AssistantInboxContext';
import { useNotifications } from '../contexts/NotificationContext';
import { analyzeDarkMatter } from '../services/aiService';
import { useCopyToClipboard } from './useCopyToClipboard';
import { containsCjk, formatTemplate } from '../utils/text';
import { createMessageId } from '../utils/ids';
import { coerceConfidenceLabel } from '../utils/confidence';

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

export const useDarkMatterModel = () => {
  const { t, language } = useAppContext();
  const { copyText } = useCopyToClipboard();
  const { notify } = useNotifications();
  const {
    createJob,
    removeJob,
    addMessage,
    dismissMessagesByKind,
    setDarkMatterAnalysis,
    updateDarkMatterSuggestions,
    darkMatterAnalysis
  } = useAssistantInbox();

  const [darkMatter, setDarkMatter] = useState<Note[]>([]);
  const [darkMatterCount, setDarkMatterCount] = useState(0);
  const [questions, setQuestions] = useState<Note[]>([]);
  const [analysisNotes, setAnalysisNotes] = useState<Note[]>([]);
  const [linkTarget, setLinkTarget] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [mobileNoteActionsId, setMobileNoteActionsId] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<DarkMatterSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLinkOpen, setBatchLinkOpen] = useState(false);
  const [batchPromoteConfirm, setBatchPromoteConfirm] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const aiRevealThreshold = 4;
  const pageSize = 25;

  const noteById = useMemo(() => {
    const map = new Map<string, Note>();
    darkMatter.forEach((note) => map.set(note.id, note));
    analysisNotes.forEach((note) => {
      if (!map.has(note.id)) map.set(note.id, note);
    });
    return map;
  }, [darkMatter, analysisNotes]);

  const sortedDarkMatter = useMemo(() => {
    if (sortOrder === 'newest') return darkMatter;
    return [...darkMatter].sort((a, b) => a.createdAt - b.createdAt);
  }, [darkMatter, sortOrder]);

  const loadInitial = useCallback(async () => {
    setIsLoadingMore(true);
    try {
      const [page, qs, totalCount] = await Promise.all([
        getDarkMatterPage(pageSize),
        getQuestions(),
        getDarkMatterCount()
      ]);
      setDarkMatter(page.notes);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setDarkMatterCount(totalCount);
      setQuestions(qs.sort((a, b) => b.updatedAt - a.updatedAt));
    } finally {
      setIsLoadingMore(false);
    }
  }, [pageSize]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || nextCursor === null) return;
    setIsLoadingMore(true);
    try {
      const page = await getDarkMatterPage(pageSize, nextCursor);
      setDarkMatter((prev) => {
        const existingIds = new Set(prev.map((note) => note.id));
        const merged = [...prev];
        for (const note of page.notes) {
          if (!existingIds.has(note.id)) merged.push(note);
        }
        return merged;
      });
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, nextCursor, pageSize]);

  const removeAnalysisNotes = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setAnalysisNotes((prev) => {
      if (prev.length === 0) return prev;
      const idSet = new Set(ids);
      return prev.filter((note) => !idSet.has(note.id));
    });
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

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
  }, [darkMatterAnalysis, isAnalyzing]);

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
    const validIds = new Set(suggestionSource.map(note => note.id));
    setSuggestions(prev => {
      const next = prev
        .map(suggestion => ({
          ...suggestion,
          noteIds: suggestion.noteIds.filter(id => validIds.has(id))
        }))
        .filter(suggestion => suggestion.noteIds.length >= 2);
      if (areSuggestionsEqual(prev, next)) return prev;
      updateDarkMatterSuggestions(next);
      if (next.length === 0 && prev.length > 0) dismissMessagesByKind('dark_matter_ready');
      return next;
    });
  }, [darkMatter, analysisNotes, updateDarkMatterSuggestions, dismissMessagesByKind]);

  const handleDelete = useCallback(async (noteId: string) => {
    setMobileNoteActionsId(null);
    const note = darkMatter.find((n) => n.id === noteId)
      || analysisNotes.find((n) => n.id === noteId);
    if (!note) return;
    const savedNote = { ...note };
    await deleteNote(noteId);
    removeAnalysisNotes([noteId]);
    if (editingId === noteId) {
      setEditingId(null);
      setEditContent('');
    }
    void loadInitial();
    notify({
      message: t('fragment_deleted'),
      variant: 'info',
      duration: 5000,
      action: {
        label: t('undo'),
        onClick: () => {
          void (async () => {
            await saveNote(savedNote);
            void loadInitial();
          })();
        },
      },
    });
  }, [analysisNotes, darkMatter, editingId, loadInitial, notify, removeAnalysisNotes, t]);

  const handleLinkToQuestion = useCallback((noteId: string) => {
    setLinkTarget(noteId);
  }, []);

  const confirmLink = useCallback(async (questionId: string) => {
    if (linkTarget) {
      await updateNoteMeta(linkTarget, { parentId: questionId });
      removeAnalysisNotes([linkTarget]);
      void loadInitial();
      setLinkTarget(null);
    }
  }, [linkTarget, loadInitial, removeAnalysisNotes]);

  const handlePromoteToQuestion = useCallback(async (noteId: string) => {
    await updateNoteMeta(noteId, { type: NoteType.QUESTION, parentId: null });
    removeAnalysisNotes([noteId]);
    void loadInitial();
  }, [loadInitial, removeAnalysisNotes]);

  const handleEdit = useCallback((note: Note) => {
    if (isSavingEdit) return;
    setMobileNoteActionsId(null);
    setEditingId(note.id);
    setEditContent(note.content);
  }, [isSavingEdit]);

  const handleCopyNote = useCallback(async (content: string) => {
    if (!content) return;
    setMobileNoteActionsId(null);
    await copyText(content);
  }, [copyText]);

  const handleSaveEdit = useCallback(async () => {
    const trimmed = editContent.trim();
    if (!editingId || !trimmed || isSavingEdit) return;
    setIsSavingEdit(true);
    const optimisticUpdatedAt = Date.now();
    setDarkMatter((prev) =>
      prev.map((note) =>
        note.id === editingId ? { ...note, content: trimmed, updatedAt: optimisticUpdatedAt } : note
      )
    );
    try {
      await updateNoteContent(editingId, trimmed);
      setEditingId(null);
      setEditContent('');
      await loadInitial();
    } finally {
      setIsSavingEdit(false);
    }
  }, [editContent, editingId, isSavingEdit, loadInitial]);

  const handleCancelEdit = useCallback(() => {
    if (isSavingEdit) return;
    setEditingId(null);
    setEditContent('');
  }, [isSavingEdit]);

  const toggleSelectMode = useCallback(() => {
    if (isSelectMode) {
      setSelectedIds(new Set());
    } else {
      setEditingId(null);
      setEditContent('');
    }
    setIsSelectMode((prev) => !prev);
  }, [isSelectMode]);

  const toggleSelect = useCallback((noteId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === sortedDarkMatter.length
        ? new Set()
        : new Set(sortedDarkMatter.map((n) => n.id))
    );
  }, [sortedDarkMatter]);

  const handleBatchLink = useCallback(() => {
    if (selectedIds.size === 0) return;
    setBatchLinkOpen(true);
  }, [selectedIds]);

  const confirmBatchLink = useCallback(async (questionId: string) => {
    const ids: string[] = Array.from(selectedIds);
    await Promise.all(ids.map((id) => updateNoteMeta(id, { parentId: questionId })));
    removeAnalysisNotes(ids);
    setSelectedIds(new Set());
    setIsSelectMode(false);
    setBatchLinkOpen(false);
    void loadInitial();
  }, [loadInitial, removeAnalysisNotes, selectedIds]);

  const handleBatchPromote = useCallback(async () => {
    const ids: string[] = Array.from(selectedIds);
    await Promise.all(ids.map((id) => updateNoteMeta(id, { type: NoteType.QUESTION, parentId: null })));
    removeAnalysisNotes(ids);
    setSelectedIds(new Set());
    setIsSelectMode(false);
    setBatchPromoteConfirm(false);
    void loadInitial();
  }, [loadInitial, removeAnalysisNotes, selectedIds]);

  const toggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'));
  }, []);

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
    setQuestions(allQuestions.sort((a, b) => b.updatedAt - a.updatedAt));
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
  }, [addMessage, createJob, dismissMessagesByKind, isAnalyzing, language, removeJob, setDarkMatterAnalysis, t]);

  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions(prev => {
      const next = prev.filter(s => s.id !== id);
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
      setSuggestions(prev => {
        const next = prev.filter(s => s.id !== suggestion.id);
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

  const formatRelativeTime = useCallback((timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    if (weeks > 0) return formatTemplate(t('time_weeks_ago'), { count: weeks });
    if (days > 0) return formatTemplate(t('time_days_ago'), { count: days });
    if (hours > 0) return formatTemplate(t('time_hours_ago'), { count: hours });
    if (minutes > 0) return formatTemplate(t('time_minutes_ago'), { count: minutes });
    return t('time_just_now');
  }, [t]);

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
    t,
    language,
    darkMatter,
    darkMatterCount,
    questions,
    analysisNotes,
    linkTarget,
    editingId,
    editContent,
    isSavingEdit,
    mobileNoteActionsId,
    isLoadingMore,
    hasMore,
    suggestions,
    isAnalyzing,
    hasAnalyzed,
    isAiPanelOpen,
    pendingAction,
    isSelectMode,
    selectedIds,
    batchLinkOpen,
    batchPromoteConfirm,
    sortOrder,
    noteById,
    sortedDarkMatter,
    confirmMessage,
    confirmLabel,
    shouldShowAiCard,
    aiRevealThreshold,
    setLinkTarget,
    setEditContent,
    setIsAiPanelOpen,
    setBatchLinkOpen,
    setBatchPromoteConfirm,
    setMobileNoteActionsId,
    setSelectedIds,
    setPendingAction,
    loadMore,
    handleDelete,
    handleLinkToQuestion,
    confirmLink,
    handlePromoteToQuestion,
    handleEdit,
    handleCopyNote,
    handleSaveEdit,
    handleCancelEdit,
    toggleSelectMode,
    toggleSelect,
    toggleSelectAll,
    handleBatchLink,
    confirmBatchLink,
    handleBatchPromote,
    toggleSortOrder,
    handleAnalyze,
    dismissSuggestion,
    requestApplySuggestion,
    applySuggestion,
    formatRelativeTime,
    getSuggestionReasoning,
    getSuggestionConfidenceLabel
  };
};
