import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { demoteQuestion } from '../../services/storageService';
import { Note, NoteType } from '../../types';

interface QuestionDetailDowngradeOptions {
  question: Note | null;
  relinkQuestionId: string | null;
  navigate: ReturnType<typeof useNavigate>;
}

export const useQuestionDetailDowngrade = ({
  question,
  relinkQuestionId,
  navigate
}: QuestionDetailDowngradeOptions) => {
  const [isDowngrading, setIsDowngrading] = useState(false);
  const [isDowngradeOpen, setIsDowngradeOpen] = useState(false);
  const [downgradeType, setDowngradeType] = useState<NoteType>(NoteType.UNCATEGORIZED);
  const [downgradeDestination, setDowngradeDestination] = useState<'release' | 'relink'>('release');

  const downgradeOptions = useMemo(
    () => [NoteType.UNCATEGORIZED, NoteType.TRIGGER, NoteType.CLAIM, NoteType.EVIDENCE],
    []
  );

  const openDowngrade = useCallback(() => {
    setDowngradeType(NoteType.UNCATEGORIZED);
    setDowngradeDestination('release');
    setIsDowngradeOpen(true);
  }, []);

  const handleConfirmDowngrade = useCallback(async () => {
    if (!question || isDowngrading) return;
    const shouldRelink = downgradeDestination === 'relink' && relinkQuestionId;
    if (downgradeDestination === 'relink' && !relinkQuestionId) return;
    setIsDowngrading(true);
    try {
      await demoteQuestion(
        question.id,
        downgradeType,
        shouldRelink
          ? { relinkQuestionId, includeSelf: true }
          : undefined
      );
      setIsDowngradeOpen(false);
      if (shouldRelink) {
        navigate(`/question/${relinkQuestionId}`);
      } else {
        navigate('/wandering-planet');
      }
    } finally {
      setIsDowngrading(false);
    }
  }, [downgradeDestination, downgradeType, isDowngrading, navigate, question, relinkQuestionId]);

  return {
    isDowngrading,
    isDowngradeOpen,
    downgradeType,
    downgradeDestination,
    downgradeOptions,
    setIsDowngradeOpen,
    setDowngradeType,
    setDowngradeDestination,
    openDowngrade,
    handleConfirmDowngrade
  };
};
