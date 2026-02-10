import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useState } from 'react';
import { updateNoteMeta } from '../../services/storageService';
import { Note } from '../../types';

interface QuestionDetailMoveOptions {
  availableQuestions: Note[];
  loadData: () => Promise<void>;
  setMobileNoteActionsId: Dispatch<SetStateAction<string | null>>;
}

export const useQuestionDetailMove = ({
  availableQuestions,
  loadData,
  setMobileNoteActionsId
}: QuestionDetailMoveOptions) => {
  const [moveNoteId, setMoveNoteId] = useState<string | null>(null);
  const [moveTargetQuestionId, setMoveTargetQuestionId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const openMoveToQuestion = useCallback((noteId: string) => {
    setMobileNoteActionsId(null);
    setMoveNoteId(noteId);
    setMoveTargetQuestionId(availableQuestions.length > 0 ? availableQuestions[0].id : null);
  }, [availableQuestions, setMobileNoteActionsId]);

  const handleConfirmMove = useCallback(async () => {
    if (!moveNoteId || !moveTargetQuestionId || isMoving) return;
    setIsMoving(true);
    try {
      await updateNoteMeta(moveNoteId, { parentId: moveTargetQuestionId });
      setMoveNoteId(null);
      setMoveTargetQuestionId(null);
      await loadData();
    } finally {
      setIsMoving(false);
    }
  }, [isMoving, loadData, moveNoteId, moveTargetQuestionId]);

  return {
    moveNoteId,
    moveTargetQuestionId,
    isMoving,
    setMoveNoteId,
    setMoveTargetQuestionId,
    openMoveToQuestion,
    handleConfirmMove
  };
};
