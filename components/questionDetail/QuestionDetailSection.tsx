import React from 'react';
import { Note } from '../../types';
import { ChevronDownIcon } from '../Icons';
import QuestionDetailNote, { QuestionDetailNoteSharedProps } from './QuestionDetailNote';

interface QuestionDetailSectionProps {
  sectionKey: string;
  title: string;
  emptyText: string;
  notes: Note[];
  orderedNotes: Note[];
  isCollapsed: boolean;
  onToggle: () => void;
  noteProps: QuestionDetailNoteSharedProps;
}

const QuestionDetailSection: React.FC<QuestionDetailSectionProps> = ({
  sectionKey,
  title,
  emptyText,
  notes,
  orderedNotes,
  isCollapsed,
  onToggle,
  noteProps
}) => {
  return (
    <section className="space-y-4">
      <button
        type="button"
        onClick={onToggle}
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
            {orderedNotes.map((note) => (
              <QuestionDetailNote
                key={note.id}
                note={note}
                sectionKey={sectionKey}
                orderedNotes={orderedNotes}
                {...noteProps}
              />
            ))}
          </div>
        )
      )}
    </section>
  );
};

export default QuestionDetailSection;
