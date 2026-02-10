import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useState } from 'react';
import { deleteNote, saveNote } from '../../services/storageService';
import { Note } from '../../types';
import { useNotifications } from '../../contexts/NotificationContext';
import type { TranslationKey } from '../../contexts/translations';

interface QuestionDetailDeleteOptions {
  t: (key: TranslationKey) => string;
  relatedNotes: Note[];
  loadData: () => Promise<void>;
  navigate: (path: string) => void;
  setMobileNoteActionsId: Dispatch<SetStateAction<string | null>>;
}

export const useQuestionDetailDelete = ({
  t,
  relatedNotes,
  loadData,
  navigate,
  setMobileNoteActionsId
}: QuestionDetailDeleteOptions) => {
  const { notify } = useNotifications();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; isQuestion: boolean } | null>(null);

  const handleDelete = useCallback(async (noteId: string, isQuestion: boolean) => {
    setMobileNoteActionsId(null);
    if (isQuestion) {
      setDeleteTarget({ id: noteId, isQuestion: true });
      return;
    }
    const note = relatedNotes.find((item) => item.id === noteId);
    if (!note) return;
    const savedNote = { ...note };
    await deleteNote(noteId);
    void loadData();
    notify({
      message: t('note_deleted'),
      variant: 'info',
      duration: 5000,
      action: {
        label: t('undo'),
        onClick: () => {
          void (async () => {
            await saveNote(savedNote);
            void loadData();
          })();
        },
      },
    });
  }, [loadData, notify, relatedNotes, setMobileNoteActionsId, t]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteNote(deleteTarget.id);
    navigate('/');
    setDeleteTarget(null);
  }, [deleteTarget, navigate]);

  return {
    deleteTarget,
    setDeleteTarget,
    handleDelete,
    confirmDelete
  };
};
