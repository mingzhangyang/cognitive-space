import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useState } from 'react';
import { updateNoteContent } from '../../services/storageService';
import { Note } from '../../types';
import type { QuestionConstellationStats } from '../../services/storageService';
import { useCopyToClipboard } from '../useCopyToClipboard';

interface QuestionDetailEditingOptions {
  question: Note | null;
  relatedNotes: Note[];
  setQuestion: Dispatch<SetStateAction<Note | null>>;
  setRelatedNotes: Dispatch<SetStateAction<Note[]>>;
  setStats: Dispatch<SetStateAction<QuestionConstellationStats | null>>;
  loadData: () => Promise<void>;
  setMobileNoteActionsId: Dispatch<SetStateAction<string | null>>;
}

export const useQuestionDetailEditing = ({
  question,
  relatedNotes,
  setQuestion,
  setRelatedNotes,
  setStats,
  loadData,
  setMobileNoteActionsId
}: QuestionDetailEditingOptions) => {
  const { copyText } = useCopyToClipboard();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleEdit = useCallback((note: Note) => {
    if (isSavingEdit) return;
    setMobileNoteActionsId(null);
    setEditingId(note.id);
    setEditContent(note.content);
  }, [isSavingEdit, setMobileNoteActionsId]);

  const handleCopyNote = useCallback(async (content: string) => {
    if (!content) return;
    setMobileNoteActionsId(null);
    await copyText(content);
  }, [copyText, setMobileNoteActionsId]);

  const handleSaveEdit = useCallback(async () => {
    const trimmed = editContent.trim();
    if (!editingId || !trimmed || isSavingEdit) return;
    setIsSavingEdit(true);
    const optimisticUpdatedAt = Date.now();
    if (question && editingId === question.id) {
      setQuestion((prev) => (prev ? { ...prev, content: trimmed, updatedAt: optimisticUpdatedAt } : prev));
    } else {
      setRelatedNotes((prev) =>
        prev.map((note) =>
          note.id === editingId ? { ...note, content: trimmed, updatedAt: optimisticUpdatedAt } : note
        )
      );
      setStats((prev) => (prev
        ? { ...prev, lastUpdatedAt: Math.max(prev.lastUpdatedAt ?? 0, optimisticUpdatedAt) }
        : prev
      ));
    }

    try {
      await updateNoteContent(editingId, trimmed);
      setEditingId(null);
      setEditContent('');
      await loadData();
    } finally {
      setIsSavingEdit(false);
    }
  }, [editContent, editingId, isSavingEdit, loadData, question, setQuestion, setRelatedNotes, setStats]);

  const handleCancelEdit = useCallback(() => {
    if (isSavingEdit) return;
    setEditingId(null);
    setEditContent('');
  }, [isSavingEdit]);

  return {
    editingId,
    editContent,
    isSavingEdit,
    setEditContent,
    handleEdit,
    handleCopyNote,
    handleSaveEdit,
    handleCancelEdit
  };
};
