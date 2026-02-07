import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  getNoteById,
  getNotes,
  getRelatedNotes,
  getQuestions,
  deleteNote,
  demoteQuestion,
  updateNoteContent,
  getQuestionConstellationStats,
  QuestionConstellationStats,
  subscribeToNoteEvents
} from '../services/storageService';
import { Note, NoteType } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { CheckIcon, XIcon, EyeIcon, EyeOffIcon, LoadingSpinner, MoreIcon, ArrowDownIcon, EditIcon } from '../components/Icons';
import ActionIconButton from '../components/ActionIconButton';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import IconButton from '../components/IconButton';
import TypeBadge from '../components/TypeBadge';
import QuestionGraph from '../components/QuestionGraph';
import QuestionStatsPanel from '../components/QuestionStatsPanel';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { useMobileActionsDismiss } from '../hooks/useMobileActionsDismiss';
import { formatTemplate } from '../utils/text';
import { getTypeLabel } from '../utils/notes';

const DowngradeDialog: React.FC<{
  isOpen: boolean;
  relatedCount: number;
  selectedType: NoteType;
  typeOptions: NoteType[];
  destination: 'release' | 'relink';
  relinkTargets: Array<{ id: string; title: string }>;
  relinkQuestionId: string | null;
  isWorking: boolean;
  onSelectType: (type: NoteType) => void;
  onDestinationChange: (destination: 'release' | 'relink') => void;
  onSelectRelinkQuestion: (questionId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  t: (key: string) => string;
}> = ({
  isOpen,
  relatedCount,
  selectedType,
  typeOptions,
  destination,
  relinkTargets,
  relinkQuestionId,
  isWorking,
  onSelectType,
  onDestinationChange,
  onSelectRelinkQuestion,
  onConfirm,
  onCancel,
  t
}) => {
  if (!isOpen) return null;

  const typeLabel = getTypeLabel(selectedType, t);
  const canRelink = relinkTargets.length > 0;
  const relinkTarget = relinkTargets.find((target) => target.id === relinkQuestionId) || null;
  const isRelink = destination === 'relink';
  const relatedLine = isRelink
    ? (relinkTarget
        ? formatTemplate(t('downgrade_question_relink'), { count: relatedCount, title: relinkTarget.title })
        : t('downgrade_question_relink_none'))
    : (relatedCount > 0
        ? formatTemplate(t('downgrade_question_related'), { count: relatedCount })
        : t('downgrade_question_related_none'));

  return (
    <Modal isOpen={isOpen} onClose={onCancel} cardClassName="max-w-md" isDismissable={!isWorking}>
      <div className="space-y-2 mb-5">
        <p className="text-ink dark:text-ink-dark text-lg font-medium">{t('downgrade_question_title')}</p>
        <p className="text-body-sm-muted">
          {formatTemplate(t('downgrade_question_body'), { type: typeLabel })}
        </p>
        <p className="text-body-sm-muted">{relatedLine}</p>
      </div>

      <div className="space-y-2 mb-6">
        <p className="text-mini-up text-subtle dark:text-subtle-dark">{t('downgrade_question_label')}</p>
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((type) => {
            const isSelected = type === selectedType;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onSelectType(type)}
                aria-pressed={isSelected}
                className={`chip-outline ${
                  isSelected
                    ? 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-700'
                    : ''
                }`}
              >
                {getTypeLabel(type, t)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <p className="text-mini-up text-subtle dark:text-subtle-dark">{t('downgrade_question_destination_label')}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onDestinationChange('release')}
            aria-pressed={destination === 'release'}
            className={`chip-outline ${
              destination === 'release'
                ? 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-700'
                : ''
            }`}
          >
            {t('downgrade_question_destination_release')}
          </button>
          <button
            type="button"
            onClick={() => onDestinationChange('relink')}
            aria-pressed={destination === 'relink'}
            disabled={!canRelink}
            className={`chip-outline ${
              destination === 'relink'
                ? 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-700'
                : ''
            } ${
              !canRelink ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {t('downgrade_question_destination_relink')}
          </button>
        </div>
        {isRelink && (
          canRelink ? (
            <select
              className="input-pill text-sm"
              value={relinkQuestionId ?? ''}
              onChange={(event) => onSelectRelinkQuestion(event.target.value)}
              aria-label={t('downgrade_question_select_question')}
            >
              {relinkTargets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.title}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-body-sm-muted">{t('downgrade_question_relink_none')}</p>
          )
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={isWorking}
          className={`px-4 py-2 rounded-md text-body-sm-muted hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark transition-colors ${
            isWorking ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          {t('cancel')}
        </button>
        <button
          onClick={onConfirm}
          disabled={isWorking || (isRelink && !relinkTarget)}
          className={`px-4 py-2 text-sm rounded-md bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 transition-colors inline-flex items-center gap-2 ${
            isWorking || (isRelink && !relinkTarget) ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          {isWorking && <LoadingSpinner className="w-3.5 h-3.5 text-white" />}
          {t('downgrade_question_action')}
        </button>
      </div>
    </Modal>
  );
};

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
  const downgradeOptions = [NoteType.UNCATEGORIZED, NoteType.TRIGGER, NoteType.CLAIM, NoteType.EVIDENCE];

  useMobileActionsDismiss(mobileNoteActionsId, setMobileNoteActionsId);

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

  const handleDelete = (noteId: string, isQuestion: boolean) => {
    setMobileNoteActionsId(null);
    setDeleteTarget({ id: noteId, isQuestion });
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
      if (deleteTarget.isQuestion) {
        navigate('/');
      } else {
        void loadData();
      }
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

  const renderNote = (note: Note) => {
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
        className="group relative pl-4 sm:pl-6 border-l-2 border-line-soft dark:border-line-dark hover:border-line-muted dark:hover:border-muted-600 transition-colors"
      >
        <div className="mb-2 flex items-center justify-between">
          <div>
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
          <div className="flex items-center gap-1">
            {editingId !== note.id && (
              <>
                <IconButton
                  label={isMobileActionsOpen ? t('actions_hide') : t('actions_show')}
                  sizeClassName="h-10 w-10"
                  onClick={() => setMobileNoteActionsId((prev) => (prev === note.id ? null : note.id))}
                  className="sm:hidden text-subtle dark:text-subtle-dark hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
                  aria-expanded={isMobileActionsOpen}
                  aria-controls={`note-actions-${note.id}`}
                  data-mobile-actions-toggle
                >
                  {isMobileActionsOpen ? <XIcon className="w-4 h-4" /> : <MoreIcon className="w-4 h-4" />}
                </IconButton>
                <div className="hidden sm:flex gap-1 opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  {actionButtons}
                </div>
                <div
                  id={`note-actions-${note.id}`}
                  className={`${isMobileActionsOpen ? 'flex' : 'hidden'} sm:hidden gap-1`}
                  data-mobile-actions
                >
                  {actionButtons}
                </div>
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

  const renderSection = (title: string, emptyText: string, notes: Note[]) => (
    <section className="space-y-4">
      <h2 className="section-title">
        {title}
      </h2>
      {notes.length === 0 ? (
        <p className="text-body-sm-muted">{emptyText}</p>
      ) : (
        <div className="space-y-8">
          {notes.map(renderNote)}
        </div>
      )}
    </section>
  );

  return (
    <div>
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        message={deleteTarget?.isQuestion
          ? t('confirm_delete_question_with_notes')
          : t('confirm_delete_note')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <DowngradeDialog
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

      <div className="mb-10 sm:mb-12 section-divider pb-8">
        <div className="flex justify-between items-start">
          <span className="text-xs font-bold text-accent dark:text-accent-dark tracking-widest uppercase mb-3 block">{t('current_problem')}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVisualizationOpen((prev) => !prev)}
              className="h-10 w-10 sm:h-auto sm:w-auto sm:px-3 sm:py-2 muted-label border-0 sm:border sm:border-line dark:sm:border-line-dark hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark sm:hover:border-line-muted dark:sm:hover:border-muted-600 btn-icon"
              aria-label={visualizationOpen ? t('hide_visualization') : t('visualize')}
              title={visualizationOpen ? t('hide_visualization') : t('visualize')}
            >
              <span className="sm:hidden">
                {visualizationOpen ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </span>
              <span className="hidden sm:inline">
                {visualizationOpen ? t('hide_visualization') : t('visualize')}
              </span>
            </button>
            <button
              onClick={openDowngrade}
              disabled={isSavingEdit || editingId === question.id || isDowngrading}
              className={`h-10 w-10 sm:h-auto sm:w-auto sm:px-3 sm:py-2 muted-label border-0 sm:border sm:border-line dark:sm:border-line-dark hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark sm:hover:border-line-muted dark:sm:hover:border-muted-600 btn-icon ${
                isSavingEdit || editingId === question.id || isDowngrading ? 'opacity-60 cursor-not-allowed' : ''
              }`}
              aria-label={t('downgrade_question_action')}
              title={t('downgrade_question_action')}
            >
              <span className="sm:hidden">
                <ArrowDownIcon className="w-4 h-4" />
              </span>
              <span className="hidden sm:inline">
                {t('downgrade_question_action')}
              </span>
            </button>
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
              Read-only
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
                        Jump to note
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
            {renderSection(t('section_claims'), t('no_claims'), claims)}
            {renderSection(t('section_evidence'), t('no_evidence'), evidence)}
            {renderSection(t('section_triggers'), t('no_triggers'), triggers)}
            {renderSection(t('section_other'), t('no_other'), otherNotes)}
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
