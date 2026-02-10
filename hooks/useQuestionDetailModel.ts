import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  deleteNote,
  demoteQuestion,
  getNoteById,
  getNotes,
  getQuestionConstellationStats,
  getQuestions,
  getRelatedNotes,
  saveNote,
  subscribeToNoteEvents,
  updateNoteContent,
  updateNoteMeta
} from '../services/storageService';
import { Note, NoteType } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useCopyToClipboard } from './useCopyToClipboard';
import type { QuestionConstellationStats } from '../services/storageService';

export const useQuestionDetailModel = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useAppContext();
  const { copyText } = useCopyToClipboard();
  const { notify } = useNotifications();

  const [question, setQuestion] = useState<Note | null>(null);
  const [relatedNotes, setRelatedNotes] = useState<Note[]>([]);
  const [visualizationOpen, setVisualizationOpen] = useState(false);
  const [selectedGraphNote, setSelectedGraphNote] = useState<Note | null>(null);
  const [stats, setStats] = useState<QuestionConstellationStats | null>(null);
  const [relationDensity, setRelationDensity] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDowngrading, setIsDowngrading] = useState(false);
  const [isDowngradeOpen, setIsDowngradeOpen] = useState(false);
  const [downgradeType, setDowngradeType] = useState<NoteType>(NoteType.UNCATEGORIZED);
  const [downgradeDestination, setDowngradeDestination] = useState<'release' | 'relink'>('release');
  const [availableQuestions, setAvailableQuestions] = useState<Note[]>([]);
  const [relinkQuestionId, setRelinkQuestionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; isQuestion: boolean } | null>(null);
  const [mobileNoteActionsId, setMobileNoteActionsId] = useState<string | null>(null);
  const [pendingNoteId, setPendingNoteId] = useState<string | null>(null);

  const downgradeOptions = useMemo(
    () => [NoteType.UNCATEGORIZED, NoteType.TRIGGER, NoteType.CLAIM, NoteType.EVIDENCE],
    []
  );

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleSection = useCallback((key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const [sectionOrder, setSectionOrder] = useState<Record<string, string[]>>({});
  const dragItem = useRef<{ noteId: string; sectionKey: string } | null>(null);
  const dragOverItem = useRef<{ noteId: string; sectionKey: string } | null>(null);

  const [moveNoteId, setMoveNoteId] = useState<string | null>(null);
  const [moveTargetQuestionId, setMoveTargetQuestionId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

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
    const state = location.state as { pendingNoteId?: string } | null;
    setPendingNoteId(state?.pendingNoteId ?? null);
  }, [location.key]);

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

  const handleEdit = useCallback((note: Note) => {
    if (isSavingEdit) return;
    setMobileNoteActionsId(null);
    setEditingId(note.id);
    setEditContent(note.content);
  }, [isSavingEdit]);

  const handleCopyNote = useCallback(async (content: string) => {
    if (!content) return;
    setMobileNoteActionsId(null);
    await copyText(content);
  }, [copyText]);

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
  }, [editContent, editingId, isSavingEdit, loadData, question]);

  const handleCancelEdit = useCallback(() => {
    if (isSavingEdit) return;
    setEditingId(null);
    setEditContent('');
  }, [isSavingEdit]);

  const handleDelete = useCallback(async (noteId: string, isQuestion: boolean) => {
    setMobileNoteActionsId(null);
    if (isQuestion) {
      setDeleteTarget({ id: noteId, isQuestion: true });
      return;
    }
    const note = relatedNotes.find((n) => n.id === noteId);
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
  }, [loadData, notify, relatedNotes, t]);

  const openMoveToQuestion = useCallback((noteId: string) => {
    setMobileNoteActionsId(null);
    setMoveNoteId(noteId);
    setMoveTargetQuestionId(availableQuestions.length > 0 ? availableQuestions[0].id : null);
  }, [availableQuestions]);

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

  const getOrderedNotes = useCallback((sectionKey: string, notes: Note[]): Note[] => {
    const order = sectionOrder[sectionKey];
    if (!order) return notes;
    const noteMap = new Map(notes.map((n) => [n.id, n]));
    const ordered: Note[] = [];
    for (const noteId of order) {
      const note = noteMap.get(noteId);
      if (note) {
        ordered.push(note);
        noteMap.delete(noteId);
      }
    }
    for (const note of noteMap.values()) ordered.push(note);
    return ordered;
  }, [sectionOrder]);

  const handleDragStart = useCallback((noteId: string, sectionKey: string) => {
    dragItem.current = { noteId, sectionKey };
  }, []);

  const handleDragEnter = useCallback((noteId: string, sectionKey: string) => {
    dragOverItem.current = { noteId, sectionKey };
  }, []);

  const handleDragEnd = useCallback((sectionKey: string, notes: Note[]) => {
    if (!dragItem.current || !dragOverItem.current) return;
    if (dragItem.current.sectionKey !== dragOverItem.current.sectionKey) return;
    const ordered = getOrderedNotes(sectionKey, notes).map((n) => n.id);
    const fromIndex = ordered.indexOf(dragItem.current.noteId);
    const toIndex = ordered.indexOf(dragOverItem.current.noteId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
    const next = [...ordered];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setSectionOrder((prev) => ({ ...prev, [sectionKey]: next }));
    dragItem.current = null;
    dragOverItem.current = null;
  }, [getOrderedNotes]);

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
        navigate('/dark-matter');
      }
    } finally {
      setIsDowngrading(false);
    }
  }, [downgradeDestination, downgradeType, isDowngrading, navigate, question, relinkQuestionId]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteNote(deleteTarget.id);
    navigate('/');
    setDeleteTarget(null);
  }, [deleteTarget, navigate]);

  useEffect(() => {
    if (!selectedGraphNote) return;
    const updated = relatedNotes.find((note) => note.id === selectedGraphNote.id) || null;
    setSelectedGraphNote(updated);
  }, [relatedNotes, selectedGraphNote]);

  const claims = useMemo(
    () => relatedNotes.filter((note) => note.type === NoteType.CLAIM),
    [relatedNotes]
  );
  const evidence = useMemo(
    () => relatedNotes.filter((note) => note.type === NoteType.EVIDENCE),
    [relatedNotes]
  );
  const triggers = useMemo(
    () => relatedNotes.filter((note) => note.type === NoteType.TRIGGER),
    [relatedNotes]
  );
  const otherNotes = useMemo(
    () => relatedNotes.filter(
      (note) => ![NoteType.CLAIM, NoteType.EVIDENCE, NoteType.TRIGGER].includes(note.type)
    ),
    [relatedNotes]
  );

  return {
    t,
    id,
    question,
    relatedNotes,
    visualizationOpen,
    selectedGraphNote,
    stats,
    relationDensity,
    editingId,
    editContent,
    isSavingEdit,
    isDowngrading,
    isDowngradeOpen,
    downgradeType,
    downgradeDestination,
    availableQuestions,
    relinkQuestionId,
    deleteTarget,
    mobileNoteActionsId,
    pendingNoteId,
    collapsedSections,
    sectionOrder,
    moveNoteId,
    moveTargetQuestionId,
    isMoving,
    downgradeOptions,
    claims,
    evidence,
    triggers,
    otherNotes,
    setVisualizationOpen,
    setSelectedGraphNote,
    setEditContent,
    setIsDowngradeOpen,
    setDowngradeType,
    setDowngradeDestination,
    setRelinkQuestionId,
    setDeleteTarget,
    setMobileNoteActionsId,
    setPendingNoteId,
    setSectionOrder,
    setMoveNoteId,
    setMoveTargetQuestionId,
    toggleSection,
    loadData,
    handleEdit,
    handleCopyNote,
    handleSaveEdit,
    handleCancelEdit,
    handleDelete,
    openMoveToQuestion,
    handleConfirmMove,
    getOrderedNotes,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    openDowngrade,
    handleConfirmDowngrade,
    confirmDelete
  };
};
