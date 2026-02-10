import { useCallback, useEffect, useState } from 'react';
import {
  getNoteById,
  getNotes,
  getQuestionConstellationStats,
  getQuestions,
  getRelatedNotes,
  subscribeToNoteEvents
} from '../../services/storageService';
import { Note, NoteType } from '../../types';
import type { QuestionConstellationStats } from '../../services/storageService';

interface QuestionDetailDataOptions {
  id?: string;
  locationKey: string;
  locationState: unknown;
}

export const useQuestionDetailData = ({
  id,
  locationKey,
  locationState
}: QuestionDetailDataOptions) => {
  const [question, setQuestion] = useState<Note | null>(null);
  const [relatedNotes, setRelatedNotes] = useState<Note[]>([]);
  const [stats, setStats] = useState<QuestionConstellationStats | null>(null);
  const [relationDensity, setRelationDensity] = useState<number | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<Note[]>([]);
  const [relinkQuestionId, setRelinkQuestionId] = useState<string | null>(null);
  const [pendingNoteId, setPendingNoteId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    const [related, q, statsResult, allNotes, questions] = await Promise.all([
      getRelatedNotes(id),
      getNoteById(id),
      getQuestionConstellationStats(id),
      getNotes(),
      getQuestions()
    ]);
    setRelatedNotes(related.sort((a, b) => b.createdAt - a.createdAt));
    setQuestion(q || null);
    setStats(statsResult);
    if (q) {
      const totalSinceQuestion = allNotes.filter(
        (note) => note.id !== q.id && note.createdAt >= q.createdAt
      ).length;
      setRelationDensity(
        totalSinceQuestion > 0 ? statsResult.relatedCount / totalSinceQuestion : null
      );
    } else {
      setRelationDensity(null);
    }
    const otherQuestions = questions
      .filter((note) => note.id !== id)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    setAvailableQuestions(otherQuestions);
    setRelinkQuestionId((prev) => {
      if (otherQuestions.length === 0) return null;
      if (prev && otherQuestions.some((note) => note.id === prev)) return prev;
      return otherQuestions[0].id;
    });
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const state = locationState as { pendingNoteId?: string } | null;
    setPendingNoteId(state?.pendingNoteId ?? null);
  }, [locationKey, locationState]);

  useEffect(() => {
    if (!pendingNoteId) return;
    const pendingNote = relatedNotes.find((note) => note.id === pendingNoteId);
    if (!pendingNote) return;
    if (pendingNote.type !== NoteType.UNCATEGORIZED) {
      setPendingNoteId(null);
    }
  }, [pendingNoteId, relatedNotes]);

  useEffect(() => {
    if (!pendingNoteId) return undefined;
    return subscribeToNoteEvents((event) => {
      if (event.id !== pendingNoteId) return;
      if (event.kind === 'deleted') {
        setPendingNoteId(null);
        return;
      }
      void loadData();
    });
  }, [pendingNoteId, loadData]);

  return {
    question,
    relatedNotes,
    stats,
    relationDensity,
    availableQuestions,
    relinkQuestionId,
    pendingNoteId,
    setQuestion,
    setRelatedNotes,
    setStats,
    setRelinkQuestionId,
    setPendingNoteId,
    loadData
  };
};
