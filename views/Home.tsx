import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { getQuestions, getNotes, deleteNote, getDarkMatter } from '../services/storageService';
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
  const [darkMatterCount, setDarkMatterCount] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [isRecallOpen, setIsRecallOpen] = useState(false);
  const [fabContainer, setFabContainer] = useState<HTMLElement | null>(null);
  const { t } = useAppContext();

  const loadData = async () => {
    const allNotes = await getNotes();
    setHasNotes(allNotes.length > 0);
    const questions = await getQuestions();
    setQuestions(questions.sort((a, b) => b.updatedAt - a.updatedAt));
    const darkMatter = await getDarkMatter();
    setDarkMatterCount(darkMatter.length);
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

      <div className="mb-7 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-serif font-medium text-ink dark:text-ink-dark mb-2 leading-tight">{t('living_questions')}</h1>
        <p className="text-subtle dark:text-subtle-dark text-sm sm:text-base">{t('problems_mind')}</p>
      </div>

      <div className="space-y-5 pb-28 sm:pb-24">
        <div className="mb-6">
          <div className="flex flex-wrap gap-3">
            {!isRecallOpen ? (
              <button
                type="button"
                onClick={openRecall}
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-4 py-3 rounded-full border border-stone-200 dark:border-stone-700 text-[11px] sm:text-xs uppercase tracking-[0.2em] text-subtle dark:text-subtle-dark bg-white/70 dark:bg-stone-900/50 hover:text-ink dark:hover:text-ink-dark hover:border-stone-300 dark:hover:border-stone-600 transition-colors min-h-[44px]"
                aria-label={t('recall_label')}
                title={t('recall_label')}
              >
                <SearchIcon className="w-4 h-4" />
                <span>{t('recall_label')}</span>
              </button>
            ) : null}
            {darkMatterCount > 0 && (
              <Link
                to="/dark-matter"
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-4 py-3 rounded-full border border-stone-200 dark:border-stone-700 text-[11px] sm:text-xs uppercase tracking-[0.2em] text-subtle dark:text-subtle-dark bg-white/70 dark:bg-stone-900/50 hover:text-ink dark:hover:text-ink-dark hover:border-stone-300 dark:hover:border-stone-600 transition-colors min-h-[44px]"
              >
                <span className="text-sm">🌑</span>
                <span>{t('dark_matter')}</span>
                <span className="ml-1 px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded-full text-[10px]">
                  {darkMatterCount}
                </span>
              </Link>
            )}
          </div>
          {isRecallOpen && (
            <>
              <label htmlFor="recall" className="text-[11px] uppercase tracking-[0.2em] text-subtle dark:text-subtle-dark">
                {t('recall_label')}
              </label>
              <div className="mt-3 relative">
                <SearchIcon className="w-4 h-4 text-stone-500 dark:text-stone-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                  className="w-full rounded-full border border-stone-200 dark:border-stone-700 bg-white/80 dark:bg-stone-900/60 text-base sm:text-sm text-ink dark:text-ink-dark px-10 py-3.5 focus:outline-none focus:ring-2 focus:ring-accent/30 dark:focus:ring-accent-dark/30 placeholder:text-stone-500 dark:placeholder:text-stone-600 shadow-sm"
                  aria-label={t('recall_label')}
                  autoFocus
                />
                {queryTokens.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 sm:h-9 sm:w-9 grid place-items-center rounded-full text-stone-500 hover:text-ink dark:text-stone-500 dark:hover:text-ink-dark hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
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
          <div className="text-center py-14 px-5 border border-dashed border-stone-300 dark:border-stone-700 rounded-2xl bg-white/60 dark:bg-stone-900/40 shadow-sm">
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
              className="block group bg-white/80 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700 p-4 sm:p-6 rounded-2xl hover:shadow-md transition-all duration-300 hover:border-accent/30 dark:hover:border-accent-dark/30"
            >
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium text-ink dark:text-ink-dark group-hover:text-accent dark:group-hover:text-accent-dark transition-colors leading-relaxed flex-1 pr-2">
                  {q.content}
                </h3>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={(e) => handleDelete(e, q.id)}
                    className="h-11 w-11 sm:h-10 sm:w-10 grid place-items-center text-stone-400 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all rounded-full hover:bg-stone-100 dark:hover:bg-stone-700"
                    title="Delete question"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                  <ArrowRightIcon className="text-stone-400 dark:text-stone-600 group-hover:text-accent dark:group-hover:text-accent-dark w-5 h-5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] sm:text-xs text-subtle dark:text-subtle-dark font-medium uppercase tracking-wider">
                <span>{t('last_active')} {new Date(q.updatedAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      {fabContainer && createPortal(
        <Link
          to="/write"
          className="fixed bottom-20 right-4 sm:bottom-24 sm:right-8 bg-[#1abc9c] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform hover:bg-[#16a085] focus:outline-none focus:ring-4 focus:ring-[#9ee7d8] dark:bg-[#1abc9c] dark:hover:bg-[#25d0b2] dark:focus:ring-[#9ee7d8]/50 z-50"
          aria-label="Write"
        >
          <PlusIcon className="w-6 h-6" />
        </Link>,
        fabContainer
      )}
    </div>
  );
};

export default Home;
