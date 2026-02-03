import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getNoteById,
  getNotes,
  getRelatedNotes,
  deleteNote,
  updateNoteContent,
  getQuestionConstellationStats,
  QuestionConstellationStats
} from '../services/storageService';
import { Note, NoteType } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { TrashIcon, EditIcon, CheckIcon, XIcon, EyeIcon, EyeOffIcon } from '../components/Icons';
import TypeBadge from '../components/TypeBadge';
import QuestionGraph from '../components/QuestionGraph';
import QuestionStatsPanel from '../components/QuestionStatsPanel';

const ConfirmDialog: React.FC<{
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card max-w-sm" onClick={e => e.stopPropagation()}>
        <p className="text-ink dark:text-ink-dark mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-body-sm-muted hover:text-ink dark:hover:text-ink-dark transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-md btn-danger"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const QuestionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Note | null>(null);
  const [relatedNotes, setRelatedNotes] = useState<Note[]>([]);
  const [visualizationOpen, setVisualizationOpen] = useState(false);
  const [selectedGraphNote, setSelectedGraphNote] = useState<Note | null>(null);
  const [stats, setStats] = useState<QuestionConstellationStats | null>(null);
  const [relationDensity, setRelationDensity] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; isQuestion: boolean } | null>(null);
  const { t } = useAppContext();

  const loadData = async () => {
    if (id) {
      const [related, q, statsResult, allNotes] = await Promise.all([
        getRelatedNotes(id),
        getNoteById(id),
        getQuestionConstellationStats(id),
        getNotes()
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
    }
  };

  useEffect(() => {
    void loadData();
  }, [id]);

  const handleEdit = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = async () => {
    if (editingId && editContent.trim()) {
      await updateNoteContent(editingId, editContent.trim());
      setEditingId(null);
      setEditContent('');
      void loadData();
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleDelete = (noteId: string, isQuestion: boolean) => {
    setDeleteTarget({ id: noteId, isQuestion });
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

  const renderNote = (note: Note) => (
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
        </div>
        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {editingId !== note.id && (
            <>
              <button
                onClick={() => handleEdit(note)}
                className="h-10 w-10 btn-icon text-muted-400 hover:text-accent dark:text-muted-400 dark:hover:text-accent-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
                title="Edit"
              >
                <EditIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(note.id, false)}
                className="h-10 w-10 btn-icon text-muted-400 hover:text-red-500 dark:text-muted-400 dark:hover:text-red-400 hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
                title="Delete"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
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
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-accent dark:bg-accent-dark text-white rounded-md hover:opacity-90 transition-opacity"
            >
              <CheckIcon className="w-3.5 h-3.5" />
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="flex items-center gap-1 px-3 py-1.5 text-body-sm-muted hover:text-ink dark:hover:text-ink-dark transition-colors"
            >
              <XIcon className="w-3.5 h-3.5" />
              Cancel
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
          ? "Delete this question and all related notes?"
          : "Delete this note?"}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="mb-10 sm:mb-12 section-divider pb-8">
        <div className="flex justify-between items-start">
          <span className="text-xs font-bold text-accent dark:text-accent-dark tracking-widest uppercase mb-3 block">{t('current_problem')}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVisualizationOpen((prev) => !prev)}
              className="h-10 w-10 sm:h-auto sm:w-auto sm:px-3 sm:py-2 muted-label border border-line dark:border-line-dark hover:text-ink dark:hover:text-ink-dark hover:border-line-muted dark:hover:border-muted-600 btn-icon"
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
              onClick={() => handleDelete(question.id, true)}
              className="h-10 w-10 btn-icon text-muted-400 hover:text-red-500 dark:text-muted-400 dark:hover:text-red-400 hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
              title="Delete question"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        <h1 className="page-title-lg">
          {question.content}
        </h1>
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
              <div className="surface-panel p-4">
                {selectedGraphNote ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <TypeBadge type={selectedGraphNote.type} subType={selectedGraphNote.subType} />
                      <button
                        onClick={() => setSelectedGraphNote(null)}
                        className="h-8 w-8 btn-icon text-muted-400 hover:text-ink dark:text-muted-400 dark:hover:text-ink-dark"
                        aria-label="Close detail"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
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
                        className="inline-flex items-center gap-2 px-3 py-2 text-xs bg-accent dark:bg-accent-dark text-white rounded-full hover:opacity-90 transition-opacity"
                      >
                        <EditIcon className="w-3.5 h-3.5" />
                        Edit
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
                ) : (
                  <p className="text-caption">
                    Click a node to preview its details.
                  </p>
                )}
              </div>
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
        <Link to="/write" className="btn-pill btn-outline">
          {t('add_thought_stream')}
        </Link>
      </div>
    </div>
  );
};

export default QuestionDetail;
