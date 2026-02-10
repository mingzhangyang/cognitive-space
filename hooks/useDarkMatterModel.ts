import { useCallback, useState } from 'react';
import {
  deleteNote,
  saveNote,
  updateNoteContent,
  updateNoteMeta
} from '../services/storageService';
import { Note, NoteType } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useCopyToClipboard } from './useCopyToClipboard';
import { formatTemplate } from '../utils/text';
import { useDarkMatterData } from './darkMatter/useDarkMatterData';
import { useDarkMatterSelection } from './darkMatter/useDarkMatterSelection';
import { useDarkMatterAnalysis } from './darkMatter/useDarkMatterAnalysis';

export const useDarkMatterModel = () => {
  const { t, language } = useAppContext();
  const { copyText } = useCopyToClipboard();
  const { notify } = useNotifications();

  const data = useDarkMatterData();

  const [linkTarget, setLinkTarget] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [mobileNoteActionsId, setMobileNoteActionsId] = useState<string | null>(null);

  const selection = useDarkMatterSelection({
    sortedDarkMatter: data.sortedDarkMatter,
    onClearEditing: () => {
      setEditingId(null);
      setEditContent('');
    }
  });

  const analysis = useDarkMatterAnalysis({
    t,
    language,
    darkMatter: data.darkMatter,
    analysisNotes: data.analysisNotes,
    darkMatterCount: data.darkMatterCount,
    aiRevealThreshold: data.aiRevealThreshold,
    loadInitial: data.loadInitial,
    setAnalysisNotes: data.setAnalysisNotes,
    setQuestionsSorted: data.setQuestionsSorted,
    removeAnalysisNotes: data.removeAnalysisNotes
  });

  const handleDelete = useCallback(async (noteId: string) => {
    setMobileNoteActionsId(null);
    const note = data.darkMatter.find((n) => n.id === noteId)
      || data.analysisNotes.find((n) => n.id === noteId);
    if (!note) return;
    const savedNote = { ...note };
    await deleteNote(noteId);
    data.removeAnalysisNotes([noteId]);
    if (editingId === noteId) {
      setEditingId(null);
      setEditContent('');
    }
    void data.loadInitial();
    notify({
      message: t('fragment_deleted'),
      variant: 'info',
      duration: 5000,
      action: {
        label: t('undo'),
        onClick: () => {
          void (async () => {
            await saveNote(savedNote);
            void data.loadInitial();
          })();
        },
      },
    });
  }, [data, editingId, notify, t]);

  const handleLinkToQuestion = useCallback((noteId: string) => {
    setLinkTarget(noteId);
  }, []);

  const confirmLink = useCallback(async (questionId: string) => {
    if (linkTarget) {
      await updateNoteMeta(linkTarget, { parentId: questionId });
      data.removeAnalysisNotes([linkTarget]);
      void data.loadInitial();
      setLinkTarget(null);
    }
  }, [data, linkTarget]);

  const handlePromoteToQuestion = useCallback(async (noteId: string) => {
    await updateNoteMeta(noteId, { type: NoteType.QUESTION, parentId: null });
    data.removeAnalysisNotes([noteId]);
    void data.loadInitial();
  }, [data]);

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
    data.updateDarkMatterOptimistic(editingId, trimmed, optimisticUpdatedAt);
    try {
      await updateNoteContent(editingId, trimmed);
      setEditingId(null);
      setEditContent('');
      await data.loadInitial();
    } finally {
      setIsSavingEdit(false);
    }
  }, [data, editContent, editingId, isSavingEdit]);

  const handleCancelEdit = useCallback(() => {
    if (isSavingEdit) return;
    setEditingId(null);
    setEditContent('');
  }, [isSavingEdit]);

  const confirmBatchLink = useCallback(async (questionId: string) => {
    const ids: string[] = Array.from(selection.selectedIds);
    await Promise.all(ids.map((id) => updateNoteMeta(id, { parentId: questionId })));
    data.removeAnalysisNotes(ids);
    selection.setSelectedIds(new Set());
    selection.setBatchLinkOpen(false);
    selection.exitSelectMode();
    void data.loadInitial();
  }, [data, selection]);

  const handleBatchPromote = useCallback(async () => {
    const ids: string[] = Array.from(selection.selectedIds);
    await Promise.all(ids.map((id) => updateNoteMeta(id, { type: NoteType.QUESTION, parentId: null })));
    data.removeAnalysisNotes(ids);
    selection.setSelectedIds(new Set());
    selection.setBatchPromoteConfirm(false);
    selection.exitSelectMode();
    void data.loadInitial();
  }, [data, selection]);

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

  return {
    t,
    language,
    darkMatter: data.darkMatter,
    darkMatterCount: data.darkMatterCount,
    questions: data.questions,
    analysisNotes: data.analysisNotes,
    linkTarget,
    editingId,
    editContent,
    isSavingEdit,
    mobileNoteActionsId,
    isLoadingMore: data.isLoadingMore,
    hasMore: data.hasMore,
    suggestions: analysis.suggestions,
    isAnalyzing: analysis.isAnalyzing,
    hasAnalyzed: analysis.hasAnalyzed,
    isAiPanelOpen: analysis.isAiPanelOpen,
    pendingAction: analysis.pendingAction,
    isSelectMode: selection.isSelectMode,
    selectedIds: selection.selectedIds,
    batchLinkOpen: selection.batchLinkOpen,
    batchPromoteConfirm: selection.batchPromoteConfirm,
    sortOrder: data.sortOrder,
    noteById: data.noteById,
    sortedDarkMatter: data.sortedDarkMatter,
    confirmMessage: analysis.confirmMessage,
    confirmLabel: analysis.confirmLabel,
    shouldShowAiCard: analysis.shouldShowAiCard,
    aiRevealThreshold: data.aiRevealThreshold,
    setLinkTarget,
    setEditContent,
    setIsAiPanelOpen: analysis.setIsAiPanelOpen,
    setBatchLinkOpen: selection.setBatchLinkOpen,
    setBatchPromoteConfirm: selection.setBatchPromoteConfirm,
    setMobileNoteActionsId,
    setSelectedIds: selection.setSelectedIds,
    setPendingAction: analysis.setPendingAction,
    loadMore: data.loadMore,
    handleDelete,
    handleLinkToQuestion,
    confirmLink,
    handlePromoteToQuestion,
    handleEdit,
    handleCopyNote,
    handleSaveEdit,
    handleCancelEdit,
    toggleSelectMode: selection.toggleSelectMode,
    toggleSelect: selection.toggleSelect,
    toggleSelectAll: selection.toggleSelectAll,
    handleBatchLink: selection.handleBatchLink,
    confirmBatchLink,
    handleBatchPromote,
    toggleSortOrder: data.toggleSortOrder,
    handleAnalyze: analysis.handleAnalyze,
    dismissSuggestion: analysis.dismissSuggestion,
    requestApplySuggestion: analysis.requestApplySuggestion,
    applySuggestion: analysis.applySuggestion,
    formatRelativeTime,
    getSuggestionReasoning: analysis.getSuggestionReasoning,
    getSuggestionConfidenceLabel: analysis.getSuggestionConfidenceLabel
  };
};
