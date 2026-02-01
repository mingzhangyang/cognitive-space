import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createNoteObject, saveNote, getQuestions, updateNoteMeta } from '../services/storageService';
import { analyzeText } from '../services/aiService';
import { NoteType } from '../types';
import { LoadingSpinner } from '../components/Icons';
import { useAppContext } from '../contexts/AppContext';

const Write: React.FC = () => {
  const [content, setContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [linkHint, setLinkHint] = useState<{ questionId: string; title: string } | null>(null);
  const [mergeCandidate, setMergeCandidate] = useState<{ noteId: string; relatedQuestionId: string; relatedTitle: string } | null>(null);
  const { t, language } = useAppContext();
  const navigate = useNavigate();
  const feedbackTimerRef = useRef<number | null>(null);

  // Auto-focus logic or simple textarea
  const truncate = (text: string, max = 24) => (text.length > max ? `${text.slice(0, max)}...` : text);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const handleMerge = async () => {
    if (!mergeCandidate) return;
    await updateNoteMeta(mergeCandidate.noteId, {
      parentId: mergeCandidate.relatedQuestionId,
      subType: 'alias'
    });
    setMergeCandidate(null);
  };

  const handleKeepSeparate = () => {
    setMergeCandidate(null);
  };

  const handleSave = async () => {
    if (!content.trim()) return;

    setIsProcessing(true);
    setLinkHint(null);
    setMergeCandidate(null);
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }

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

      const isQuestion = analysis.classification === NoteType.QUESTION;
      const relatedQuestionId = analysis.relatedQuestionId || undefined;
      const linkedQuestion = relatedQuestionId
        ? existingQuestions.find(q => q.id === relatedQuestionId)
        : undefined;

      if (!isQuestion && relatedQuestionId) {
        newNote.parentId = relatedQuestionId;
      }

      // 5. Save to storage
      await saveNote(newNote);

      if (isQuestion && linkedQuestion) {
        setMergeCandidate({
          noteId: newNote.id,
          relatedQuestionId: linkedQuestion.id,
          relatedTitle: linkedQuestion.content
        });
      } else if (!isQuestion && linkedQuestion) {
        setLinkHint({
          questionId: linkedQuestion.id,
          title: linkedQuestion.content
        });
        feedbackTimerRef.current = window.setTimeout(() => {
          setLinkHint(null);
          feedbackTimerRef.current = null;
        }, 4000);
      }

      // Clear input but keep feedback visible for a moment
      setContent('');
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-[80vh] flex flex-col">
      <div className="flex-1 flex flex-col justify-center">
        <textarea
          className="w-full h-full bg-transparent text-xl leading-relaxed text-ink dark:text-ink-dark resize-none focus:outline-none placeholder:text-stone-500 dark:placeholder:text-stone-600 font-serif"
          placeholder={t('write_placeholder')}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (mergeCandidate) setMergeCandidate(null);
            if (linkHint) {
              setLinkHint(null);
              if (feedbackTimerRef.current) {
                window.clearTimeout(feedbackTimerRef.current);
                feedbackTimerRef.current = null;
              }
            }
          }}
          autoFocus
          disabled={isProcessing}
        />
      </div>

      <div className="h-20 flex items-center justify-between border-t border-stone-100 dark:border-stone-800 mt-4 pt-4">
        <div className="text-sm text-subtle dark:text-subtle-dark flex items-center gap-2">
           {isProcessing && !linkHint && !mergeCandidate && (
             <>
               <LoadingSpinner className="w-4 h-4 text-accent dark:text-accent-dark" />
               <span className="animate-pulse">{t('absorbing')}</span>
             </>
           )}
           {linkHint && (
             <div className="animate-fade-in text-ink dark:text-stone-200 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-md text-xs flex items-center gap-2">
               <span>{t('related_hint')} "{truncate(linkHint.title, 20)}".</span>
               <button
                 type="button"
                 onClick={() => navigate(`/question/${linkHint.questionId}`)}
                 className="px-2 py-0.5 rounded-full bg-ink text-white dark:bg-stone-600 hover:opacity-90 transition-opacity"
               >
                 {t('view_question')}
               </button>
             </div>
           )}
           {mergeCandidate && (
             <div className="animate-fade-in text-ink dark:text-stone-200 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-md text-xs space-y-2">
               <div>{t('merge_prompt')} "{truncate(mergeCandidate.relatedTitle, 20)}"</div>
               <div className="flex flex-wrap items-center gap-2 text-[11px] text-subtle dark:text-subtle-dark">
                 <button
                   type="button"
                   onClick={handleMerge}
                   className="px-2 py-0.5 rounded-full bg-ink text-white dark:bg-stone-600 hover:opacity-90 transition-opacity"
                 >
                   {t('merge_action')}
                 </button>
                 <button
                   type="button"
                   onClick={handleKeepSeparate}
                   className="px-2 py-0.5 rounded-full border border-stone-300 dark:border-stone-600 hover:border-stone-400 dark:hover:border-stone-500 transition-colors"
                 >
                   {t('separate_action')}
                 </button>
               </div>
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
