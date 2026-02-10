import React from 'react';
import { Link } from 'react-router-dom';
import { EyeIcon, EyeOffIcon, ArrowDownIcon, CheckIcon, XIcon, LoadingSpinner } from '../components/Icons';
import ActionIconButton from '../components/ActionIconButton';
import ConfirmDialog from '../components/ConfirmDialog';
import Tooltip from '../components/Tooltip';
import QuestionDowngradeDialog from '../components/QuestionDowngradeDialog';
import MoveToQuestionModal from '../components/MoveToQuestionModal';
import QuestionDetailSection from '../components/questionDetail/QuestionDetailSection';
import QuestionDetailVisualization from '../components/questionDetail/QuestionDetailVisualization';
import { useQuestionDetailModel } from '../hooks/useQuestionDetailModel';

const QuestionDetail: React.FC = () => {
  const {
    t,
    question,
    relatedNotes,
    visualizationOpen,
    selectedGraphNote,
    stats,
    relationDensity,
    editingId,
    editContent,
    isSavingEdit,
    isDowngrading,
    isDowngradeOpen,
    downgradeType,
    downgradeDestination,
    availableQuestions,
    relinkQuestionId,
    deleteTarget,
    mobileNoteActionsId,
    pendingNoteId,
    collapsedSections,
    moveNoteId,
    moveTargetQuestionId,
    isMoving,
    downgradeOptions,
    claims,
    evidence,
    triggers,
    otherNotes,
    setVisualizationOpen,
    setSelectedGraphNote,
    setEditContent,
    setIsDowngradeOpen,
    setDowngradeType,
    setDowngradeDestination,
    setRelinkQuestionId,
    setDeleteTarget,
    setMobileNoteActionsId,
    setMoveNoteId,
    setMoveTargetQuestionId,
    toggleSection,
    handleEdit,
    handleCopyNote,
    handleSaveEdit,
    handleCancelEdit,
    handleDelete,
    openMoveToQuestion,
    handleConfirmMove,
    getOrderedNotes,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    openDowngrade,
    handleConfirmDowngrade,
    confirmDelete
  } = useQuestionDetailModel();

  if (!question) {
    return <div className="p-8 text-center text-subtle dark:text-subtle-dark">{t('problem_not_found')}</div>;
  }

  const noteProps = {
    availableQuestions,
    editingId,
    editContent,
    isSavingEdit,
    pendingNoteId,
    mobileNoteActionsId,
    setMobileNoteActionsId,
    setEditContent,
    handleEdit,
    handleCopyNote,
    handleSaveEdit,
    handleCancelEdit,
    handleDelete,
    openMoveToQuestion,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    t
  };

  return (
    <div>
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        message={t('confirm_delete_question_with_notes')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <QuestionDowngradeDialog
        isOpen={isDowngradeOpen}
        relatedCount={relatedNotes.length}
        selectedType={downgradeType}
        typeOptions={downgradeOptions}
        destination={downgradeDestination}
        relinkTargets={availableQuestions.map((note) => ({ id: note.id, title: note.content }))}
        relinkQuestionId={relinkQuestionId}
        isWorking={isDowngrading}
        onSelectType={setDowngradeType}
        onDestinationChange={(next) => {
          setDowngradeDestination(next);
          if (next === 'relink' && !relinkQuestionId && availableQuestions.length > 0) {
            setRelinkQuestionId(availableQuestions[0].id);
          }
        }}
        onSelectRelinkQuestion={setRelinkQuestionId}
        onConfirm={handleConfirmDowngrade}
        onCancel={() => !isDowngrading && setIsDowngradeOpen(false)}
        t={t}
      />
      <MoveToQuestionModal
        isOpen={moveNoteId !== null}
        isWorking={isMoving}
        questions={availableQuestions.map((q) => ({ id: q.id, title: q.content }))}
        selectedQuestionId={moveTargetQuestionId}
        onSelectQuestion={setMoveTargetQuestionId}
        onConfirm={handleConfirmMove}
        onCancel={() => setMoveNoteId(null)}
        t={t}
      />

      <div className="mb-10 sm:mb-12 section-divider pb-8">
        <div className="flex justify-between items-start">
          <span className="text-xs font-bold text-accent dark:text-accent-dark tracking-widest uppercase mb-3 block">{t('current_problem')}</span>
          <div className="flex items-center gap-2">
            <Tooltip content={visualizationOpen ? t('hide_visualization') : t('visualize')}>
            <button
              onClick={() => setVisualizationOpen((prev) => !prev)}
              className="h-10 w-10 sm:h-auto sm:w-auto sm:px-3 sm:py-2 muted-label border-0 sm:border sm:border-line dark:sm:border-line-dark hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark sm:hover:border-line-muted dark:sm:hover:border-muted-600 btn-icon cursor-pointer"
              aria-label={visualizationOpen ? t('hide_visualization') : t('visualize')}
            >
              <span className="sm:hidden">
                {visualizationOpen ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </span>
              <span className="hidden sm:inline">
                {visualizationOpen ? t('hide_visualization') : t('visualize')}
              </span>
            </button>
            </Tooltip>
            <Tooltip content={t('downgrade_question_action')}>
            <button
              onClick={openDowngrade}
              disabled={isSavingEdit || editingId === question.id || isDowngrading}
              className={`h-10 w-10 sm:h-auto sm:w-auto sm:px-3 sm:py-2 muted-label border-0 sm:border sm:border-line dark:sm:border-line-dark hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark sm:hover:border-line-muted dark:sm:hover:border-muted-600 btn-icon ${
                isSavingEdit || editingId === question.id || isDowngrading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              }`}
              aria-label={t('downgrade_question_action')}
            >
              <span className="sm:hidden">
                <ArrowDownIcon className="w-4 h-4" />
              </span>
              <span className="hidden sm:inline">
                {t('downgrade_question_action')}
              </span>
            </button>
            </Tooltip>
            {editingId !== question.id && (
              <>
                <ActionIconButton
                  action="edit"
                  onClick={() => handleEdit(question)}
                  disabled={isSavingEdit}
                />
                <ActionIconButton
                  action="copy"
                  onClick={() => handleCopyNote(question.content)}
                />
              </>
            )}
            <ActionIconButton
              action="delete"
              onClick={() => handleDelete(question.id, true)}
            />
          </div>
        </div>
        {editingId === question.id ? (
          <div className="space-y-2">
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
          <h1 className="page-title-lg">
            {question.content}
          </h1>
        )}
        <div className="mt-4 text-caption">
          {t('initiated_on')} {new Date(question.createdAt).toLocaleDateString()}
        </div>
      </div>

      {visualizationOpen && (
        <QuestionDetailVisualization
          question={question}
          notes={relatedNotes}
          selectedNote={selectedGraphNote}
          stats={stats}
          relationDensity={relationDensity}
          isSavingEdit={isSavingEdit}
          onSelectNote={setSelectedGraphNote}
          onEditNote={handleEdit}
          t={t}
        />
      )}

      <div className="space-y-10">
        {relatedNotes.length === 0 ? (
          <div className="text-center py-10 opacity-60 text-subtle dark:text-subtle-dark">
            <p className="text-body-sm-muted">{t('no_thoughts_here')}</p>
          </div>
        ) : (
          <>
            <QuestionDetailSection
              sectionKey="claims"
              title={t('section_claims')}
              emptyText={t('no_claims')}
              notes={claims}
              orderedNotes={getOrderedNotes('claims', claims)}
              isCollapsed={collapsedSections.claims ?? false}
              onToggle={() => toggleSection('claims')}
              noteProps={noteProps}
            />
            <QuestionDetailSection
              sectionKey="evidence"
              title={t('section_evidence')}
              emptyText={t('no_evidence')}
              notes={evidence}
              orderedNotes={getOrderedNotes('evidence', evidence)}
              isCollapsed={collapsedSections.evidence ?? false}
              onToggle={() => toggleSection('evidence')}
              noteProps={noteProps}
            />
            <QuestionDetailSection
              sectionKey="triggers"
              title={t('section_triggers')}
              emptyText={t('no_triggers')}
              notes={triggers}
              orderedNotes={getOrderedNotes('triggers', triggers)}
              isCollapsed={collapsedSections.triggers ?? false}
              onToggle={() => toggleSection('triggers')}
              noteProps={noteProps}
            />
            <QuestionDetailSection
              sectionKey="other"
              title={t('section_other')}
              emptyText={t('no_other')}
              notes={otherNotes}
              orderedNotes={getOrderedNotes('other', otherNotes)}
              isCollapsed={collapsedSections.other ?? false}
              onToggle={() => toggleSection('other')}
              noteProps={noteProps}
            />
          </>
        )}
      </div>

      <div className="mt-16 sm:mt-20 flex justify-center">
        <Link to={`/write?questionId=${question.id}`} className="btn-pill btn-outline">
          {t('add_thought_stream')}
        </Link>
      </div>
    </div>
  );
};

export default QuestionDetail;
