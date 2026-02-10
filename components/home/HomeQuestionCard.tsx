import React from 'react';
import { Link } from 'react-router-dom';
import { Note } from '../../types';
import CardActions from '../CardActions';
import InlineEditForm from '../InlineEditForm';

interface HomeQuestionCardProps {
  question: Note;
  isEditing: boolean;
  editContent: string;
  isSavingEdit: boolean;
  isMobileActionsOpen: boolean;
  tensionColor: string;
  onStartEdit: (event: React.MouseEvent, question: Note) => void;
  onCopy: (event: React.MouseEvent, content: string) => void;
  onDelete: (event: React.MouseEvent, questionId: string) => void;
  onOpenMobileActions: (event: React.MouseEvent) => void;
  onCloseMobileActions: () => void;
  onEditContentChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  t: (key: string) => string;
}

const HomeQuestionCard: React.FC<HomeQuestionCardProps> = ({
  question,
  isEditing,
  editContent,
  isSavingEdit,
  isMobileActionsOpen,
  tensionColor,
  onStartEdit,
  onCopy,
  onDelete,
  onOpenMobileActions,
  onCloseMobileActions,
  onEditContentChange,
  onSaveEdit,
  onCancelEdit,
  t
}) => {
  const cardBody = (
    <>
      <div className="flex justify-between items-start">
        {isEditing ? (
          <InlineEditForm
            value={editContent}
            onChange={onEditContentChange}
            onSave={onSaveEdit}
            onCancel={onCancelEdit}
            isSaving={isSavingEdit}
            rows={2}
            className="flex-1 pr-2 space-y-3"
          />
        ) : (
          <h3 className="text-lg font-medium text-ink dark:text-ink-dark leading-relaxed flex-1 pr-2">
            {question.content}
          </h3>
        )}
        {!isEditing && (
          <div className="ml-4">
            <CardActions
              actions={[
                { action: 'edit', onClick: (event) => onStartEdit(event, question) },
                { action: 'copy', onClick: (event) => onCopy(event, question.content) },
                { action: 'delete', onClick: (event) => onDelete(event, question.id) }
              ]}
              isMobileSheetOpen={isMobileActionsOpen}
              onMobileSheetOpen={onOpenMobileActions}
              onMobileSheetClose={onCloseMobileActions}
              desktopGapClassName="gap-2"
              desktopButtonClassName="opacity-0 sm:group-hover:opacity-100 transition-all"
              desktopButtonBaseClassName="text-muted-400 dark:text-muted-400"
              mobileButtonClassName="text-muted-400 hover:text-ink dark:text-muted-400 dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
            />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2 section-kicker">
        <span
          className={`inline-block w-2 h-2 rounded-full ${tensionColor} shrink-0`}
        />
        <span>{t('last_active')} {new Date(question.updatedAt).toLocaleDateString()}</span>
      </div>
    </>
  );

  if (isEditing) {
    return (
      <div
        className="block group surface-card p-4 sm:p-5 card-interactive hover:border-accent/30 dark:hover:border-accent-dark/30"
      >
        {cardBody}
      </div>
    );
  }

  return (
    <Link
      to={`/question/${question.id}`}
      className="block group surface-card p-4 sm:p-5 card-interactive hover:border-accent/30 dark:hover:border-accent-dark/30"
    >
      {cardBody}
    </Link>
  );
};

export default HomeQuestionCard;
