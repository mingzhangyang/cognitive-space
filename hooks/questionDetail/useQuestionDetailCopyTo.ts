import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useState } from 'react';
import { saveNote } from '../../services/storageService';
import { Note } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { useNotifications } from '../../contexts/NotificationContext';

interface QuestionDetailCopyToOptions {
  availableQuestions: Note[];
  relatedNotes: Note[];
  loadData: () => Promise<void>;
  setMobileNoteActionsId: Dispatch<SetStateAction<string | null>>;
}

export const useQuestionDetailCopyTo = ({
  availableQuestions,
  relatedNotes,
  loadData,
  setMobileNoteActionsId
}: QuestionDetailCopyToOptions) => {
  const { t } = useAppContext();
  const { notify } = useNotifications();
  const [copyNoteId, setCopyNoteId] = useState<string | null>(null);
  const [copyTargetQuestionId, setCopyTargetQuestionId] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  const openCopyToQuestion = useCallback((noteId: string) => {
    setMobileNoteActionsId(null);
    setCopyNoteId(noteId);
    setCopyTargetQuestionId(availableQuestions.length > 0 ? availableQuestions[0].id : null);
  }, [availableQuestions, setMobileNoteActionsId]);

  const handleConfirmCopy = useCallback(async () => {
    if (!copyNoteId || !copyTargetQuestionId || isCopying) return;
    const sourceNote = relatedNotes.find((note) => note.id === copyNoteId);
    if (!sourceNote) {
      setCopyNoteId(null);
      setCopyTargetQuestionId(null);
      return;
    }
    setIsCopying(true);
    try {
      const now = Date.now();
      const duplicatedNote: Note = {
        ...sourceNote,
        id: crypto.randomUUID(),
        parentId: copyTargetQuestionId,
        createdAt: now,
        updatedAt: now,
        analysisPending: false
      };
      await saveNote(duplicatedNote);
      notify({
        message: t('copy_to_question_success'),
        variant: 'success',
        duration: 2000
      });
      setCopyNoteId(null);
      setCopyTargetQuestionId(null);
      await loadData();
    } finally {
      setIsCopying(false);
    }
  }, [copyNoteId, copyTargetQuestionId, isCopying, loadData, notify, relatedNotes, t]);

  return {
    copyNoteId,
    copyTargetQuestionId,
    isCopying,
    setCopyNoteId,
    setCopyTargetQuestionId,
    openCopyToQuestion,
    handleConfirmCopy
  };
};
