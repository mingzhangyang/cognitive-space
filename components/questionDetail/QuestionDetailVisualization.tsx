import React from 'react';
import { Note } from '../../types';
import { EditIcon, XIcon } from '../Icons';
import IconButton from '../IconButton';
import QuestionGraph from '../QuestionGraph';
import QuestionStatsPanel from '../QuestionStatsPanel';
import TypeBadge from '../TypeBadge';
import type { QuestionConstellationStats } from '../../services/storageService';

interface QuestionDetailVisualizationProps {
  question: Note;
  notes: Note[];
  selectedNote: Note | null;
  stats: QuestionConstellationStats | null;
  relationDensity: number | null;
  isSavingEdit: boolean;
  onSelectNote: (note: Note | null) => void;
  onEditNote: (note: Note) => void;
  t: (key: string) => string;
}

const QuestionDetailVisualization: React.FC<QuestionDetailVisualizationProps> = ({
  question,
  notes,
  selectedNote,
  stats,
  relationDensity,
  isSavingEdit,
  onSelectNote,
  onEditNote,
  t
}) => {
  return (
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
            notes={notes}
            selectedNoteId={selectedNote?.id ?? null}
            onSelectNote={(note) => onSelectNote(note)}
          />
          {selectedNote && (
            <div className="surface-panel p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <TypeBadge type={selectedNote.type} subType={selectedNote.subType} />
                  <IconButton
                    label={t('close_detail')}
                    sizeClassName="h-8 w-8"
                    onClick={() => onSelectNote(null)}
                    className="text-muted-400 hover:text-ink dark:text-muted-400 dark:hover:text-ink-dark"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </IconButton>
                </div>
                <p className="text-body-sm leading-relaxed whitespace-pre-wrap">
                  {selectedNote.content}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      onEditNote(selectedNote);
                      document.getElementById(`note-${selectedNote.id}`)?.scrollIntoView({
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
                      document.getElementById(`note-${selectedNote.id}`)?.scrollIntoView({
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
  );
};

export default QuestionDetailVisualization;
