import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Note, NoteType } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { useQuestionDetailData } from './questionDetail/useQuestionDetailData';
import { useQuestionDetailSections } from './questionDetail/useQuestionDetailSections';
import { useQuestionDetailEditing } from './questionDetail/useQuestionDetailEditing';
import { useQuestionDetailDelete } from './questionDetail/useQuestionDetailDelete';
import { useQuestionDetailMove } from './questionDetail/useQuestionDetailMove';
import { useQuestionDetailDowngrade } from './questionDetail/useQuestionDetailDowngrade';

export const useQuestionDetailModel = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useAppContext();

  const [visualizationOpen, setVisualizationOpen] = useState(false);
  const [selectedGraphNote, setSelectedGraphNote] = useState<Note | null>(null);
  const [mobileNoteActionsId, setMobileNoteActionsId] = useState<string | null>(null);

  const data = useQuestionDetailData({
    id,
    locationKey: location.key,
    locationState: location.state
  });

  const sections = useQuestionDetailSections();

  const editing = useQuestionDetailEditing({
    question: data.question,
    relatedNotes: data.relatedNotes,
    setQuestion: data.setQuestion,
    setRelatedNotes: data.setRelatedNotes,
    setStats: data.setStats,
    loadData: data.loadData,
    setMobileNoteActionsId
  });

  const deletion = useQuestionDetailDelete({
    t,
    relatedNotes: data.relatedNotes,
    loadData: data.loadData,
    navigate,
    setMobileNoteActionsId
  });

  const move = useQuestionDetailMove({
    availableQuestions: data.availableQuestions,
    loadData: data.loadData,
    setMobileNoteActionsId
  });

  const downgrade = useQuestionDetailDowngrade({
    question: data.question,
    relinkQuestionId: data.relinkQuestionId,
    navigate
  });

  useEffect(() => {
    if (!selectedGraphNote) return;
    const updated = data.relatedNotes.find((note) => note.id === selectedGraphNote.id) || null;
    setSelectedGraphNote(updated);
  }, [data.relatedNotes, selectedGraphNote]);

  const claims = useMemo(
    () => data.relatedNotes.filter((note) => note.type === NoteType.CLAIM),
    [data.relatedNotes]
  );
  const evidence = useMemo(
    () => data.relatedNotes.filter((note) => note.type === NoteType.EVIDENCE),
    [data.relatedNotes]
  );
  const triggers = useMemo(
    () => data.relatedNotes.filter((note) => note.type === NoteType.TRIGGER),
    [data.relatedNotes]
  );
  const otherNotes = useMemo(
    () => data.relatedNotes.filter(
      (note) => ![NoteType.CLAIM, NoteType.EVIDENCE, NoteType.TRIGGER].includes(note.type)
    ),
    [data.relatedNotes]
  );

  return {
    t,
    id,
    question: data.question,
    relatedNotes: data.relatedNotes,
    visualizationOpen,
    selectedGraphNote,
    stats: data.stats,
    relationDensity: data.relationDensity,
    editingId: editing.editingId,
    editContent: editing.editContent,
    isSavingEdit: editing.isSavingEdit,
    isDowngrading: downgrade.isDowngrading,
    isDowngradeOpen: downgrade.isDowngradeOpen,
    downgradeType: downgrade.downgradeType,
    downgradeDestination: downgrade.downgradeDestination,
    availableQuestions: data.availableQuestions,
    relinkQuestionId: data.relinkQuestionId,
    deleteTarget: deletion.deleteTarget,
    mobileNoteActionsId,
    pendingNoteId: data.pendingNoteId,
    collapsedSections: sections.collapsedSections,
    sectionOrder: sections.sectionOrder,
    moveNoteId: move.moveNoteId,
    moveTargetQuestionId: move.moveTargetQuestionId,
    isMoving: move.isMoving,
    downgradeOptions: downgrade.downgradeOptions,
    claims,
    evidence,
    triggers,
    otherNotes,
    setVisualizationOpen,
    setSelectedGraphNote,
    setEditContent: editing.setEditContent,
    setIsDowngradeOpen: downgrade.setIsDowngradeOpen,
    setDowngradeType: downgrade.setDowngradeType,
    setDowngradeDestination: downgrade.setDowngradeDestination,
    setRelinkQuestionId: data.setRelinkQuestionId,
    setDeleteTarget: deletion.setDeleteTarget,
    setMobileNoteActionsId,
    setPendingNoteId: data.setPendingNoteId,
    setSectionOrder: sections.setSectionOrder,
    setMoveNoteId: move.setMoveNoteId,
    setMoveTargetQuestionId: move.setMoveTargetQuestionId,
    toggleSection: sections.toggleSection,
    loadData: data.loadData,
    handleEdit: editing.handleEdit,
    handleCopyNote: editing.handleCopyNote,
    handleSaveEdit: editing.handleSaveEdit,
    handleCancelEdit: editing.handleCancelEdit,
    handleDelete: deletion.handleDelete,
    openMoveToQuestion: move.openMoveToQuestion,
    handleConfirmMove: move.handleConfirmMove,
    getOrderedNotes: sections.getOrderedNotes,
    handleDragStart: sections.handleDragStart,
    handleDragEnter: sections.handleDragEnter,
    handleDragEnd: sections.handleDragEnd,
    openDowngrade: downgrade.openDowngrade,
    handleConfirmDowngrade: downgrade.handleConfirmDowngrade,
    confirmDelete: deletion.confirmDelete
  };
};
