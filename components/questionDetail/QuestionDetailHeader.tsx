import React from 'react';
import { Note } from '../../types';
import { ArrowDownIcon, CheckIcon, EyeIcon, EyeOffIcon, LoadingSpinner, XIcon } from '../Icons';
import ActionIconButton from '../ActionIconButton';
import Tooltip from '../Tooltip';

interface QuestionDetailHeaderProps {
  t: (key: string) => string;
  question: Note;
  visualizationOpen: boolean;
  onToggleVisualization: () => void;
  onOpenDowngrade: () => void;
  isSavingEdit: boolean;
  editingId: string | null;
  isDowngrading: boolean;
  editContent: string;
  onEditContentChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditQuestion: () => void;
  onCopyQuestion: () => void;
  onDeleteQuestion: () => void;
}

const QuestionDetailHeader: React.FC<QuestionDetailHeaderProps> = ({
  t,
  question,
  visualizationOpen,
  onToggleVisualization,
  onOpenDowngrade,
  isSavingEdit,
  editingId,
  isDowngrading,
  editContent,
  onEditContentChange,
  onSaveEdit,
  onCancelEdit,
  onEditQuestion,
  onCopyQuestion,
  onDeleteQuestion
}) => {
  const isEditingQuestion = editingId === question.id;

  return (
    <div className="mb-10 sm:mb-12 section-divider pb-8">
      <div className="flex justify-between items-start">
        <span className="text-xs font-bold text-accent dark:text-accent-dark tracking-widest uppercase mb-3 block">
          {t('current_problem')}
        </span>
        <div className="flex items-center gap-2">
          <Tooltip content={visualizationOpen ? t('hide_visualization') : t('visualize')}>
            <button
              onClick={onToggleVisualization}
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
              onClick={onOpenDowngrade}
              disabled={isSavingEdit || isEditingQuestion || isDowngrading}
              className={`h-10 w-10 sm:h-auto sm:w-auto sm:px-3 sm:py-2 muted-label border-0 sm:border sm:border-line dark:sm:border-line-dark hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark sm:hover:border-line-muted dark:sm:hover:border-muted-600 btn-icon ${
                isSavingEdit || isEditingQuestion || isDowngrading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
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
          {!isEditingQuestion && (
            <>
              <ActionIconButton
                action="edit"
                onClick={onEditQuestion}
                disabled={isSavingEdit}
              />
              <ActionIconButton
                action="copy"
                onClick={onCopyQuestion}
              />
            </>
          )}
          <ActionIconButton
            action="delete"
            onClick={onDeleteQuestion}
          />
        </div>
      </div>
      {isEditingQuestion ? (
        <div className="space-y-2">
          <textarea
            className="textarea-base"
            value={editContent}
            onChange={(event) => onEditContentChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                onCancelEdit();
              }
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                void onSaveEdit();
              }
            }}
            rows={2}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={onSaveEdit}
              disabled={isSavingEdit || !editContent.trim()}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm bg-accent dark:bg-accent-dark text-white rounded-md hover:opacity-90 transition-opacity ${
                isSavingEdit || !editContent.trim() ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {isSavingEdit ? <LoadingSpinner className="w-3.5 h-3.5 text-white" /> : <CheckIcon className="w-3.5 h-3.5" />}
              {isSavingEdit ? t('saving') : t('save')}
            </button>
            <button
              onClick={onCancelEdit}
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
  );
};

export default QuestionDetailHeader;
