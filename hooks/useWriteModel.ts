import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { analyzeText } from '../services/aiService';
import { createNoteObject, getQuestions, saveNote, updateNoteMeta } from '../services/storageService';
import { AnalysisResult, NoteType } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { useAssistantInbox } from '../contexts/AssistantInboxContext';
import { createMessageId } from '../utils/ids';
import { truncate } from '../utils/text';
import { renderSimpleMarkdown } from '../utils/markdown';

export const useWriteModel = () => {
  const [content, setContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [castSuccess, setCastSuccess] = useState(false);
  const { t, language } = useAppContext();
  const { createJob, removeJob, addMessage } = useAssistantInbox();
  const navigate = useNavigate();
  const location = useLocation();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const castIdRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  const streamQuestionId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const fromSearch = searchParams.get('questionId') || undefined;
    const fromState = (location.state as { questionId?: string } | null)?.questionId;
    return fromState || fromSearch;
  }, [location.search, location.state]);

  const charCount = content.length;
  const wordCount = useMemo(() => {
    const trimmed = content.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }, [content]);
  const showCounter = charCount >= 50;
  const showPreviewToggle = wordCount >= 300;

  useEffect(() => {
    if (!showPreviewToggle) setShowPreview(false);
  }, [showPreviewToggle]);

  const previewHtml = useMemo(() => {
    if (!showPreview) return '';
    return renderSimpleMarkdown(content);
  }, [showPreview, content]);

  const handleTogglePreview = useCallback(() => {
    setShowPreview((prev) => !prev);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const fixedHeight = 280;
    const maxHeight = Math.max(window.innerHeight - fixedHeight, 150);

    textarea.style.height = '0px';
    const scrollHeight = textarea.scrollHeight;

    if (scrollHeight <= maxHeight) {
      textarea.style.height = `${scrollHeight}px`;
      textarea.style.overflowY = 'hidden';
    } else {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'auto';
    }
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [content, resizeTextarea]);

  useEffect(() => {
    window.addEventListener('resize', resizeTextarea);
    return () => window.removeEventListener('resize', resizeTextarea);
  }, [resizeTextarea]);

  const handleSave = useCallback(async () => {
    if (!content.trim()) return;

    const currentCastId = ++castIdRef.current;

    setIsProcessing(true);

    const newNote = createNoteObject(content.trim());
    newNote.analysisPending = true;
    if (streamQuestionId) {
      newNote.parentId = streamQuestionId;
    }
    const savedContent = content.trim();

    try {
      await saveNote(newNote);
    } catch (error) {
      console.error('Error saving note:', error);
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
      return;
    }

    const minDelayPromise = new Promise((resolve) => setTimeout(resolve, 2000));

    const jobId = createJob('note_analysis', { notePreview: truncate(savedContent, 120) });
    const aiAnalysisPromise = (async () => {
      try {
        const existingQuestions = await getQuestions();
        const analysis = await analyzeText(savedContent, existingQuestions, language);
        return { analysis, existingQuestions };
      } catch (error) {
        console.error('AI analysis failed:', error);
        return null;
      }
    })();

    await minDelayPromise;
    if (streamQuestionId) {
      navigate(`/question/${streamQuestionId}`, { state: { pendingNoteId: newNote.id }, replace: true });
    } else if (isMountedRef.current && castIdRef.current === currentCastId) {
      setContent('');
      setIsProcessing(false);
      setShowPreview(false);
      setCastSuccess(true);
      setTimeout(() => {
        if (isMountedRef.current) setCastSuccess(false);
      }, 1500);
    }

    const aiResult = await aiAnalysisPromise;

    removeJob(jobId);

    const clearAnalysisPending = async () => {
      try {
        await updateNoteMeta(newNote.id, { analysisPending: false });
      } catch (error) {
        console.error('Error clearing analysis pending state:', error);
      }
    };

    await clearAnalysisPending();

    if (!aiResult) {
      return;
    }

    const { analysis, existingQuestions } = aiResult;

    const isQuestion = analysis.classification === NoteType.QUESTION;
    const relatedQuestionId = analysis.relatedQuestionId || undefined;
    const linkedQuestion = relatedQuestionId
      ? existingQuestions.find((question) => question.id === relatedQuestionId)
      : undefined;
    const parentIdForUpdate = streamQuestionId || ((!isQuestion && relatedQuestionId) ? relatedQuestionId : undefined);

    const updates: {
      type: NoteType;
      subType?: string;
      confidenceLabel?: AnalysisResult['confidenceLabel'];
      parentId?: string | null;
    } = {
      type: analysis.classification,
      subType: analysis.subType,
      confidenceLabel: analysis.confidenceLabel
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
        confidenceLabel: analysis.confidenceLabel,
        relatedQuestionId: analysis.relatedQuestionId ?? null,
        relatedQuestionTitle: linkedQuestion?.content,
        reasoning: analysis.reasoning
      }
    });
  }, [
    addMessage,
    content,
    createJob,
    language,
    navigate,
    removeJob,
    streamQuestionId,
    t
  ]);

  return {
    t,
    content,
    setContent,
    isProcessing,
    showPreview,
    castSuccess,
    previewHtml,
    charCount,
    wordCount,
    showCounter,
    showPreviewToggle,
    handleTogglePreview,
    handleSave,
    textareaRef
  };
};
