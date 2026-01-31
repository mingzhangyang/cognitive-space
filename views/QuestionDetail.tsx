import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getNoteById, getRelatedNotes } from '../services/storageService';
import { Note, NoteType } from '../types';
import { useAppContext } from '../contexts/AppContext';

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

const QuestionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [question, setQuestion] = useState<Note | null>(null);
  const [relatedNotes, setRelatedNotes] = useState<Note[]>([]);
  const { t } = useAppContext();

  useEffect(() => {
    if (id) {
      const allNotes = getRelatedNotes(id);
      setRelatedNotes(allNotes.sort((a, b) => b.createdAt - a.createdAt));

      const q = getNoteById(id);
      setQuestion(q || null);
    }
  }, [id]);

  if (!question) {
    return <div className="p-8 text-center text-subtle dark:text-subtle-dark">{t('problem_not_found')}</div>;
  }

  return (
    <div>
      <div className="mb-12 border-b border-stone-100 dark:border-stone-800 pb-8">
        <span className="text-xs font-bold text-accent dark:text-accent-dark tracking-widest uppercase mb-3 block">{t('current_problem')}</span>
        <h1 className="text-3xl md:text-4xl font-serif font-medium text-ink dark:text-ink-dark leading-tight">
          {question.content}
        </h1>
        <div className="mt-4 text-xs text-subtle dark:text-subtle-dark">
           {t('initiated_on')} {new Date(question.createdAt).toLocaleDateString()}
        </div>
      </div>

      <div className="space-y-8">
        {relatedNotes.length === 0 ? (
          <div className="text-center py-10 opacity-60 text-subtle dark:text-subtle-dark">
            <p className="text-sm">{t('no_thoughts_here')}</p>
          </div>
        ) : (
          relatedNotes.map((note) => (
            <div key={note.id} className="group relative pl-6 border-l-2 border-stone-100 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-600 transition-colors">
              <div className="mb-2">
                <TypeBadge type={note.type} subType={note.subType} />
                <span className="text-[10px] text-stone-300 dark:text-stone-600 ml-2">{new Date(note.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <p className="text-ink dark:text-ink-dark leading-relaxed whitespace-pre-wrap">
                {note.content}
              </p>
            </div>
          ))
        )}
      </div>
      
      <div className="mt-20 flex justify-center">
        <Link to="/write" className="text-sm text-subtle dark:text-subtle-dark hover:text-accent dark:hover:text-accent-dark border-b border-transparent hover:border-accent dark:hover:border-accent-dark transition-all pb-0.5">
          {t('add_thought_stream')}
        </Link>
      </div>
    </div>
  );
};

export default QuestionDetail;