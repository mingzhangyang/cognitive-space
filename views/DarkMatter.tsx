import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDarkMatter, getQuestions, updateNoteMeta, deleteNote } from '../services/storageService';
import { Note, NoteType } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { TrashIcon, XIcon } from '../components/Icons';
import TypeBadge from '../components/TypeBadge';

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
            className="px-4 py-2 text-sm text-subtle dark:text-subtle-dark hover:text-ink dark:hover:text-ink-dark transition-colors"
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
            <p className="text-subtle dark:text-subtle-dark text-sm py-4 text-center">
              No questions available. Create one first.
            </p>
          ) : (
            questions.map((q) => (
              <button
                key={q.id}
                onClick={() => onSelect(q.id)}
                className="w-full text-left p-3 rounded-lg border border-line dark:border-line-dark hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                <p className="text-ink dark:text-ink-dark text-sm line-clamp-2">{q.content}</p>
              </button>
            ))
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-subtle dark:text-subtle-dark hover:text-ink dark:hover:text-ink-dark transition-colors"
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
  const { t } = useAppContext();

  const loadData = async () => {
    const dm = await getDarkMatter();
    setDarkMatter(dm.sort((a, b) => b.createdAt - a.createdAt));
    const qs = await getQuestions();
    setQuestions(qs.sort((a, b) => b.updatedAt - a.updatedAt));
  };

  useEffect(() => {
    void loadData();
  }, []);

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

  return (
    <div className="flex flex-col h-full relative">
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        message="Delete this fragment?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
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
          <p className="mt-2 text-xs text-muted-400 dark:text-muted-400 uppercase tracking-wider">
            {darkMatter.length} {t('dark_matter_count')}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="space-y-4 pb-8">
        {darkMatter.length === 0 ? (
          <div className="text-center py-14 px-5 surface-empty shadow-sm">
            <p className="text-ink dark:text-ink-dark font-serif mb-2 text-lg">
              ✨
            </p>
            <p className="text-subtle dark:text-subtle-dark text-sm">
              {t('no_dark_matter')}
            </p>
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
                  className="h-9 w-9 btn-icon text-muted-400 dark:text-muted-400 hover:text-red-500 dark:hover:text-red-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:bg-surface-hover dark:hover:bg-surface-hover-strong-dark"
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
