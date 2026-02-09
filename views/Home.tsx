import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { getQuestions, getNotes, deleteNote, getDarkMatterCount, updateNoteContent } from '../services/storageService';
import { Note } from '../types';
import { PlusIcon, SearchIcon, EmptyStateIllustration, XIcon } from '../components/Icons';
import CardActions from '../components/CardActions';
import InlineEditForm from '../components/InlineEditForm';
import ConfirmDialog from '../components/ConfirmDialog';
import IconButton from '../components/IconButton';
import { useAppContext } from '../contexts/AppContext';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import Tooltip from '../components/Tooltip';

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
  const [onboardingDismissed, setOnboardingDismissed] = useState(() =>
    localStorage.getItem('cs_onboarding_dismissed') === '1'
  );
  const { t } = useAppContext();
  const { copyText } = useCopyToClipboard();
  const navigate = useNavigate();

  // --- Keyboard shortcut: N → /write (suggestion #3) ---
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if user is typing in an input, textarea, or contentEditable
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
    if (e.key === 'n' || e.key === 'N') {
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        navigate('/write');
      }
    }
  }, [navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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

  // --- Tension / heat indicator (suggestion #2) ---
  const getTensionColor = (updatedAt: number): string => {
    const daysSince = (Date.now() - updatedAt) / (1000 * 60 * 60 * 24);
    if (daysSince < 1) return 'bg-accent dark:bg-accent';        // very warm
    if (daysSince < 3) return 'bg-cs-amber-400 dark:bg-cs-amber-300';              // warm
    if (daysSince < 7) return 'bg-cs-amber-500 dark:bg-cs-amber-400';            // cooling
    if (daysSince < 14) return 'bg-orange-400 dark:bg-orange-300';         // cool
    return 'bg-muted-300 dark:bg-muted-600';                                // dormant
  };

  const dismissOnboarding = () => {
    setOnboardingDismissed(true);
    localStorage.setItem('cs_onboarding_dismissed', '1');
  };

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

  const handleCopyQuestion = async (event: React.MouseEvent, content: string) => {
    if (!content) return;
    setMobileQuestionActionsId(null);
    await copyText(content, event);
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
        message={t('confirm_delete_question_with_notes')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="mb-7 sm:mb-8">
        <h1 className="page-title mb-2">
          {t('living_questions')}
          {hasQuestions && (
            <span className="ml-2 text-muted-400 dark:text-muted-500 tabular-nums font-sans text-lg sm:text-xl font-normal">
              {t('question_count_separator')} {questions.length}
            </span>
          )}
        </h1>
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
                  <IconButton
                    label={t('clear_recall')}
                    sizeClassName="h-10 w-10"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-400 hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
                  >
                    <XIcon className="w-4 h-4" />
                  </IconButton>
                )}
              </div>
              <p className="mt-2 text-caption">{t('recall_hint')}</p>
            </>
          )}
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="text-center py-14 px-5 surface-empty shadow-[var(--shadow-elev-1)] dark:shadow-[var(--shadow-elev-1-dark)]">
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
                {/* Empty-state illustration (suggestion #1) */}
                <EmptyStateIllustration className="w-40 h-auto mx-auto mb-4 text-accent/50 dark:text-accent-dark/40" />
                <p className="text-ink dark:text-ink-dark font-serif mb-2 text-lg">
                  {hasNotes ? t('no_question_yet') : t('space_empty')}
                </p>
                <p className="text-body-sm-muted">
                  {t('just_write')}
                </p>
                {/* Onboarding nudge for first-time users (suggestion #17) */}
                {!hasNotes && !onboardingDismissed && (
                  <div className="mt-6 mx-auto max-w-xs rounded-xl border border-accent/20 dark:border-accent-dark/20 bg-accent/5 dark:bg-accent-dark/5 px-4 py-3 animate-fade-in">
                    <p className="text-body-sm text-ink dark:text-ink-dark mb-2">
                      {t('empty_state_onboarding')}
                    </p>
                    <button
                      type="button"
                      onClick={dismissOnboarding}
                      className="text-xs text-accent dark:text-accent-dark hover:underline cursor-pointer"
                    >
                      {t('empty_state_onboarding_dismiss')}
                    </button>
                  </div>
                )}
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
                    <InlineEditForm
                      value={editContent}
                      onChange={setEditContent}
                      onSave={handleSaveEdit}
                      onCancel={handleCancelEdit}
                      isSaving={isSavingEdit}
                      rows={2}
                      className="flex-1 pr-2 space-y-3"
                    />
                  ) : (
                    <h3 className="text-lg font-medium text-ink dark:text-ink-dark leading-relaxed flex-1 pr-2">
                      {q.content}
                    </h3>
                  )}
                  {!isEditing && (
                    <div className="ml-4">
                      <CardActions
                        actions={[
                          { action: 'edit', onClick: (e) => handleStartEdit(e, q) },
                          { action: 'copy', onClick: (e) => handleCopyQuestion(e, q.content) },
                          { action: 'delete', onClick: (e) => handleDelete(e, q.id) },
                        ]}
                        isMobileSheetOpen={isMobileActionsOpen}
                        onMobileSheetOpen={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMobileQuestionActionsId(q.id);
                        }}
                        onMobileSheetClose={() => setMobileQuestionActionsId(null)}
                        desktopGapClassName="gap-2"
                        desktopButtonClassName="opacity-0 sm:group-hover:opacity-100 transition-all"
                        desktopButtonBaseClassName="text-muted-400 dark:text-muted-400"
                        mobileButtonClassName="text-muted-400 hover:text-ink dark:text-muted-400 dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
                      />
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2 section-kicker">
                  {/* Tension indicator dot (suggestion #2) */}
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${getTensionColor(q.updatedAt)} shrink-0`}
                  />
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

      {/* Floating Action Button + keyboard hint */}
      {fabContainer && createPortal(
        <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-8 z-50 flex flex-col items-center gap-2">
          <Tooltip content={t('keyboard_shortcut_write')}>
            <Link
              to="/write"
              className="bg-action text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform hover:bg-action-hover focus:outline-none focus:ring-4 focus:ring-action-ring dark:bg-action dark:hover:bg-action-hover-dark dark:focus:ring-action-ring/50"
              aria-label={t('write_label')}
            >
              <PlusIcon className="w-6 h-6" />
            </Link>
          </Tooltip>
        </div>,
        fabContainer
      )}
    </div>
  );
};

export default Home;
