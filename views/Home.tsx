import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { getQuestions, getNotes, deleteNote, getDarkMatterCount, updateNoteContent } from '../services/storageService';
import { Note } from '../types';
import { PlusIcon, TrashIcon, SearchIcon, XIcon, MoreIcon, EditIcon, CopyIcon, CheckIcon, LoadingSpinner } from '../components/Icons';
import { useAppContext } from '../contexts/AppContext';
import { useNotifications } from '../contexts/NotificationContext';

const ConfirmDialog: React.FC<{
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card max-w-sm" onClick={e => e.stopPropagation()}>
        <p className="text-ink dark:text-ink-dark mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-body-sm-muted hover:text-ink dark:hover:text-ink-dark transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-md btn-danger"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const Home: React.FC = () => {
  const [questions, setQuestions] = useState<Note[]>([]);
  const [hasNotes, setHasNotes] = useState(false);
  const [darkMatterCount, setDarkMatterCount] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [mobileQuestionActionsId, setMobileQuestionActionsId] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [query, setQuery] = useState('');
  const [isRecallOpen, setIsRecallOpen] = useState(false);
  const [fabContainer, setFabContainer] = useState<HTMLElement | null>(null);
  const location = useLocation();
  const { t } = useAppContext();
  const { notify } = useNotifications();

  useEffect(() => {
    if (!mobileQuestionActionsId) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-mobile-actions]') || target.closest('[data-mobile-actions-toggle]')) return;
      setMobileQuestionActionsId(null);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [mobileQuestionActionsId]);

  useEffect(() => {
    if (mobileQuestionActionsId) {
      setMobileQuestionActionsId(null);
    }
  }, [location.key]);

  const loadData = async () => {
    const allNotes = await getNotes();
    setHasNotes(allNotes.length > 0);
    const questions = await getQuestions();
    setQuestions(questions.sort((a, b) => b.updatedAt - a.updatedAt));
    const darkMatterTotal = await getDarkMatterCount();
    setDarkMatterCount(darkMatterTotal);
  };

  useEffect(() => {
    void loadData();
    if (typeof document !== 'undefined') {
      setFabContainer(document.body);
    }
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const filteredQuestions = queryTokens.length === 0
    ? questions
    : questions.filter((q) => {
        const content = q.content.toLowerCase();
        return queryTokens.every((token) => content.includes(token));
      });
  const hasQuestions = questions.length > 0;
  const isFiltering = queryTokens.length > 0;

  const openRecall = () => setIsRecallOpen(true);
  const closeRecall = () => {
    if (!query.trim()) setIsRecallOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, questionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setMobileQuestionActionsId(null);
    setDeleteTarget(questionId);
  };

  const handleStartEdit = (e: React.MouseEvent, question: Note) => {
    e.preventDefault();
    e.stopPropagation();
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
      [...prev.map((q) =>
        q.id === editingQuestionId ? { ...q, content: trimmed, updatedAt: optimisticUpdatedAt } : q
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

  const handleCopyQuestion = async (e: React.MouseEvent, content: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!content) return;
    setMobileQuestionActionsId(null);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
        notify({ message: t('copy_note_success'), variant: 'success', duration: 2000 });
        return;
      }
    } catch {
      // Fall through to legacy copy.
    }
    const textArea = document.createElement('textarea');
    textArea.value = content;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      notify({ message: t('copy_note_success'), variant: 'success', duration: 2000 });
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await deleteNote(deleteTarget);
      void loadData();
      setDeleteTarget(null);
      setMobileQuestionActionsId(null);
      if (editingQuestionId === deleteTarget) {
        setEditingQuestionId(null);
        setEditContent('');
      }
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        message="Delete this question and all related notes?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="mb-7 sm:mb-8">
        <h1 className="page-title mb-2">{t('living_questions')}</h1>
        <p className="page-subtitle">{t('problems_mind')}</p>
      </div>

      <div className="space-y-4 sm:space-y-5 pb-28 sm:pb-24">
        <div className="mb-6">
          <div className="flex flex-wrap gap-3">
            {!isRecallOpen ? (
              <button
                type="button"
                onClick={openRecall}
                className="btn-pill btn-outline muted-label w-full sm:w-auto"
                aria-label={t('recall_label')}
                title={t('recall_label')}
              >
                <SearchIcon className="w-4 h-4" />
                <span>{t('recall_label')}</span>
              </button>
            ) : null}
            {darkMatterCount > 0 && (
              <Link
                to="/dark-matter"
                className="btn-pill btn-outline muted-label w-full sm:w-auto"
              >
                <span className="text-sm">🌑</span>
                <span>{t('dark_matter')}</span>
                <span className="ml-1 px-1.5 py-0.5 bg-line dark:bg-line-dark rounded-full text-micro">
                  {darkMatterCount}
                </span>
              </Link>
            )}
          </div>
          {isRecallOpen && (
            <>
              <label htmlFor="recall" className="muted-label">
                {t('recall_label')}
              </label>
              <div className="mt-3 relative">
                <SearchIcon className="w-4 h-4 text-muted-500 dark:text-muted-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="recall"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onBlur={closeRecall}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setQuery('');
                      setIsRecallOpen(false);
                    }
                  }}
                  placeholder={t('recall_placeholder')}
                  className="input-pill"
                  aria-label={t('recall_label')}
                  autoFocus
                />
                {queryTokens.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 btn-icon text-muted-400 hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
                    aria-label={t('clear_recall')}
                    title={t('clear_recall')}
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="mt-2 text-caption">{t('recall_hint')}</p>
            </>
          )}
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="text-center py-14 px-5 surface-empty shadow-sm">
            {hasQuestions && isFiltering ? (
              <>
                <p className="text-ink dark:text-ink-dark font-serif mb-2 text-lg">
                  {t('no_recall_results')}
                </p>
                <p className="text-body-sm-muted">
                  {t('recall_hint')}
                </p>
              </>
            ) : (
              <>
                <p className="text-ink dark:text-ink-dark font-serif mb-2 text-lg">
                  {hasNotes ? t('no_question_yet') : t('space_empty')}
                </p>
                <p className="text-body-sm-muted">
                  {t('just_write')}
                </p>
              </>
            )}
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const isMobileActionsOpen = mobileQuestionActionsId === q.id;
            const isEditing = editingQuestionId === q.id;

            const cardBody = (
              <>
                <div className="flex justify-between items-start">
                  {isEditing ? (
                    <div className="flex-1 pr-2 space-y-3">
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
                        rows={2}
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
                    <h3 className="text-lg font-medium text-ink dark:text-ink-dark group-hover:text-accent dark:group-hover:text-accent-dark transition-colors leading-relaxed flex-1 pr-2">
                      {q.content}
                    </h3>
                  )}
                  {!isEditing && (
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMobileQuestionActionsId((prev) => (prev === q.id ? null : q.id));
                        }}
                        className="sm:hidden h-10 w-10 btn-icon text-muted-400 hover:text-ink dark:text-muted-400 dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
                        aria-label={isMobileActionsOpen ? 'Hide actions' : 'Show actions'}
                        aria-expanded={isMobileActionsOpen}
                        aria-controls={`question-actions-${q.id}`}
                        data-mobile-actions-toggle
                      >
                        {isMobileActionsOpen ? <XIcon className="w-4 h-4" /> : <MoreIcon className="w-4 h-4" />}
                      </button>
                      <div className={`${isMobileActionsOpen ? 'flex' : 'hidden'} sm:hidden items-center gap-2`} id={`question-actions-${q.id}`} data-mobile-actions>
                        <button
                          onClick={(e) => handleStartEdit(e, q)}
                          className="h-10 w-10 btn-icon cursor-pointer text-muted-400 hover:text-accent dark:text-muted-400 dark:hover:text-accent-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
                          title={t('edit')}
                          aria-label={t('edit')}
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleCopyQuestion(e, q.content)}
                          className="h-10 w-10 btn-icon cursor-pointer text-muted-400 hover:text-ink dark:text-muted-400 dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
                          title={t('copy_note')}
                          aria-label={t('copy_note')}
                        >
                          <CopyIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, q.id)}
                          className="h-10 w-10 btn-icon cursor-pointer text-muted-400 hover:text-red-500 dark:text-muted-400 dark:hover:text-red-400 hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
                          title={t('delete')}
                          aria-label={t('delete')}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="hidden sm:flex items-center gap-2">
                        <button
                          onClick={(e) => handleStartEdit(e, q)}
                          className="h-10 w-10 btn-icon cursor-pointer text-muted-400 hover:text-accent dark:text-muted-400 dark:hover:text-accent-dark opacity-0 sm:group-hover:opacity-100 transition-all hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
                          title={t('edit')}
                          aria-label={t('edit')}
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleCopyQuestion(e, q.content)}
                          className="h-10 w-10 btn-icon cursor-pointer text-muted-400 hover:text-ink dark:text-muted-400 dark:hover:text-ink-dark opacity-0 sm:group-hover:opacity-100 transition-all hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
                          title={t('copy_note')}
                          aria-label={t('copy_note')}
                        >
                          <CopyIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, q.id)}
                          className="h-10 w-10 btn-icon cursor-pointer text-muted-400 hover:text-red-500 dark:text-muted-400 dark:hover:text-red-400 opacity-0 sm:group-hover:opacity-100 transition-all hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
                          title={t('delete')}
                          aria-label={t('delete')}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2 section-kicker">
                  <span>{t('last_active')} {new Date(q.updatedAt).toLocaleDateString()}</span>
                </div>
              </>
            );

            return isEditing ? (
              <div
                key={q.id}
                className="block group surface-card p-4 sm:p-5 card-interactive hover:border-accent/30 dark:hover:border-accent-dark/30"
              >
                {cardBody}
              </div>
            ) : (
              <Link
                key={q.id}
                to={`/question/${q.id}`}
                className="block group surface-card p-4 sm:p-5 card-interactive hover:border-accent/30 dark:hover:border-accent-dark/30"
              >
                {cardBody}
              </Link>
            );
          })
        )}
      </div>

      {/* Floating Action Button */}
      {fabContainer && createPortal(
        <Link
          to="/write"
          className="fixed bottom-20 right-4 sm:bottom-24 sm:right-8 bg-action text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform hover:bg-action-hover focus:outline-none focus:ring-4 focus:ring-action-ring dark:bg-action dark:hover:bg-action-hover-dark dark:focus:ring-action-ring/50 z-50"
          aria-label="Write"
        >
          <PlusIcon className="w-6 h-6" />
        </Link>,
        fabContainer
      )}
    </div>
  );
};

export default Home;
