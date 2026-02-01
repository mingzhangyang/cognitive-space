import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getNoteById, getRelatedNotes, deleteNote, updateNoteContent } from '../services/storageService';
import { Note, NoteType } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { TrashIcon, EditIcon, CheckIcon, XIcon } from '../components/Icons';

const TypeBadge: React.FC<{ type: NoteType; subType?: string }> = ({ type, subType }) => {
  const { t } = useAppContext();

  const colors = {
    [NoteType.CLAIM]: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800',
    [NoteType.EVIDENCE]: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800',
    [NoteType.TRIGGER]: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-800',
    [NoteType.QUESTION]: 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400',
    [NoteType.UNCATEGORIZED]: 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
  };

  return (
    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${colors[type] || colors[NoteType.UNCATEGORIZED]}`}>
      {t(`type_${type}` as any)}
      {subType && <span className="font-normal opacity-70 ml-1 normal-case tracking-normal">· {subType}</span>}
    </span>
  );
};

const ConfirmDialog: React.FC<{
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-white dark:bg-stone-800 rounded-lg p-6 max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <p className="text-ink dark:text-ink-dark mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-subtle dark:text-subtle-dark hover:text-ink dark:hover:text-ink-dark transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; isQuestion: boolean } | null>(null);
  const { t } = useAppContext();

  const loadData = async () => {
    if (id) {
      const allNotes = await getRelatedNotes(id);
      setRelatedNotes(allNotes.sort((a, b) => b.createdAt - a.createdAt));
      const q = await getNoteById(id);
      setQuestion(q || null);
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
      className="group relative pl-6 border-l-2 border-stone-100 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-600 transition-colors"
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <TypeBadge type={note.type} subType={note.subType} />
          <span className="text-[10px] text-stone-300 dark:text-stone-600 ml-2">
            {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {editingId !== note.id && (
            <>
              <button
                onClick={() => handleEdit(note)}
                className="p-1.5 text-stone-500 hover:text-accent dark:text-stone-500 dark:hover:text-accent-dark transition-colors rounded"
                title="Edit"
              >
                <EditIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(note.id, false)}
                className="p-1.5 text-stone-500 hover:text-red-500 dark:text-stone-500 dark:hover:text-red-400 transition-colors rounded"
                title="Delete"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {editingId === note.id ? (
        <div className="space-y-2">
          <textarea
            className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md p-3 text-ink dark:text-ink-dark leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 dark:focus:ring-accent-dark/30"
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
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-subtle dark:text-subtle-dark hover:text-ink dark:hover:text-ink-dark transition-colors"
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
      <h2 className="text-xs font-bold text-subtle dark:text-subtle-dark tracking-widest uppercase">
        {title}
      </h2>
      {notes.length === 0 ? (
        <p className="text-sm text-subtle dark:text-subtle-dark">{emptyText}</p>
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

      <div className="mb-12 border-b border-stone-100 dark:border-stone-800 pb-8">
        <div className="flex justify-between items-start">
          <span className="text-xs font-bold text-accent dark:text-accent-dark tracking-widest uppercase mb-3 block">{t('current_problem')}</span>
          <button
            onClick={() => handleDelete(question.id, true)}
            className="p-2 text-stone-500 hover:text-red-500 dark:text-stone-500 dark:hover:text-red-400 transition-colors rounded-md hover:bg-stone-100 dark:hover:bg-stone-800"
            title="Delete question"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
        <h1 className="text-3xl md:text-4xl font-serif font-medium text-ink dark:text-ink-dark leading-tight">
          {question.content}
        </h1>
        <div className="mt-4 text-xs text-subtle dark:text-subtle-dark">
          {t('initiated_on')} {new Date(question.createdAt).toLocaleDateString()}
        </div>
      </div>

      <div className="space-y-10">
        {relatedNotes.length === 0 ? (
          <div className="text-center py-10 opacity-60 text-subtle dark:text-subtle-dark">
            <p className="text-sm">{t('no_thoughts_here')}</p>
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

      <div className="mt-20 flex justify-center">
        <Link to="/write" className="text-sm text-subtle dark:text-subtle-dark hover:text-accent dark:hover:text-accent-dark border-b border-transparent hover:border-accent dark:hover:border-accent-dark transition-all pb-0.5">
          {t('add_thought_stream')}
        </Link>
      </div>
    </div>
  );
};

export default QuestionDetail;
