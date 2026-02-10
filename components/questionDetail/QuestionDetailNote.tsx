import React from 'react';
import { Note, NoteType } from '../../types';
import {
  CheckIcon,
  GripVerticalIcon,
  LoadingSpinner,
  MoreIcon,
  MoveIcon,
  XIcon
} from '../Icons';
import ActionIconButton from '../ActionIconButton';
import ActionSheetButton from '../ActionSheetButton';
import IconButton from '../IconButton';
import MobileActionSheet from '../MobileActionSheet';
import TypeBadge from '../TypeBadge';

export interface QuestionDetailNoteSharedProps {
  availableQuestions: Note[];
  editingId: string | null;
  editContent: string;
  isSavingEdit: boolean;
  pendingNoteId: string | null;
  mobileNoteActionsId: string | null;
  setMobileNoteActionsId: (id: string | null) => void;
  setEditContent: (value: string) => void;
  handleEdit: (note: Note) => void;
  handleCopyNote: (content: string) => void;
  handleSaveEdit: () => Promise<void> | void;
  handleCancelEdit: () => void;
  handleDelete: (id: string, isQuestion: boolean) => void;
  openCopyToQuestion: (noteId: string) => void;
  openMoveToQuestion: (noteId: string) => void;
  handleDragStart: (noteId: string, sectionKey: string) => void;
  handleDragEnter: (noteId: string, sectionKey: string) => void;
  handleDragEnd: (sectionKey: string, orderedNotes: Note[]) => void;
  t: (key: string) => string;
}

export interface QuestionDetailNoteProps extends QuestionDetailNoteSharedProps {
  note: Note;
  sectionKey: string;
  orderedNotes: Note[];
}

const QuestionDetailNote: React.FC<QuestionDetailNoteProps> = ({
  note,
  sectionKey,
  orderedNotes,
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
  openCopyToQuestion,
  openMoveToQuestion,
  handleDragStart,
  handleDragEnter,
  handleDragEnd,
  t
}) => {
  const isMobileActionsOpen = mobileNoteActionsId === note.id;
  const isAnalyzing = pendingNoteId === note.id && note.type === NoteType.UNCATEGORIZED;
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
      {availableQuestions.length > 0 && (
        <ActionIconButton
          action="copy_to"
          onClick={() => openCopyToQuestion(note.id)}
        />
      )}
      {availableQuestions.length > 0 && (
        <IconButton
          label={t('move_to_question')}
          sizeClassName="h-10 w-10"
          onClick={() => openMoveToQuestion(note.id)}
          className="text-subtle dark:text-subtle-dark hover:text-accent dark:hover:text-accent-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
        >
          <MoveIcon className="w-4 h-4" />
        </IconButton>
      )}
      <ActionIconButton
        action="delete"
        onClick={() => handleDelete(note.id, false)}
      />
    </>
  );

  return (
    <div
      key={note.id}
      id={`note-${note.id}`}
      draggable
      onDragStart={() => handleDragStart(note.id, sectionKey)}
      onDragEnter={() => handleDragEnter(note.id, sectionKey)}
      onDragEnd={() => handleDragEnd(sectionKey, orderedNotes)}
      onDragOver={(event) => event.preventDefault()}
      className="group relative pl-4 sm:pl-6 border-l-2 border-line-soft dark:border-line-dark hover:border-line-muted dark:hover:border-muted-600 transition-colors"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center">
          <span
            className="hidden sm:flex items-center cursor-grab active:cursor-grabbing text-muted-300 dark:text-muted-500 opacity-0 group-hover:opacity-100 transition-opacity mr-1 -ml-5"
            aria-hidden="true"
          >
            <GripVerticalIcon className="w-3.5 h-3.5" />
          </span>
          <TypeBadge type={note.type} subType={note.subType} />
          <span className="text-micro text-muted-300 dark:text-muted-400 ml-2">
            {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isAnalyzing && (
            <span className="ml-2 inline-flex items-center gap-1 text-micro text-muted-400 dark:text-muted-500">
              <LoadingSpinner className="w-3 h-3 text-muted-400 dark:text-muted-500" />
              {t('analyzing')}
            </span>
          )}
        </div>
        <div className="relative flex items-center gap-1">
          {editingId !== note.id && (
            <>
              <IconButton
                label={t('actions_show')}
                showTooltip={false}
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
                {availableQuestions.length > 0 && (
                  <ActionSheetButton
                    action="copy_to"
                    onClick={() => {
                      setMobileNoteActionsId(null);
                      openCopyToQuestion(note.id);
                    }}
                  />
                )}
                {availableQuestions.length > 0 && (
                  <ActionSheetButton
                    action="move"
                    onClick={() => {
                      setMobileNoteActionsId(null);
                      openMoveToQuestion(note.id);
                    }}
                  />
                )}
                <ActionSheetButton
                  action="delete"
                  onClick={() => {
                    setMobileNoteActionsId(null);
                    handleDelete(note.id, false);
                  }}
                />
              </MobileActionSheet>
            </>
          )}
        </div>
      </div>

      {editingId === note.id ? (
        <div className="space-y-2">
          <textarea
            className="textarea-base"
            value={editContent}
            onChange={(event) => setEditContent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                handleCancelEdit();
              }
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
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
              {isSavingEdit ? (
                <LoadingSpinner className="w-3.5 h-3.5 text-white" />
              ) : (
                <CheckIcon className="w-3.5 h-3.5" />
              )}
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
        <p className="text-ink dark:text-ink-dark leading-relaxed whitespace-pre-wrap">
          {note.content}
        </p>
      )}
    </div>
  );
};

export default QuestionDetailNote;
