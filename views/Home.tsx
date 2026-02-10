import React from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { PlusIcon, SearchIcon, EmptyStateIllustration, XIcon } from '../components/Icons';
import ConfirmDialog from '../components/ConfirmDialog';
import IconButton from '../components/IconButton';
import Tooltip from '../components/Tooltip';
import HomeQuestionCard from '../components/home/HomeQuestionCard';
import { useHomeModel } from '../hooks/useHomeModel';

const Home: React.FC = () => {
  const {
    t,
    questions,
    hasNotes,
    darkMatterCount,
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
  } = useHomeModel();

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
                {isFiltering && (
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
          filteredQuestions.map((question) => {
            const isMobileActionsOpen = mobileQuestionActionsId === question.id;
            const isEditing = editingQuestionId === question.id;

            return (
              <HomeQuestionCard
                key={question.id}
                question={question}
                isEditing={isEditing}
                editContent={editContent}
                isSavingEdit={isSavingEdit}
                isMobileActionsOpen={isMobileActionsOpen}
                tensionColor={getTensionColor(question.updatedAt)}
                onStartEdit={handleStartEdit}
                onCopy={handleCopyQuestion}
                onDelete={handleDelete}
                onOpenMobileActions={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setMobileQuestionActionsId(question.id);
                }}
                onCloseMobileActions={() => setMobileQuestionActionsId(null)}
                onEditContentChange={setEditContent}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                t={t}
              />
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
