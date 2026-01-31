import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getQuestions, getNotes } from '../services/storageService';
import { Note } from '../types';
import { PlusIcon, ArrowRightIcon } from '../components/Icons';
import { useAppContext } from '../contexts/AppContext';

const Home: React.FC = () => {
  const [questions, setQuestions] = useState<Note[]>([]);
  const [hasNotes, setHasNotes] = useState(false);
  const { t } = useAppContext();

  useEffect(() => {
    const allNotes = getNotes();
    setHasNotes(allNotes.length > 0);
    // Sort questions by updatedAt (most recently touched)
    setQuestions(getQuestions().sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);

  return (
    <div className="flex flex-col h-full relative">
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-medium text-ink dark:text-ink-dark mb-2">{t('living_questions')}</h1>
        <p className="text-subtle dark:text-subtle-dark text-sm">{t('problems_mind')}</p>
      </div>

      <div className="space-y-4 pb-24">
        {questions.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-stone-300 dark:border-stone-700 rounded-lg">
            <p className="text-ink dark:text-ink-dark font-serif mb-2 text-lg">
              {hasNotes ? t('no_question_yet') : t('space_empty')}
            </p>
            <p className="text-subtle dark:text-subtle-dark text-sm">
              {t('just_write')}
            </p>
          </div>
        ) : (
          questions.map((q) => (
            <Link 
              key={q.id} 
              to={`/question/${q.id}`}
              className="block group bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-6 rounded-lg hover:shadow-md transition-all duration-300 hover:border-accent/30 dark:hover:border-accent-dark/30"
            >
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium text-ink dark:text-ink-dark group-hover:text-accent dark:group-hover:text-accent-dark transition-colors leading-relaxed">
                  {q.content}
                </h3>
                <ArrowRightIcon className="text-stone-300 dark:text-stone-600 group-hover:text-accent dark:group-hover:text-accent-dark w-5 h-5 mt-1 ml-4 opacity-0 group-hover:opacity-100 transition-all" />
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