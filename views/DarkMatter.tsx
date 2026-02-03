import React, { useEffect, useMemo, useState } from 'react';
import {
  getDarkMatter,
  getQuestions,
  updateNoteMeta,
  deleteNote,
  createNoteObject,
  saveNote,
  recordDarkMatterAnalysisRequested,
  recordDarkMatterSuggestionApplied,
  recordDarkMatterSuggestionDismissed
} from '../services/storageService';
import { Note, NoteType, DarkMatterSuggestion } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { LoadingSpinner, TrashIcon } from '../components/Icons';
import TypeBadge from '../components/TypeBadge';
import { analyzeDarkMatter } from '../services/aiService';

const ConfirmDialog: React.FC<{
  isOpen: boolean;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmTone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, message, confirmLabel, cancelLabel, confirmTone = 'danger', onConfirm, onCancel }) => {
  if (!isOpen) return null;

  const confirmClassName = confirmTone === 'danger'
    ? 'px-4 py-2 text-sm rounded-md btn-danger'
    : 'px-4 py-2 text-sm rounded-md bg-ink text-white dark:bg-muted-600 hover:opacity-90 transition-opacity';

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card max-w-sm" onClick={e => e.stopPropagation()}>
        <p className="text-ink dark:text-ink-dark mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-body-sm-muted hover:text-ink dark:hover:text-ink-dark transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={confirmClassName}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const QuestionSelector: React.FC<{
  isOpen: boolean;
  questions: Note[];
  onSelect: (questionId: string) => void;
  onCancel: () => void;
}> = ({ isOpen, questions, onSelect, onCancel }) => {
  const { t } = useAppContext();

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card max-w-md w-full max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-medium text-ink dark:text-ink-dark mb-4">{t('select_question')}</h3>
        <div className="overflow-y-auto flex-1 space-y-2">
          {questions.length === 0 ? (
            <p className="text-body-sm-muted py-4 text-center">
              No questions available. Create one first.
            </p>
          ) : (
            questions.map((q) => (
              <button
                key={q.id}
                onClick={() => onSelect(q.id)}
                className="w-full text-left p-3 rounded-lg border border-line dark:border-line-dark hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                <p className="text-body-sm line-clamp-2">{q.content}</p>
              </button>
            ))
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-body-sm-muted hover:text-ink dark:hover:text-ink-dark transition-colors"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

const DarkMatter: React.FC = () => {
  const [darkMatter, setDarkMatter] = useState<Note[]>([]);
  const [questions, setQuestions] = useState<Note[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [linkTarget, setLinkTarget] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<DarkMatterSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'create' | 'link';
    suggestion: DarkMatterSuggestion;
  } | null>(null);
  const { t, language } = useAppContext();

  const noteById = useMemo(() => {
    const map = new Map<string, Note>();
    darkMatter.forEach((note) => map.set(note.id, note));
    return map;
  }, [darkMatter]);

  const loadData = async () => {
    const dm = await getDarkMatter();
    setDarkMatter(dm.sort((a, b) => b.createdAt - a.createdAt));
    const qs = await getQuestions();
    setQuestions(qs.sort((a, b) => b.updatedAt - a.updatedAt));
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (darkMatter.length === 0) {
      setSuggestions([]);
      return;
    }
    const validIds = new Set(darkMatter.map(note => note.id));
    setSuggestions(prev => prev
      .map(suggestion => ({
        ...suggestion,
        noteIds: suggestion.noteIds.filter(id => validIds.has(id))
      }))
      .filter(suggestion => suggestion.noteIds.length >= 2)
    );
  }, [darkMatter]);

  const handleDelete = (noteId: string) => {
    setDeleteTarget(noteId);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await deleteNote(deleteTarget);
      void loadData();
      setDeleteTarget(null);
    }
  };

  const handleLinkToQuestion = (noteId: string) => {
    setLinkTarget(noteId);
  };

  const confirmLink = async (questionId: string) => {
    if (linkTarget) {
      await updateNoteMeta(linkTarget, { parentId: questionId });
      void loadData();
      setLinkTarget(null);
    }
  };

  const handlePromoteToQuestion = async (noteId: string) => {
    await updateNoteMeta(noteId, { type: NoteType.QUESTION, parentId: null });
    void loadData();
  };

  const formatTemplate = (template: string, params: Record<string, string | number>) => {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      const value = params[key];
      return value === undefined ? match : String(value);
    });
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
    void recordDarkMatterAnalysisRequested(darkMatter.length, questions.length);
    const result = await analyzeDarkMatter(darkMatter, questions, language, 5);
    setSuggestions(result.suggestions);
    setIsAnalyzing(false);
  };

  const dismissSuggestion = (id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));
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
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    } catch (error) {
      console.error('Failed to apply suggestion', error);
    } finally {
      await loadData();
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

  return (
    <div className="flex flex-col h-full relative">
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        message="Delete this fragment?"
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        confirmTone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        isOpen={pendingAction !== null}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        cancelLabel={t('cancel')}
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
        {darkMatter.length > 0 && (
          <p className="mt-2 text-caption-upper">
            {darkMatter.length} {t('dark_matter_count')}
          </p>
        )}
      </div>

      {darkMatter.length > 0 && (
        <div className="mb-6 surface-card p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-caption-upper">{t('dark_matter_ai_title')}</p>
              <p className="text-body-sm-muted mt-1">{t('dark_matter_ai_desc')}</p>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || darkMatter.length < 2}
              className={`btn-pill ${(isAnalyzing || darkMatter.length < 2)
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
          {suggestions.map((suggestion) => (
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
              {suggestion.reasoning && (
                <p className="mt-3 text-body-sm-muted">{suggestion.reasoning}</p>
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
          ))}
        </div>
      )}

      {/* Content */}
      <div className="space-y-4 pb-8">
        {darkMatter.length === 0 ? (
          <div className="text-center py-14 px-5 surface-empty shadow-sm">
            <p className="text-ink dark:text-ink-dark font-serif mb-2 text-lg">
              ✨
            </p>
            <p className="text-body-sm-muted">{t('no_dark_matter')}</p>
          </div>
        ) : (
          darkMatter.map((note) => (
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
                </div>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="h-10 w-10 btn-icon text-muted-400 hover:text-red-500 dark:text-muted-400 dark:hover:text-red-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
                  title="Delete"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Note content */}
              <p className="text-ink dark:text-ink-dark leading-relaxed whitespace-pre-wrap mb-4">
                {note.content}
              </p>

              {/* Actions */}
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
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DarkMatter;
