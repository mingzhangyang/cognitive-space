import React, { useEffect, useMemo, useState } from 'react';
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
import { Note, NoteType, DarkMatterSuggestion } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { useAssistantInbox } from '../contexts/AssistantInboxContext';
import { LoadingSpinner, CheckIcon, XIcon, MoreIcon } from '../components/Icons';
import ActionIconButton from '../components/ActionIconButton';
import ActionSheetButton from '../components/ActionSheetButton';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import IconButton from '../components/IconButton';
import MobileActionSheet from '../components/MobileActionSheet';
import TypeBadge from '../components/TypeBadge';
import { analyzeDarkMatter } from '../services/aiService';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { containsCjk, formatTemplate } from '../utils/text';
import { createMessageId } from '../utils/ids';

const QuestionSelector: React.FC<{
  isOpen: boolean;
  questions: Note[];
  onSelect: (questionId: string) => void;
  onCancel: () => void;
}> = ({ isOpen, questions, onSelect, onCancel }) => {
  const { t } = useAppContext();

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} cardClassName="max-w-md w-full max-h-[70vh] flex flex-col">
      <h3 className="text-lg font-medium text-ink dark:text-ink-dark mb-4">{t('select_question')}</h3>
      <div className="overflow-y-auto flex-1 space-y-2">
        {questions.length === 0 ? (
          <p className="text-body-sm-muted py-4 text-center">
            {t('no_questions_available')}
          </p>
        ) : (
          questions.map((q) => (
            <button
              key={q.id}
              onClick={() => onSelect(q.id)}
              className="w-full text-left p-3 rounded-lg border border-line dark:border-line-dark hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors cursor-pointer"
            >
              <p className="text-body-sm line-clamp-2">{q.content}</p>
            </button>
          ))
        )}
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-body-sm-muted hover:text-ink dark:hover:text-ink-dark transition-colors cursor-pointer"
        >
          {t('cancel')}
        </button>
      </div>
    </Modal>
  );
};

