import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDarkMatter, getQuestions, updateNoteMeta, deleteNote } from '../services/storageService';
import { Note, NoteType } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { ArrowRightIcon, TrashIcon, XIcon } from '../components/Icons';

const TypeBadge: React.FC<{ type: NoteType; subType?: string }> = ({ type, subType }) => {
  const { t } = useAppContext();

  const colors = {
    [NoteType.CLAIM]: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800',
    [NoteType.EVIDENCE]: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800',
    [NoteType.TRIGGER]: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-800',
    [NoteType.QUESTION]: 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400',
    [NoteType.UNCATEGORIZED]: 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
  };

  return (
    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${colors[type] || colors[NoteType.UNCATEGORIZED]}`}>
      {t(`type_${type}` as any)}
      {subType && <span className="font-normal opacity-70 ml-1 normal-case tracking-normal">· {subType}</span>}
    </span>
  );
};

const ConfirmDialog: React.FC<{
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-white dark:bg-stone-800 rounded-lg p-6 max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
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
            className="px-4 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-white dark:bg-stone-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
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
                className="w-full text-left p-3 rounded-lg border border-stone-200 dark:border-stone-700 hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
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
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-subtle dark:text-subtle-dark hover:text-ink dark:hover:text-ink-dark text-sm mb-4 transition-colors"
        >
          <ArrowRightIcon className="w-4 h-4 rotate-180" />
          {t('back_home')}
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-gray-500 dark:text-gray-400 text-sm">🌑</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-medium text-ink dark:text-ink-dark leading-tight">
            {t('dark_matter')}
          </h1>
        </div>
        <p className="text-subtle dark:text-subtle-dark text-sm sm:text-base">
          {t('dark_matter_desc')}
        </p>
        {darkMatter.length > 0 && (
          <p className="mt-2 text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wider">
            {darkMatter.length} {t('dark_matter_count')}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="space-y-4 pb-8">
        {darkMatter.length === 0 ? (
          <div className="text-center py-14 px-5 border border-dashed border-stone-300 dark:border-stone-700 rounded-2xl bg-white/60 dark:bg-stone-900/40 shadow-sm">
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
              className="group bg-white/80 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700 p-4 sm:p-5 rounded-2xl hover:shadow-md transition-all duration-300"
            >
              {/* Note header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <TypeBadge type={note.type} subType={note.subType} />
                  <span className="text-[10px] text-stone-400 dark:text-stone-500">
                    {formatRelativeTime(note.createdAt)}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="h-9 w-9 grid place-items-center text-stone-400 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all rounded-full hover:bg-stone-100 dark:hover:bg-stone-700"
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
              <div className="flex flex-wrap gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  onClick={() => handleLinkToQuestion(note.id)}
                  className="px-3 py-1.5 text-xs rounded-full border border-stone-200 dark:border-stone-700 text-subtle dark:text-subtle-dark hover:text-ink dark:hover:text-ink-dark hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                >
                  {t('link_to_question')}
                </button>
                <button
                  onClick={() => handlePromoteToQuestion(note.id)}
                  className="px-3 py-1.5 text-xs rounded-full border border-stone-200 dark:border-stone-700 text-subtle dark:text-subtle-dark hover:text-ink dark:hover:text-ink-dark hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
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
