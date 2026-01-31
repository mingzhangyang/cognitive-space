import React, { useState } from 'react';
import { createNoteObject, saveNote, getQuestions } from '../services/storageService';
import { analyzeText } from '../services/aiService';
import { NoteType } from '../types';
import { LoadingSpinner } from '../components/Icons';
import { useAppContext } from '../contexts/AppContext';

const Write: React.FC = () => {
  const [content, setContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{ type: string; subType?: string; linkedTo?: string } | null>(null);
  const { t, language } = useAppContext();

  // Auto-focus logic or simple textarea
  const handleSave = async () => {
    if (!content.trim()) return;

    setIsProcessing(true);
    setAiFeedback(null);

    try {
      // 1. Create the note object locally first
      const newNote = createNoteObject(content.trim());
      
      // 2. Get existing questions for context
      const existingQuestions = await getQuestions();

      // 3. AI Analysis
      const analysis = await analyzeText(newNote.content, existingQuestions, language);

      // 4. Update note with AI results
      newNote.type = analysis.classification;
      newNote.subType = analysis.subType;
      newNote.confidence = analysis.confidence;

      if (analysis.relatedQuestionId) {
        newNote.parentId = analysis.relatedQuestionId;
      }

      // 5. Save to storage
      await saveNote(newNote);

      // 6. Provide UI Feedback (The "Quiet Hint")
      // Find question title for feedback
      const linkedQuestion = existingQuestions.find(q => q.id === analysis.relatedQuestionId);
      
      // Map classification to localized string for display
      const localizedType = t(`type_${analysis.classification}` as any);

      setAiFeedback({
        type: localizedType,
        subType: analysis.subType,
        linkedTo: linkedQuestion ? linkedQuestion.content : undefined
      });

      // Clear input but keep feedback visible for a moment
      setContent('');
      
      // Reset after delay or redirect
      setTimeout(() => {
        setIsProcessing(false);
      }, 2500);

    } catch (error) {
      console.error("Error saving note:", error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-[80vh] flex flex-col">
      <div className="flex-1 flex flex-col justify-center">
        <textarea
          className="w-full h-full bg-transparent text-xl leading-relaxed text-ink dark:text-ink-dark resize-none focus:outline-none placeholder:text-stone-300 dark:placeholder:text-stone-600 font-serif"
          placeholder={t('write_placeholder')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoFocus
          disabled={isProcessing}
        />
      </div>

      <div className="h-20 flex items-center justify-between border-t border-stone-100 dark:border-stone-800 mt-4 pt-4">
        <div className="text-sm text-subtle dark:text-subtle-dark flex items-center gap-2">
           {isProcessing && !aiFeedback && (
             <>
               <LoadingSpinner className="w-4 h-4 text-accent dark:text-accent-dark" />
               <span className="animate-pulse">{t('absorbing')}</span>
             </>
           )}
           {aiFeedback && (
             <div className="animate-fade-in text-ink dark:text-stone-200 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-md text-xs">
               <span className="capitalize font-bold text-accent dark:text-accent-dark">{aiFeedback.type}</span>
               {aiFeedback.subType && <span className="opacity-70 ml-1">({aiFeedback.subType})</span>} {t('detected')} 
               {aiFeedback.linkedTo ? (
                 <span className="ml-1">{t('linked_to')} "{(aiFeedback.linkedTo.length > 20 ? aiFeedback.linkedTo.substring(0, 20) + '...' : aiFeedback.linkedTo)}".</span>
               ) : (
                  // Checking the raw key isn't ideal since we localized it, but logic holds if type is QUESTION
                  aiFeedback.type === t('type_question') ? ` ${t('new_gravity')}` : ` ${t('stored_loosely')}`
               )}
             </div>
           )}
        </div>

        <button
          onClick={handleSave}
          disabled={!content.trim() || isProcessing}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            content.trim() && !isProcessing
              ? 'bg-ink dark:bg-stone-700 text-white hover:bg-black dark:hover:bg-stone-600 shadow-md'
              : 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed'
          }`}
        >
          {isProcessing ? t('saving') : t('cast')}
        </button>
      </div>
    </div>
  );
};

export default Write;
