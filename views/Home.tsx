import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getQuestions, getNotes, deleteNote } from '../services/storageService';
import { Note } from '../types';
import { PlusIcon, ArrowRightIcon, TrashIcon, SearchIcon, XIcon } from '../components/Icons';
import { useAppContext } from '../contexts/AppContext';

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

const Home: React.FC = () => {
  const [questions, setQuestions] = useState<Note[]>([]);
  const [hasNotes, setHasNotes] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [isRecallOpen, setIsRecallOpen] = useState(false);
  const { t } = useAppContext();

  const loadData = async () => {
    const allNotes = await getNotes();
    setHasNotes(allNotes.length > 0);
    const questions = await getQuestions();
    setQuestions(questions.sort((a, b) => b.updatedAt - a.updatedAt));
  };

  useEffect(() => {
    void loadData();
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
    setDeleteTarget(questionId);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await deleteNote(deleteTarget);
      void loadData();
      setDeleteTarget(null);
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

      <div className="mb-8">
        <h1 className="text-2xl font-serif font-medium text-ink dark:text-ink-dark mb-2">{t('living_questions')}</h1>
        <p className="text-subtle dark:text-subtle-dark text-sm">{t('problems_mind')}</p>
      </div>

      <div className="space-y-4 pb-24">
        <div className="mb-6">
          {!isRecallOpen ? (
            <button
              type="button"
              onClick={openRecall}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-stone-200 dark:border-stone-700 text-xs uppercase tracking-widest text-subtle dark:text-subtle-dark hover:text-ink dark:hover:text-ink-dark hover:border-stone-300 dark:hover:border-stone-600 transition-colors"
              aria-label={t('recall_label')}
              title={t('recall_label')}
            >
              <SearchIcon className="w-4 h-4" />
              <span>{t('recall_label')}</span>
            </button>
          ) : (
            <>
              <label htmlFor="recall" className="text-xs uppercase tracking-widest text-subtle dark:text-subtle-dark">
                {t('recall_label')}
              </label>
              <div className="mt-3 relative">
                <SearchIcon className="w-4 h-4 text-stone-400 dark:text-stone-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                  className="w-full rounded-full border border-stone-200 dark:border-stone-700 bg-white/80 dark:bg-stone-900/60 text-sm text-ink dark:text-ink-dark px-10 py-3 focus:outline-none focus:ring-2 focus:ring-accent/30 dark:focus:ring-accent-dark/30 placeholder:text-stone-300 dark:placeholder:text-stone-600"
                  aria-label={t('recall_label')}
                  autoFocus
                />
                {queryTokens.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-stone-400 hover:text-ink dark:text-stone-500 dark:hover:text-ink-dark hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    aria-label={t('clear_recall')}
                    title={t('clear_recall')}
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-subtle dark:text-subtle-dark">{t('recall_hint')}</p>
            </>
          )}
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-stone-300 dark:border-stone-700 rounded-lg">
            {hasQuestions && isFiltering ? (
              <>
                <p className="text-ink dark:text-ink-dark font-serif mb-2 text-lg">
                  {t('no_recall_results')}
                </p>
                <p className="text-subtle dark:text-subtle-dark text-sm">
                  {t('recall_hint')}
                </p>
              </>
            ) : (
              <>
                <p className="text-ink dark:text-ink-dark font-serif mb-2 text-lg">
                  {hasNotes ? t('no_question_yet') : t('space_empty')}
                </p>
                <p className="text-subtle dark:text-subtle-dark text-sm">
                  {t('just_write')}
                </p>
              </>
            )}
          </div>
        ) : (
          filteredQuestions.map((q) => (
            <Link
              key={q.id}
              to={`/question/${q.id}`}
              className="block group bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-6 rounded-lg hover:shadow-md transition-all duration-300 hover:border-accent/30 dark:hover:border-accent-dark/30"
            >
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium text-ink dark:text-ink-dark group-hover:text-accent dark:group-hover:text-accent-dark transition-colors leading-relaxed flex-1">
                  {q.content}
                </h3>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={(e) => handleDelete(e, q.id)}
                    className="p-2 text-stone-300 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-stone-100 dark:hover:bg-stone-700"
                    title="Delete question"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                  <ArrowRightIcon className="text-stone-300 dark:text-stone-600 group-hover:text-accent dark:group-hover:text-accent-dark w-5 h-5 opacity-0 group-hover:opacity-100 transition-all" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-subtle dark:text-subtle-dark font-medium uppercase tracking-wider">
                <span>{t('last_active')} {new Date(q.updatedAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <Link
        to="/write"
        className="fixed bottom-8 right-8 bg-ink dark:bg-stone-700 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform hover:bg-black dark:hover:bg-stone-600 focus:outline-none focus:ring-4 focus:ring-stone-300 dark:focus:ring-stone-600 z-50"
        aria-label="Write"
      >
        <PlusIcon className="w-6 h-6" />
      </Link>
    </div>
  );
};

export default Home;
