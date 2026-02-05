import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createNoteObject, saveNote, getQuestions, updateNoteMeta } from '../services/storageService';
import { analyzeText } from '../services/aiService';
import { NoteType } from '../types';
import { LoadingSpinner } from '../components/Icons';
import { useAppContext } from '../contexts/AppContext';
import { useAssistantInbox } from '../contexts/AssistantInboxContext';

const Write: React.FC = () => {
  const [content, setContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { t, language } = useAppContext();
  const { createJob, removeJob, addMessage } = useAssistantInbox();
  const navigate = useNavigate();
  const location = useLocation();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const castIdRef = useRef<number>(0); // Track current cast to ignore stale AI results
  const isMountedRef = useRef<boolean>(true); // Track mount state for cleanup
  const streamQuestionId = (() => {
    const searchParams = new URLSearchParams(location.search);
    const fromSearch = searchParams.get('questionId') || undefined;
    const fromState = (location.state as { questionId?: string } | null)?.questionId;
    return fromState || fromSearch;
  })();

  // Auto-focus logic or simple textarea
  const truncate = (text: string, max = 24) => (text.length > max ? `${text.slice(0, max)}...` : text);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Auto-grow textarea based on content, up to available viewport height
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    // Calculate max height from viewport minus fixed elements:
    // header (~80px) + footer margin/padding (~100px) + bottom controls (~100px) + some buffer
    const fixedHeight = 280;
    const maxHeight = Math.max(window.innerHeight - fixedHeight, 150);

    // Temporarily shrink to measure true content height
    ta.style.height = '0px';
    const scrollH = ta.scrollHeight;
    
    // Set height: grow with content up to max, then cap and show scrollbar
    if (scrollH <= maxHeight) {
      ta.style.height = `${scrollH}px`;
      ta.style.overflowY = 'hidden';
    } else {
      ta.style.height = `${maxHeight}px`;
      ta.style.overflowY = 'auto';
    }
  }, [content]);

  // Recalculate on window resize
  useEffect(() => {
    const handleResize = () => {
      const ta = textareaRef.current;
      if (!ta) return;
      
      const fixedHeight = 280;
      const maxHeight = Math.max(window.innerHeight - fixedHeight, 150);
      
      ta.style.height = '0px';
      const scrollH = ta.scrollHeight;
      
      if (scrollH <= maxHeight) {
        ta.style.height = `${scrollH}px`;
        ta.style.overflowY = 'hidden';
      } else {
        ta.style.height = `${maxHeight}px`;
        ta.style.overflowY = 'auto';
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [content]);

  const createMessageId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  };

  const handleSave = async () => {
    if (!content.trim()) return;

    // Increment castId to invalidate any pending AI results from previous casts
    const currentCastId = ++castIdRef.current;

    setIsProcessing(true);
    // Note: Each cast's 2s delay runs independently (not canceled by newer casts)
    // so every async chain completes and updateNoteMeta runs for all notes.

    // 1. Create and save the note immediately with default type
    const newNote = createNoteObject(content.trim());
    newNote.analysisPending = true;
    if (streamQuestionId) {
      newNote.parentId = streamQuestionId;
    }
    const savedContent = content.trim();
    
    try {
      // Save immediately with default values
      await saveNote(newNote);
    } catch (error) {
      console.error("Error saving note:", error);
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
      return;
    }

    // 2. Show "Absorbing" for minimum 2 seconds, then clear input
    const minDelayPromise = new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. Start AI analysis in parallel
    const jobId = createJob('note_analysis', { notePreview: truncate(savedContent, 120) });
    const aiAnalysisPromise = (async () => {
      try {
        const existingQuestions = await getQuestions();
        const analysis = await analyzeText(savedContent, existingQuestions, language);
        return { analysis, existingQuestions };
      } catch (error) {
        console.error("AI analysis failed:", error);
        return null;
      }
    })();

    // Wait for minimum delay before clearing input
    await minDelayPromise;
    if (streamQuestionId) {
      navigate(`/question/${streamQuestionId}`, { state: { pendingNoteId: newNote.id }, replace: true });
    } else if (isMountedRef.current && castIdRef.current === currentCastId) {
      // UI updates: only if component is still mounted and this is the current cast
      setContent('');
      setIsProcessing(false);
    }

    // 4. Process AI results in background when they arrive
    const aiResult = await aiAnalysisPromise;
    
    removeJob(jobId);

    if (!aiResult) {
      try {
        await updateNoteMeta(newNote.id, { analysisPending: false });
      } catch (error) {
        console.error("Error clearing analysis pending state:", error);
      }
      return;
    }

    const { analysis, existingQuestions } = aiResult;

    // 5. Update note with AI results (always update, regardless of newer casts)
    const isQuestion = analysis.classification === NoteType.QUESTION;
    const relatedQuestionId = analysis.relatedQuestionId || undefined;
    const linkedQuestion = relatedQuestionId
      ? existingQuestions.find(q => q.id === relatedQuestionId)
      : undefined;
    const parentIdForUpdate = streamQuestionId || ((!isQuestion && relatedQuestionId) ? relatedQuestionId : undefined);

    try {
      await updateNoteMeta(newNote.id, { analysisPending: false });
    } catch (error) {
      console.error("Error updating note metadata:", error);
    }

    const updates: {
      type: NoteType;
      subType?: string;
      confidence?: number;
      parentId?: string | null;
    } = {
      type: analysis.classification,
      subType: analysis.subType,
      confidence: analysis.confidence
    };
    if (typeof parentIdForUpdate !== 'undefined') {
      updates.parentId = parentIdForUpdate;
    }

    addMessage({
      id: createMessageId(),
      kind: 'note_suggestion',
      title: t('assistant_suggestion_note'),
      createdAt: Date.now(),
      payload: {
        noteId: newNote.id,
        notePreview: truncate(savedContent, 120),
        updates,
        classification: analysis.classification,
        subType: analysis.subType,
        confidence: analysis.confidence,
        relatedQuestionId: analysis.relatedQuestionId ?? null,
        relatedQuestionTitle: linkedQuestion?.content,
        reasoning: analysis.reasoning
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col pt-2">
        <textarea
          ref={textareaRef}
          className="w-full bg-transparent text-lg sm:text-xl leading-relaxed text-ink dark:text-ink-dark resize-none focus:outline-none placeholder:text-muted-500 dark:placeholder:text-muted-500 font-serif"
          placeholder={t('write_placeholder')}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
          }}
          autoFocus
          disabled={isProcessing}
        />
      </div>

      <div className="min-h-[4.5rem] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-line-soft dark:border-line-dark mt-4 pt-4">
        <div className="text-body-sm-muted flex items-center gap-2 w-full sm:w-auto">
           {isProcessing && (
             <>
               <LoadingSpinner className="w-4 h-4 text-accent dark:text-accent-dark" />
               <span className="animate-pulse">{t('absorbing')}</span>
             </>
           )}
        </div>

        <button
          onClick={handleSave}
          disabled={!content.trim() || isProcessing}
          className={`w-full sm:w-auto px-6 py-3 min-h-11 rounded-full font-medium transition-all ${
            content.trim() && !isProcessing
              ? 'bg-action dark:bg-action text-white hover:bg-action-hover dark:hover:bg-action-hover-dark shadow-md'
              : 'bg-line dark:bg-surface-hover-dark text-muted-400 dark:text-muted-500 cursor-not-allowed'
          }`}
        >
          {isProcessing ? t('saving') : t('cast')}
        </button>
      </div>
    </div>
  );
};

export default Write;
