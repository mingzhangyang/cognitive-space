import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deleteNote,
  getWanderingPlanetCount,
  getNotes,
  getQuestions,
  updateNoteContent
} from '../services/storageService';
import { Note } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { useCopyToClipboard } from './useCopyToClipboard';

export const useHomeModel = () => {
  const [questions, setQuestions] = useState<Note[]>([]);
  const [hasNotes, setHasNotes] = useState(false);
  const [wanderingPlanetCount, setWanderingPlanetCount] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [mobileQuestionActionsId, setMobileQuestionActionsId] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [query, setQuery] = useState('');
  const [isRecallOpen, setIsRecallOpen] = useState(false);
  const [fabContainer, setFabContainer] = useState<HTMLElement | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(() =>
    localStorage.getItem('cs_onboarding_dismissed') === '1'
  );
  const { t } = useAppContext();
  const { copyText } = useCopyToClipboard();
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    const allNotes = await getNotes();
    setHasNotes(allNotes.length > 0);
    const nextQuestions = await getQuestions();
    setQuestions(nextQuestions.sort((a, b) => b.updatedAt - a.updatedAt));
    const wanderingPlanetTotal = await getWanderingPlanetCount();
    setWanderingPlanetCount(wanderingPlanetTotal);
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
    if (event.key === 'n' || event.key === 'N') {
      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        navigate('/write');
      }
    }
  }, [navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    void loadData();
    if (typeof document !== 'undefined') {
      setFabContainer(document.body);
    }
  }, [loadData]);

  const normalizedQuery = query.trim().toLowerCase();
  const queryTokens = useMemo(() => normalizedQuery.split(/\s+/).filter(Boolean), [normalizedQuery]);
  const filteredQuestions = useMemo(() => {
    if (queryTokens.length === 0) return questions;
    return questions.filter((question) => {
      const content = question.content.toLowerCase();
      return queryTokens.every((token) => content.includes(token));
    });
  }, [questions, queryTokens]);
  const hasQuestions = questions.length > 0;
  const isFiltering = queryTokens.length > 0;

  const getTensionColor = (updatedAt: number): string => {
    const daysSince = (Date.now() - updatedAt) / (1000 * 60 * 60 * 24);
    if (daysSince < 1) return 'bg-accent dark:bg-accent-dark';
    if (daysSince < 3) return 'bg-warning dark:bg-warning-dark';
    if (daysSince < 7) return 'bg-warning/70 dark:bg-warning-dark/70';
    if (daysSince < 14) return 'bg-warning/40 dark:bg-warning-dark/40';
    return 'bg-muted-300 dark:bg-muted-600';
  };

  const dismissOnboarding = () => {
    setOnboardingDismissed(true);
    localStorage.setItem('cs_onboarding_dismissed', '1');
  };

  const openRecall = () => setIsRecallOpen(true);
  const closeRecall = () => {
    if (!query.trim()) setIsRecallOpen(false);
  };

  const handleDelete = (event: MouseEvent, questionId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setMobileQuestionActionsId(null);
    setDeleteTarget(questionId);
  };

  const handleStartEdit = (event: MouseEvent, question: Note) => {
    event.preventDefault();
    event.stopPropagation();
    if (isSavingEdit) return;
    setMobileQuestionActionsId(null);
    setEditingQuestionId(question.id);
    setEditContent(question.content);
  };

  const handleSaveEdit = async () => {
    const trimmed = editContent.trim();
    if (!editingQuestionId || !trimmed || isSavingEdit) return;
    setIsSavingEdit(true);
    const optimisticUpdatedAt = Date.now();
    setQuestions((prev) =>
      [...prev.map((question) =>
        question.id === editingQuestionId
          ? { ...question, content: trimmed, updatedAt: optimisticUpdatedAt }
          : question
      )].sort((a, b) => b.updatedAt - a.updatedAt)
    );
    try {
      await updateNoteContent(editingQuestionId, trimmed);
      setEditingQuestionId(null);
      setEditContent('');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    if (isSavingEdit) return;
    setEditingQuestionId(null);
    setEditContent('');
  };

  const handleCopyQuestion = async (event: MouseEvent, content: string) => {
    if (!content) return;
    setMobileQuestionActionsId(null);
    await copyText(content, event);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteNote(deleteTarget);
    void loadData();
    setDeleteTarget(null);
    setMobileQuestionActionsId(null);
    if (editingQuestionId === deleteTarget) {
      setEditingQuestionId(null);
      setEditContent('');
    }
  };

  return {
    t,
    questions,
    hasNotes,
    wanderingPlanetCount,
    deleteTarget,
    mobileQuestionActionsId,
    editingQuestionId,
    editContent,
    setEditContent,
    isSavingEdit,
    query,
    isRecallOpen,
    fabContainer,
    onboardingDismissed,
    filteredQuestions,
    hasQuestions,
    isFiltering,
    setQuery,
    setIsRecallOpen,
    setDeleteTarget,
    setMobileQuestionActionsId,
    getTensionColor,
    dismissOnboarding,
    openRecall,
    closeRecall,
    handleDelete,
    handleStartEdit,
    handleSaveEdit,
    handleCancelEdit,
    handleCopyQuestion,
    confirmDelete
  };
};