const normalizeSuggestionForCompare = (suggestion: DarkMatterSuggestion) => ({
  ...suggestion,
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
      || a.confidence !== b.confidence
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

const DarkMatter: React.FC = () => {
  const [darkMatter, setDarkMatter] = useState<Note[]>([]);
  const [darkMatterCount, setDarkMatterCount] = useState(0);
  const [questions, setQuestions] = useState<Note[]>([]);
  const [analysisNotes, setAnalysisNotes] = useState<Note[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
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
  const [pendingAction, setPendingAction] = useState<{
    type: 'create' | 'link';
    suggestion: DarkMatterSuggestion;
  } | null>(null);
  const { t, language } = useAppContext();
  const { copyText } = useCopyToClipboard();
  const {
    createJob,
    removeJob,
    addMessage,
    dismissMessagesByKind,
    setDarkMatterAnalysis,
    updateDarkMatterSuggestions,
    darkMatterAnalysis
  } = useAssistantInbox();
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

  const loadInitial = async () => {
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
  };

  const loadMore = async () => {
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
  };

  const removeAnalysisNotes = (ids: string[]) => {
    if (ids.length === 0) return;
    setAnalysisNotes((prev) => {
      if (prev.length === 0) return prev;
      const idSet = new Set(ids);
      return prev.filter((note) => !idSet.has(note.id));
    });
  };

  useEffect(() => {
    void loadInitial();
  }, []);

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

  const handleDelete = (noteId: string) => {
    setMobileNoteActionsId(null);
    setDeleteTarget(noteId);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await deleteNote(deleteTarget);
      removeAnalysisNotes([deleteTarget]);
      void loadInitial();
      if (editingId === deleteTarget) {
        setEditingId(null);
        setEditContent('');
      }
      setDeleteTarget(null);
    }
  };

  const handleLinkToQuestion = (noteId: string) => {
    setLinkTarget(noteId);
  };

  const confirmLink = async (questionId: string) => {
    if (linkTarget) {
      await updateNoteMeta(linkTarget, { parentId: questionId });
      removeAnalysisNotes([linkTarget]);
      void loadInitial();
      setLinkTarget(null);
    }
  };

  const handlePromoteToQuestion = async (noteId: string) => {
    await updateNoteMeta(noteId, { type: NoteType.QUESTION, parentId: null });
    removeAnalysisNotes([noteId]);
    void loadInitial();
  };

  const handleEdit = (note: Note) => {
    if (isSavingEdit) return;
    setMobileNoteActionsId(null);
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleCopyNote = async (content: string) => {
    if (!content) return;
    setMobileNoteActionsId(null);
    await copyText(content);
  };

  const handleSaveEdit = async () => {
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
  };

  const handleCancelEdit = () => {
    if (isSavingEdit) return;
    setEditingId(null);
    setEditContent('');
  };

  const getSuggestionReasoning = (reasoning: string | undefined, title: string) => {
    const raw = typeof reasoning === 'string' ? reasoning.trim() : '';
    if (!raw || (language === 'zh' && !containsCjk(raw))) {
      if (language !== 'zh') return raw;
      return formatTemplate(t('dark_matter_suggestion_reasoning_fallback'), { title });
    }
    return raw;
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.7) return t('dark_matter_ai_confidence_likely');
    if (confidence >= 0.5) return t('dark_matter_ai_confidence_possible');
    return t('dark_matter_ai_confidence_loose');
  };

  const handleAnalyze = async () => {
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
  };

  const dismissSuggestion = (id: string) => {
    setSuggestions(prev => {
      const next = prev.filter(s => s.id !== id);
      updateDarkMatterSuggestions(next);
      if (next.length === 0) dismissMessagesByKind('dark_matter_ready');
      return next;
    });
    void recordDarkMatterSuggestionDismissed(id);
  };

  const requestApplySuggestion = (type: 'create' | 'link', suggestion: DarkMatterSuggestion) => {
    setPendingAction({ type, suggestion });
  };

  const applySuggestion = async () => {
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
  };

  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    if (weeks > 0) return `${weeks}w ago`;
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

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

  return (
    <div className="flex flex-col h-full relative">
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        message={t('confirm_delete_fragment')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        isOpen={pendingAction !== null}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        confirmTone="primary"
        onConfirm={applySuggestion}
        onCancel={() => setPendingAction(null)}
      />

      <QuestionSelector
        isOpen={linkTarget !== null}
        questions={questions}
        onSelect={confirmLink}
        onCancel={() => setLinkTarget(null)}
      />

      {/* Header */}
      <div className="mb-7 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-gray-500 dark:text-gray-400 text-sm">🌑</span>
          </div>
          <h1 className="page-title">{t('dark_matter')}</h1>
        </div>
        <p className="page-subtitle">{t('dark_matter_desc')}</p>
        {darkMatterCount > 0 && (
          <p className="mt-2 text-caption-upper">
            {darkMatterCount} {t('dark_matter_count')}
          </p>
        )}
      </div>

      {darkMatterCount > 0 && darkMatterCount < aiRevealThreshold && !isAiPanelOpen && (
        <div className="mb-4">
          <button
            onClick={() => setIsAiPanelOpen(true)}
            className="text-body-sm-muted hover:text-ink dark:hover:text-ink-dark transition-colors"
          >
            {t('dark_matter_ai_action')}
          </button>
        </div>
      )}

      {shouldShowAiCard && (
        <div className="mb-6 surface-card p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-caption-upper">{t('dark_matter_ai_title')}</p>
              <p className="text-body-sm-muted mt-1">{t('dark_matter_ai_desc')}</p>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || darkMatterCount < 2}
              className={`btn-pill ${(isAnalyzing || darkMatterCount < 2)
                ? 'bg-line dark:bg-surface-hover-dark text-muted-400 cursor-not-allowed'
                : 'bg-action dark:bg-action text-white hover:bg-action-hover dark:hover:bg-action-hover-dark shadow-md'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <LoadingSpinner className="w-4 h-4 text-white" />
                  <span>{t('dark_matter_ai_running')}</span>
                </>
              ) : (
                t('dark_matter_ai_action')
              )}
            </button>
          </div>
          {hasAnalyzed && !isAnalyzing && suggestions.length === 0 && (
            <p className="mt-4 text-body-sm-muted">{t('dark_matter_ai_empty')}</p>
          )}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mb-6 space-y-3">
          <p className="text-caption-upper">{t('dark_matter_ai_suggestions')}</p>
          {suggestions.map((suggestion) => {
            const reasoning = getSuggestionReasoning(suggestion.reasoning, suggestion.title);
            return (
              <div key={suggestion.id} className="surface-card p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <p className="text-ink dark:text-ink-dark text-base font-medium">
                      {suggestion.title}
                    </p>
                    <p className="text-body-sm-muted">
                      {suggestion.kind === 'new_question'
                        ? t('dark_matter_ai_kind_new')
                        : t('dark_matter_ai_kind_existing')}
                    </p>
                  </div>
                  <span className="text-mini-up text-muted-500 dark:text-muted-400">
                    {getConfidenceLabel(suggestion.confidence)}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {suggestion.noteIds.map((noteId) => {
                    const note = noteById.get(noteId);
                    if (!note) return null;
                    return (
                      <p key={note.id} className="text-body-sm text-ink dark:text-ink-dark line-clamp-2">
                        “{note.content}”
                      </p>
                    );
                  })}
                </div>
                {reasoning && (
                  <p className="mt-3 text-body-sm-muted">
                    {reasoning}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {suggestion.kind === 'new_question' ? (
                    <button
                      onClick={() => requestApplySuggestion('create', suggestion)}
                      className="chip-outline hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    >
                      {t('dark_matter_ai_action_create')}
                    </button>
                  ) : (
                    <button
                      onClick={() => requestApplySuggestion('link', suggestion)}
                      className="chip-outline hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    >
                      {t('dark_matter_ai_action_link')}
                    </button>
                  )}
                  <button
                    onClick={() => dismissSuggestion(suggestion.id)}
                    className="chip-outline hover:border-line-muted dark:hover:border-muted-600 hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
                  >
                    {t('dark_matter_ai_action_dismiss')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Content */}
      <div className="space-y-4 pb-8">
        {darkMatter.length === 0 && !isLoadingMore ? (
          <div className="text-center py-14 px-5 surface-empty shadow-sm">
            <p className="text-ink dark:text-ink-dark font-serif mb-2 text-lg">
              ✨
            </p>
            <p className="text-body-sm-muted">{t('no_dark_matter')}</p>
          </div>
        ) : (
          <>
            {darkMatter.map((note) => {
              const isMobileActionsOpen = mobileNoteActionsId === note.id;
              const actionButtons = (
                <>
                  <ActionIconButton
                    action="edit"
                    onClick={() => handleEdit(note)}
                    disabled={isSavingEdit}
                  />
                  <ActionIconButton
                    action="copy"
                    onClick={() => handleCopyNote(note.content)}
                  />
                  <ActionIconButton
                    action="delete"
                    onClick={() => handleDelete(note.id)}
                  />
                </>
              );

              return (
                <div
                  key={note.id}
                  className="group surface-card p-4 sm:p-5 card-interactive"
                >
              {/* Note header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <TypeBadge type={note.type} subType={note.subType} />
                  <span className="muted-caption">
                    {formatRelativeTime(note.createdAt)}
                  </span>
                  {note.analysisPending && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-surface-hover dark:bg-surface-hover-dark px-2 py-0.5 text-[10px] uppercase tracking-wider text-subtle dark:text-subtle-dark"
                      aria-label={t('analyzing')}
                      title={t('analyzing')}
                    >
                      <span className="flex items-center gap-1" aria-hidden="true">
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-accent dark:bg-accent-dark animate-pulse motion-reduce:animate-none"
                          style={{ animationDelay: '0ms' }}
                        />
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-accent dark:bg-accent-dark animate-pulse motion-reduce:animate-none"
                          style={{ animationDelay: '150ms' }}
                        />
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-accent dark:bg-accent-dark animate-pulse motion-reduce:animate-none"
                          style={{ animationDelay: '300ms' }}
                        />
                      </span>
                      <span className="hidden sm:inline">{t('analyzing')}</span>
                    </span>
                  )}
                </div>
                <div className="relative flex items-center gap-1">
                  {editingId !== note.id && (
                    <>
                      <IconButton
                        label={t('actions_show')}
                        sizeClassName="h-10 w-10"
                        onClick={() => setMobileNoteActionsId(note.id)}
                        className="sm:hidden text-subtle dark:text-subtle-dark hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
                      >
                        <MoreIcon className="w-4 h-4" />
                      </IconButton>
                      <div className="hidden sm:flex gap-1 opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {actionButtons}
                      </div>
                      <MobileActionSheet
                        isOpen={isMobileActionsOpen}
                        onClose={() => setMobileNoteActionsId(null)}
                      >
                        <ActionSheetButton
                          action="edit"
                          onClick={() => {
                            setMobileNoteActionsId(null);
                            handleEdit(note);
                          }}
                          disabled={isSavingEdit}
                        />
                        <ActionSheetButton
                          action="copy"
                          onClick={() => {
                            setMobileNoteActionsId(null);
                            handleCopyNote(note.content);
                          }}
                        />
                        <ActionSheetButton
                          action="delete"
                          onClick={() => {
                            setMobileNoteActionsId(null);
                            handleDelete(note.id);
                          }}
                        />
                      </MobileActionSheet>
                    </>
                  )}
                </div>
              </div>

              {/* Note content */}
              {editingId === note.id ? (
                <div className="space-y-2 mb-4">
                  <textarea
                    className="textarea-base"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        handleCancelEdit();
                      }
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        void handleSaveEdit();
                      }
                    }}
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSavingEdit || !editContent.trim()}
                      className={`flex items-center gap-1 px-3 py-1.5 text-sm bg-accent dark:bg-accent-dark text-white rounded-md hover:opacity-90 transition-opacity ${
                        isSavingEdit || !editContent.trim() ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      {isSavingEdit ? <LoadingSpinner className="w-3.5 h-3.5 text-white" /> : <CheckIcon className="w-3.5 h-3.5" />}
                      {isSavingEdit ? t('saving') : t('save')}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSavingEdit}
                      className={`flex items-center gap-1 px-3 py-1.5 text-body-sm-muted hover:text-ink dark:hover:text-ink-dark transition-colors ${
                        isSavingEdit ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      <XIcon className="w-3.5 h-3.5" />
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-ink dark:text-ink-dark leading-relaxed whitespace-pre-wrap mb-4">
                  {note.content}
                </p>
              )}

              {/* Actions */}
              {editingId !== note.id && (
                <div className="flex flex-wrap gap-2 pt-3 border-t border-line-soft dark:border-line-dark">
                  <button
                    onClick={() => handleLinkToQuestion(note.id)}
                    className="chip-outline hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    {t('link_to_question')}
                  </button>
                  <button
                    onClick={() => handlePromoteToQuestion(note.id)}
                    className="chip-outline hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    {t('promote_to_question')}
                  </button>
                </div>
              )}
            </div>
              );
            })}
            {hasMore && (
              <div className="flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className={`btn-pill btn-outline muted-label ${
                    isLoadingMore ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoadingMore ? (
                    <>
                      <LoadingSpinner className="w-4 h-4 text-muted-500 dark:text-muted-400" />
                      <span>{t('loading_more')}</span>
                    </>
                  ) : (
                    t('load_more')
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DarkMatter;
