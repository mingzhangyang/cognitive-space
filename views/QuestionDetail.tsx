import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  getNoteById,
  getNotes,
  getRelatedNotes,
  getQuestions,
  deleteNote,
  saveNote,
  demoteQuestion,
  updateNoteContent,
  updateNoteMeta,
  getQuestionConstellationStats,
  QuestionConstellationStats,
  subscribeToNoteEvents
} from '../services/storageService';
import { Note, NoteType } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { useNotifications } from '../contexts/NotificationContext';
import { CheckIcon, XIcon, EyeIcon, EyeOffIcon, LoadingSpinner, MoreIcon, ArrowDownIcon, EditIcon, ChevronDownIcon, GripVerticalIcon, MoveIcon } from '../components/Icons';
import ActionIconButton from '../components/ActionIconButton';
import ActionSheetButton from '../components/ActionSheetButton';
import ConfirmDialog from '../components/ConfirmDialog';
import IconButton from '../components/IconButton';
import MobileActionSheet from '../components/MobileActionSheet';
import TypeBadge from '../components/TypeBadge';
import QuestionGraph from '../components/QuestionGraph';
import QuestionStatsPanel from '../components/QuestionStatsPanel';
import Tooltip from '../components/Tooltip';
import QuestionDowngradeDialog from '../components/QuestionDowngradeDialog';
import MoveToQuestionModal from '../components/MoveToQuestionModal';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

const QuestionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
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
  const { t } = useAppContext();
  const { copyText } = useCopyToClipboard();
  const { notify } = useNotifications();
  const downgradeOptions = [NoteType.UNCATEGORIZED, NoteType.TRIGGER, NoteType.CLAIM, NoteType.EVIDENCE];

  // Collapsible sections state (default: all open)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) => setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Drag-to-reorder state per section
  const [sectionOrder, setSectionOrder] = useState<Record<string, string[]>>({});
  const dragItem = useRef<{ noteId: string; sectionKey: string } | null>(null);
  const dragOverItem = useRef<{ noteId: string; sectionKey: string } | null>(null);

  // Move-to-question state
  const [moveNoteId, setMoveNoteId] = useState<string | null>(null);
  const [moveTargetQuestionId, setMoveTargetQuestionId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const loadData = useCallback(async () => {
    if (id) {
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
    }
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

  const handleEdit = (note: Note) => {
    if (isSavingEdit) return;
    setMobileNoteActionsId(null);
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleCopyNote = async (content: string) => {
    if (!content) return;
    setMobileNoteActionsId(null);
    await copyText(content);
  };

  const handleSaveEdit = async () => {
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
  };

  const handleCancelEdit = () => {
    if (isSavingEdit) return;
    setEditingId(null);
    setEditContent('');
  };

  const handleDelete = async (noteId: string, isQuestion: boolean) => {
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
  };

  const openMoveToQuestion = (noteId: string) => {
    setMobileNoteActionsId(null);
    setMoveNoteId(noteId);
    setMoveTargetQuestionId(availableQuestions.length > 0 ? availableQuestions[0].id : null);
  };

  const handleConfirmMove = async () => {
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
  };

  // --- Drag-to-reorder helpers ---
  const getOrderedNotes = (sectionKey: string, notes: Note[]): Note[] => {
    const order = sectionOrder[sectionKey];
    if (!order) return notes;
    const noteMap = new Map(notes.map((n) => [n.id, n]));
    const ordered: Note[] = [];
    for (const id of order) {
      const n = noteMap.get(id);
      if (n) {
        ordered.push(n);
        noteMap.delete(id);
      }
    }
    // Append any new notes not yet ordered
    for (const n of noteMap.values()) ordered.push(n);
    return ordered;
  };

  const handleDragStart = (noteId: string, sectionKey: string) => {
    dragItem.current = { noteId, sectionKey };
  };

  const handleDragEnter = (noteId: string, sectionKey: string) => {
    dragOverItem.current = { noteId, sectionKey };
  };

  const handleDragEnd = (sectionKey: string, notes: Note[]) => {
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
  };

  const openDowngrade = () => {
    setDowngradeType(NoteType.UNCATEGORIZED);
    setDowngradeDestination('release');
    setIsDowngradeOpen(true);
  };

  const handleConfirmDowngrade = async () => {
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
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await deleteNote(deleteTarget.id);
      navigate('/');
      setDeleteTarget(null);
    }
  };

  useEffect(() => {
    if (!selectedGraphNote) return;
    const updated = relatedNotes.find((note) => note.id === selectedGraphNote.id) || null;
    setSelectedGraphNote(updated);
  }, [relatedNotes, selectedGraphNote]);

  if (!question) {
    return <div className="p-8 text-center text-subtle dark:text-subtle-dark">{t('problem_not_found')}</div>;
  }

  const claims = relatedNotes.filter((note) => note.type === NoteType.CLAIM);
  const evidence = relatedNotes.filter((note) => note.type === NoteType.EVIDENCE);
  const triggers = relatedNotes.filter((note) => note.type === NoteType.TRIGGER);
  const otherNotes = relatedNotes.filter(
    (note) => ![NoteType.CLAIM, NoteType.EVIDENCE, NoteType.TRIGGER].includes(note.type)
  );

  const renderNote = (note: Note, sectionKey: string) => {
    const isMobileActionsOpen = mobileNoteActionsId === note.id;
    const isAnalyzing = pendingNoteId === note.id && note.type === NoteType.UNCATEGORIZED;
    const actionButtons = (
      <>
        <ActionIconButton
          action="edit"
          onClick={() => handleEdit(note)}
          disabled={isSavingEdit}
        />
        <ActionIconButton
          action="copy"
          onClick={() => handleCopyNote(note.content)}
        />
        {availableQuestions.length > 0 && (
          <IconButton
            label={t('move_to_question')}
            sizeClassName="h-10 w-10"
            onClick={() => openMoveToQuestion(note.id)}
            className="text-subtle dark:text-subtle-dark hover:text-accent dark:hover:text-accent-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
          >
            <MoveIcon className="w-4 h-4" />
          </IconButton>
        )}
        <ActionIconButton
          action="delete"
          onClick={() => handleDelete(note.id, false)}
        />
      </>
    );

    return (
      <div
        key={note.id}
        id={`note-${note.id}`}
        draggable
        onDragStart={() => handleDragStart(note.id, sectionKey)}
        onDragEnter={() => handleDragEnter(note.id, sectionKey)}
        onDragEnd={() => handleDragEnd(sectionKey, getOrderedNotes(sectionKey, relatedNotes.filter((n) => {
          if (sectionKey === 'claims') return n.type === NoteType.CLAIM;
          if (sectionKey === 'evidence') return n.type === NoteType.EVIDENCE;
          if (sectionKey === 'triggers') return n.type === NoteType.TRIGGER;
          return ![NoteType.CLAIM, NoteType.EVIDENCE, NoteType.TRIGGER].includes(n.type);
        })))}
        onDragOver={(e) => e.preventDefault()}
        className="group relative pl-4 sm:pl-6 border-l-2 border-line-soft dark:border-line-dark hover:border-line-muted dark:hover:border-muted-600 transition-colors"
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center">
            <span
              className="hidden sm:flex items-center cursor-grab active:cursor-grabbing text-muted-300 dark:text-muted-500 opacity-0 group-hover:opacity-100 transition-opacity mr-1 -ml-5"
              aria-hidden="true"
            >
              <GripVerticalIcon className="w-3.5 h-3.5" />
            </span>
            <TypeBadge type={note.type} subType={note.subType} />
            <span className="text-micro text-muted-300 dark:text-muted-400 ml-2">
              {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isAnalyzing && (
              <span className="ml-2 inline-flex items-center gap-1 text-micro text-muted-400 dark:text-muted-500">
                <LoadingSpinner className="w-3 h-3 text-muted-400 dark:text-muted-500" />
                {t('analyzing')}
              </span>
            )}
          </div>
          <div className="relative flex items-center gap-1">
            {editingId !== note.id && (
              <>
                <IconButton
                  label={t('actions_show')}
                  showTooltip={false}
                  sizeClassName="h-10 w-10"
                  onClick={() => setMobileNoteActionsId(note.id)}
                  className="sm:hidden text-subtle dark:text-subtle-dark hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
                >
                  <MoreIcon className="w-4 h-4" />
                </IconButton>
                <div className="hidden sm:flex gap-1 opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  {actionButtons}
                </div>
                <MobileActionSheet
                  isOpen={isMobileActionsOpen}
                  onClose={() => setMobileNoteActionsId(null)}
                >
                  <ActionSheetButton
                    action="edit"
                    onClick={() => {
                      setMobileNoteActionsId(null);
                      handleEdit(note);
                    }}
                    disabled={isSavingEdit}
                  />
                  <ActionSheetButton
                    action="copy"
                    onClick={() => {
                      setMobileNoteActionsId(null);
                      handleCopyNote(note.content);
                    }}
                  />
                  {availableQuestions.length > 0 && (
                    <ActionSheetButton
                      action="move"
                      onClick={() => {
                        setMobileNoteActionsId(null);
                        openMoveToQuestion(note.id);
                      }}
                    />
                  )}
                  <ActionSheetButton
                    action="delete"
                    onClick={() => {
                      setMobileNoteActionsId(null);
                      handleDelete(note.id, false);
                    }}
                  />
                </MobileActionSheet>
              </>
            )}
          </div>
        </div>

      {editingId === note.id ? (
        <div className="space-y-2">
          <textarea
            className="textarea-base"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                handleCancelEdit();
              }
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                void handleSaveEdit();
              }
            }}
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={isSavingEdit || !editContent.trim()}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm bg-accent dark:bg-accent-dark text-white rounded-md hover:opacity-90 transition-opacity ${
                isSavingEdit || !editContent.trim() ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {isSavingEdit ? <LoadingSpinner className="w-3.5 h-3.5 text-white" /> : <CheckIcon className="w-3.5 h-3.5" />}
              {isSavingEdit ? t('saving') : t('save')}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isSavingEdit}
              className={`flex items-center gap-1 px-3 py-1.5 text-body-sm-muted hover:text-ink dark:hover:text-ink-dark transition-colors ${
                isSavingEdit ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <XIcon className="w-3.5 h-3.5" />
              {t('cancel')}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-ink dark:text-ink-dark leading-relaxed whitespace-pre-wrap">
          {note.content}
        </p>
      )}
    </div>
    );
  };

  const renderSection = (sectionKey: string, title: string, emptyText: string, notes: Note[]) => {
    const isCollapsed = collapsedSections[sectionKey] ?? false;
    const orderedNotes = getOrderedNotes(sectionKey, notes);
    return (
      <section className="space-y-4">
        <button
          type="button"
          onClick={() => toggleSection(sectionKey)}
          className="flex items-center gap-2 cursor-pointer group/header w-full text-left"
          aria-expanded={!isCollapsed}
        >
          <ChevronDownIcon
            className={`w-4 h-4 text-muted-400 dark:text-muted-500 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
          />
          <h2 className="section-title">
            {title}
          </h2>
          <span className="text-micro tabular-nums text-muted-400 dark:text-muted-500">
            ({notes.length})
          </span>
        </button>
        {!isCollapsed && (
          notes.length === 0 ? (
            <p className="text-body-sm-muted">{emptyText}</p>
          ) : (
            <div className="space-y-8">
              {orderedNotes.map((note) => renderNote(note, sectionKey))}
            </div>
          )
        )}
      </section>
    );
  };

  return (
    <div>
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        message={t('confirm_delete_question_with_notes')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <QuestionDowngradeDialog
        isOpen={isDowngradeOpen}
        relatedCount={relatedNotes.length}
        selectedType={downgradeType}
        typeOptions={downgradeOptions}
        destination={downgradeDestination}
        relinkTargets={availableQuestions.map((note) => ({ id: note.id, title: note.content }))}
        relinkQuestionId={relinkQuestionId}
        isWorking={isDowngrading}
        onSelectType={setDowngradeType}
        onDestinationChange={(next) => {
          setDowngradeDestination(next);
          if (next === 'relink' && !relinkQuestionId && availableQuestions.length > 0) {
            setRelinkQuestionId(availableQuestions[0].id);
          }
        }}
        onSelectRelinkQuestion={setRelinkQuestionId}
        onConfirm={handleConfirmDowngrade}
        onCancel={() => !isDowngrading && setIsDowngradeOpen(false)}
        t={t}
      />
      <MoveToQuestionModal
        isOpen={moveNoteId !== null}
        isWorking={isMoving}
        questions={availableQuestions.map((q) => ({ id: q.id, title: q.content }))}
        selectedQuestionId={moveTargetQuestionId}
        onSelectQuestion={setMoveTargetQuestionId}
        onConfirm={handleConfirmMove}
        onCancel={() => setMoveNoteId(null)}
        t={t}
      />

      <div className="mb-10 sm:mb-12 section-divider pb-8">
        <div className="flex justify-between items-start">
          <span className="text-xs font-bold text-accent dark:text-accent-dark tracking-widest uppercase mb-3 block">{t('current_problem')}</span>
          <div className="flex items-center gap-2">
            <Tooltip content={visualizationOpen ? t('hide_visualization') : t('visualize')}>
            <button
              onClick={() => setVisualizationOpen((prev) => !prev)}
              className="h-10 w-10 sm:h-auto sm:w-auto sm:px-3 sm:py-2 muted-label border-0 sm:border sm:border-line dark:sm:border-line-dark hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark sm:hover:border-line-muted dark:sm:hover:border-muted-600 btn-icon cursor-pointer"
              aria-label={visualizationOpen ? t('hide_visualization') : t('visualize')}
            >
              <span className="sm:hidden">
                {visualizationOpen ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </span>
              <span className="hidden sm:inline">
                {visualizationOpen ? t('hide_visualization') : t('visualize')}
              </span>
            </button>
            </Tooltip>
            <Tooltip content={t('downgrade_question_action')}>
            <button
              onClick={openDowngrade}
              disabled={isSavingEdit || editingId === question.id || isDowngrading}
              className={`h-10 w-10 sm:h-auto sm:w-auto sm:px-3 sm:py-2 muted-label border-0 sm:border sm:border-line dark:sm:border-line-dark hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark sm:hover:border-line-muted dark:sm:hover:border-muted-600 btn-icon ${
                isSavingEdit || editingId === question.id || isDowngrading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              }`}
              aria-label={t('downgrade_question_action')}
            >
              <span className="sm:hidden">
                <ArrowDownIcon className="w-4 h-4" />
              </span>
              <span className="hidden sm:inline">
                {t('downgrade_question_action')}
              </span>
            </button>
            </Tooltip>
            {editingId !== question.id && (
              <>
                <ActionIconButton
                  action="edit"
                  onClick={() => handleEdit(question)}
                  disabled={isSavingEdit}
                />
                <ActionIconButton
                  action="copy"
                  onClick={() => handleCopyNote(question.content)}
                />
              </>
            )}
            <ActionIconButton
              action="delete"
              onClick={() => handleDelete(question.id, true)}
            />
          </div>
        </div>
        {editingId === question.id ? (
          <div className="space-y-2">
          <textarea
            className="textarea-base"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                handleCancelEdit();
              }
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                void handleSaveEdit();
              }
            }}
            rows={2}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={isSavingEdit || !editContent.trim()}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm bg-accent dark:bg-accent-dark text-white rounded-md hover:opacity-90 transition-opacity ${
                isSavingEdit || !editContent.trim() ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {isSavingEdit ? <LoadingSpinner className="w-3.5 h-3.5 text-white" /> : <CheckIcon className="w-3.5 h-3.5" />}
              {isSavingEdit ? t('saving') : t('save')}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isSavingEdit}
              className={`flex items-center gap-1 px-3 py-1.5 text-body-sm-muted hover:text-ink dark:hover:text-ink-dark transition-colors ${
                isSavingEdit ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <XIcon className="w-3.5 h-3.5" />
              {t('cancel')}
            </button>
          </div>
        </div>
      ) : (
          <h1 className="page-title-lg">
            {question.content}
          </h1>
        )}
        <div className="mt-4 text-caption">
          {t('initiated_on')} {new Date(question.createdAt).toLocaleDateString()}
        </div>
      </div>

      {visualizationOpen && (
        <section className="mb-12 sm:mb-14 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="section-title">
              {t('question_constellation')}
            </h2>
            <span className="section-meta">
              {t('read_only')}
            </span>
          </div>
          <div className="space-y-6">
            <div className="space-y-4">
              <QuestionGraph
                question={question}
                notes={relatedNotes}
                selectedNoteId={selectedGraphNote?.id ?? null}
                onSelectNote={(note) => setSelectedGraphNote(note)}
              />
              {selectedGraphNote && (
                <div className="surface-panel p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <TypeBadge type={selectedGraphNote.type} subType={selectedGraphNote.subType} />
                      <IconButton
                        label={t('close_detail')}
                        sizeClassName="h-8 w-8"
                        onClick={() => setSelectedGraphNote(null)}
                        className="text-muted-400 hover:text-ink dark:text-muted-400 dark:hover:text-ink-dark"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </IconButton>
                    </div>
                    <p className="text-body-sm leading-relaxed whitespace-pre-wrap">
                      {selectedGraphNote.content}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          handleEdit(selectedGraphNote);
                          document.getElementById(`note-${selectedGraphNote.id}`)?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                          });
                        }}
                        disabled={isSavingEdit}
                        className={`inline-flex items-center gap-2 px-3 py-2 text-xs bg-accent dark:bg-accent-dark text-white rounded-full hover:opacity-90 transition-opacity ${
                          isSavingEdit ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      >
                        <EditIcon className="w-3.5 h-3.5" />
                        {t('edit')}
                      </button>
                      <button
                        onClick={() => {
                          document.getElementById(`note-${selectedGraphNote.id}`)?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                          });
                        }}
                        className="chip-outline hover:border-line-muted dark:hover:border-muted-600"
                      >
                        {t('jump_to_note')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <QuestionStatsPanel stats={stats} relationDensity={relationDensity} />
          </div>
        </section>
      )}

      <div className="space-y-10">
        {relatedNotes.length === 0 ? (
          <div className="text-center py-10 opacity-60 text-subtle dark:text-subtle-dark">
            <p className="text-body-sm-muted">{t('no_thoughts_here')}</p>
          </div>
        ) : (
          <>
            {renderSection('claims', t('section_claims'), t('no_claims'), claims)}
            {renderSection('evidence', t('section_evidence'), t('no_evidence'), evidence)}
            {renderSection('triggers', t('section_triggers'), t('no_triggers'), triggers)}
            {renderSection('other', t('section_other'), t('no_other'), otherNotes)}
          </>
        )}
      </div>

      <div className="mt-16 sm:mt-20 flex justify-center">
        <Link to={`/write?questionId=${question.id}`} className="btn-pill btn-outline">
          {t('add_thought_stream')}
        </Link>
      </div>
    </div>
  );
};

export default QuestionDetail;
