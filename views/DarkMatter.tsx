import React from 'react';
import { LoadingSpinner, CheckIcon, SortDescIcon, SortAscIcon, SparklesIcon } from '../components/Icons';
import CardActions from '../components/CardActions';
import InlineEditForm from '../components/InlineEditForm';
import ConfirmDialog from '../components/ConfirmDialog';
import TypeBadge from '../components/TypeBadge';
import Tooltip from '../components/Tooltip';
import QuestionSelectorModal from '../components/QuestionSelectorModal';
import { formatTemplate } from '../utils/text';
import { useDarkMatterModel } from '../hooks/useDarkMatterModel';

const DarkMatter: React.FC = () => {
  const {
    t,
    darkMatter,
    darkMatterCount,
    questions,
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
  } = useDarkMatterModel();

  return (
    <div className="flex flex-col h-full relative">
      <ConfirmDialog
        isOpen={pendingAction !== null}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        confirmTone="primary"
        onConfirm={applySuggestion}
        onCancel={() => setPendingAction(null)}
      />

      <QuestionSelectorModal
        isOpen={linkTarget !== null}
        questions={questions}
        onSelect={confirmLink}
        onCancel={() => setLinkTarget(null)}
      />

      <QuestionSelectorModal
        isOpen={batchLinkOpen}
        questions={questions}
        onSelect={confirmBatchLink}
        onCancel={() => setBatchLinkOpen(false)}
      />

      <ConfirmDialog
        isOpen={batchPromoteConfirm}
        message={formatTemplate(t('dark_matter_batch_promote_confirm'), { count: selectedIds.size })}
        confirmLabel={t('dark_matter_batch_promote')}
        confirmTone="primary"
        onConfirm={handleBatchPromote}
        onCancel={() => setBatchPromoteConfirm(false)}
      />

      {/* Header */}
      <div className="mb-7 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-sm">🌑</span>
          </div>
          <h1 className="page-title">{t('dark_matter')}</h1>
        </div>
        <p className="page-subtitle">{t('dark_matter_desc')}</p>
        {darkMatterCount > 0 && (
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <p className="text-caption-upper">
              {darkMatterCount} {t('dark_matter_count')}
            </p>
            <Tooltip content={sortOrder === 'newest' ? t('dark_matter_sort_oldest') : t('dark_matter_sort_newest')}>
            <button
              onClick={toggleSortOrder}
              className="inline-flex items-center gap-1 text-xs text-subtle dark:text-subtle-dark hover:text-ink dark:hover:text-ink-dark transition-colors cursor-pointer"
              aria-label={sortOrder === 'newest' ? t('dark_matter_sort_oldest') : t('dark_matter_sort_newest')}
            >
              {sortOrder === 'newest' ? <SortDescIcon className="w-3.5 h-3.5" /> : <SortAscIcon className="w-3.5 h-3.5" />}
              <span>{sortOrder === 'newest' ? t('dark_matter_sort_newest') : t('dark_matter_sort_oldest')}</span>
            </button>
            </Tooltip>
            <button
              onClick={toggleSelectMode}
              className={`inline-flex items-center px-3 py-1 text-xs rounded-full border transition-colors cursor-pointer ${
                isSelectMode
                  ? 'bg-accent dark:bg-accent-dark text-white border-accent dark:border-accent-dark'
                  : 'border-line dark:border-line-dark text-subtle dark:text-subtle-dark hover:text-ink dark:hover:text-ink-dark hover:border-ink/30 dark:hover:border-ink-dark/30'
              }`}
            >
              {isSelectMode ? t('dark_matter_select_done') : t('dark_matter_select')}
            </button>
            {isSelectMode && sortedDarkMatter.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="text-xs text-subtle dark:text-subtle-dark hover:text-ink dark:hover:text-ink-dark transition-colors cursor-pointer"
              >
                {selectedIds.size === sortedDarkMatter.length
                  ? t('dark_matter_deselect_all')
                  : t('dark_matter_select_all')}
              </button>
            )}
          </div>
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
            const reasoning = getSuggestionReasoning(suggestion);
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
                    {getSuggestionConfidenceLabel(suggestion)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {suggestion.noteIds.map((noteId) => {
                    const note = noteById.get(noteId);
                    if (!note) return null;
                    const snippet = note.content.length > 60
                      ? note.content.slice(0, 60) + '…'
                      : note.content;
                    return (
                      <span key={note.id} className="inline-block text-xs bg-surface-hover dark:bg-surface-hover-dark rounded-md px-2 py-1 text-subtle dark:text-subtle-dark max-w-full truncate">
                        {snippet}
                      </span>
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
                      className="chip-outline hover:border-accent/30 dark:hover:border-accent-dark/30 hover:bg-accent/5 dark:hover:bg-accent-dark/5"
                    >
                      {t('dark_matter_ai_action_create')}
                    </button>
                  ) : (
                    <button
                      onClick={() => requestApplySuggestion('link', suggestion)}
                      className="chip-outline hover:border-accent/30 dark:hover:border-accent-dark/30 hover:bg-accent/5 dark:hover:bg-accent-dark/5"
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
          <div className="text-center py-14 px-5 surface-empty shadow-[var(--shadow-elev-1)] dark:shadow-[var(--shadow-elev-1-dark)]">
            <SparklesIcon className="text-gray-500 dark:text-gray-400 w-6 h-6 mx-auto mb-2" />
            <p className="text-body-sm-muted">{t('no_dark_matter')}</p>
          </div>
        ) : (
          <>
            {sortedDarkMatter.map((note) => {
              const isMobileActionsOpen = mobileNoteActionsId === note.id;
              const isSelected = selectedIds.has(note.id);

              return (
                <div
                  key={note.id}
                  className={`group surface-card p-4 sm:p-5 card-interactive hover:border-accent/30 dark:hover:border-accent-dark/30 ${
                    isSelectMode && isSelected
                      ? 'ring-2 ring-accent dark:ring-accent-dark'
                      : ''
                  } ${isSelectMode ? 'cursor-pointer' : ''}`}
                  onClick={isSelectMode ? () => toggleSelect(note.id) : undefined}
                  role={isSelectMode ? 'checkbox' : undefined}
                  aria-checked={isSelectMode ? isSelected : undefined}
                >
              {/* Note header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  {isSelectMode && (
                    <span className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-accent dark:bg-accent-dark border-accent dark:border-accent-dark'
                        : 'border-line dark:border-line-dark'
                    }`}>
                      {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                    </span>
                  )}
                  <TypeBadge type={note.type} subType={note.subType} />
                  <span className="muted-caption">
                    {formatRelativeTime(note.createdAt)}
                  </span>
                  {note.analysisPending && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-surface-hover dark:bg-surface-hover-dark px-2 py-0.5 text-[10px] uppercase tracking-wider text-subtle dark:text-subtle-dark"
                      aria-label={t('analyzing')}
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
                {editingId !== note.id && !isSelectMode && (
                  <CardActions
                    actions={[
                      { action: 'edit', onClick: () => handleEdit(note), disabled: isSavingEdit },
                      { action: 'copy', onClick: () => handleCopyNote(note.content) },
                      { action: 'delete', onClick: () => handleDelete(note.id) },
                    ]}
                    isMobileSheetOpen={isMobileActionsOpen}
                    onMobileSheetOpen={() => setMobileNoteActionsId(note.id)}
                    onMobileSheetClose={() => setMobileNoteActionsId(null)}
                  />
                )}
              </div>

              {/* Note content */}
              {editingId === note.id ? (
                <InlineEditForm
                  value={editContent}
                  onChange={setEditContent}
                  onSave={handleSaveEdit}
                  onCancel={handleCancelEdit}
                  isSaving={isSavingEdit}
                  rows={3}
                  className="mb-4"
                />
              ) : (
                <p className="text-ink dark:text-ink-dark leading-relaxed whitespace-pre-wrap mb-4">
                  {note.content}
                </p>
              )}

              {/* Actions */}
              {editingId !== note.id && !isSelectMode && (
                <div className="flex flex-wrap gap-2 pt-3 border-t border-line-soft dark:border-line-dark">
                  <button
                    onClick={() => handleLinkToQuestion(note.id)}
                    className="chip-outline hover:border-accent/30 dark:hover:border-accent-dark/30 hover:bg-accent/5 dark:hover:bg-accent-dark/5"
                  >
                    {t('link_to_question')}
                  </button>
                  <button
                    onClick={() => handlePromoteToQuestion(note.id)}
                    className="chip-outline hover:border-accent/30 dark:hover:border-accent-dark/30 hover:bg-accent/5 dark:hover:bg-accent-dark/5"
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

      {/* Batch action bar */}
      {isSelectMode && selectedIds.size > 0 && (
        <div className="sticky bottom-0 left-0 right-0 bg-surface dark:bg-surface-dark border-t border-line dark:border-line-dark px-4 py-3 flex items-center justify-between gap-3 z-10 shadow-[var(--shadow-elev-2)] dark:shadow-[var(--shadow-elev-2-dark)]">
          <span className="text-body-sm tabular-nums text-subtle dark:text-subtle-dark">
            {formatTemplate(t('dark_matter_selected_count'), { count: selectedIds.size })}
          </span>
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleBatchLink(); }}
              className="chip-outline hover:border-accent/30 dark:hover:border-accent-dark/30 hover:bg-accent/5 dark:hover:bg-accent-dark/5"
            >
              {t('dark_matter_batch_link')}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setBatchPromoteConfirm(true); }}
              className="chip-outline hover:border-accent/30 dark:hover:border-accent-dark/30 hover:bg-accent/5 dark:hover:bg-accent-dark/5"
            >
              {t('dark_matter_batch_promote')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DarkMatter;
