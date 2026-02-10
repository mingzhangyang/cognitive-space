import React from 'react';
import { Note } from '../../types';
import QuestionDetailSection from './QuestionDetailSection';
import type { QuestionDetailNoteSharedProps } from './QuestionDetailNote';

interface QuestionDetailSectionsProps {
  t: (key: string) => string;
  relatedCount: number;
  claims: Note[];
  evidence: Note[];
  triggers: Note[];
  otherNotes: Note[];
  collapsedSections: Record<string, boolean>;
  toggleSection: (sectionKey: string) => void;
  getOrderedNotes: (sectionKey: string, notes: Note[]) => Note[];
  noteProps: QuestionDetailNoteSharedProps;
}

const QuestionDetailSections: React.FC<QuestionDetailSectionsProps> = ({
  t,
  relatedCount,
  claims,
  evidence,
  triggers,
  otherNotes,
  collapsedSections,
  toggleSection,
  getOrderedNotes,
  noteProps
}) => {
  if (relatedCount === 0) {
    return (
      <div className="text-center py-10 opacity-60 text-subtle dark:text-subtle-dark">
        <p className="text-body-sm-muted">{t('no_thoughts_here')}</p>
      </div>
    );
  }

  return (
    <>
      <QuestionDetailSection
        sectionKey="claims"
        title={t('section_claims')}
        emptyText={t('no_claims')}
        notes={claims}
        orderedNotes={getOrderedNotes('claims', claims)}
        isCollapsed={collapsedSections.claims ?? false}
        onToggle={() => toggleSection('claims')}
        noteProps={noteProps}
      />
      <QuestionDetailSection
        sectionKey="evidence"
        title={t('section_evidence')}
        emptyText={t('no_evidence')}
        notes={evidence}
        orderedNotes={getOrderedNotes('evidence', evidence)}
        isCollapsed={collapsedSections.evidence ?? false}
        onToggle={() => toggleSection('evidence')}
        noteProps={noteProps}
      />
      <QuestionDetailSection
        sectionKey="triggers"
        title={t('section_triggers')}
        emptyText={t('no_triggers')}
        notes={triggers}
        orderedNotes={getOrderedNotes('triggers', triggers)}
        isCollapsed={collapsedSections.triggers ?? false}
        onToggle={() => toggleSection('triggers')}
        noteProps={noteProps}
      />
      <QuestionDetailSection
        sectionKey="other"
        title={t('section_other')}
        emptyText={t('no_other')}
        notes={otherNotes}
        orderedNotes={getOrderedNotes('other', otherNotes)}
        isCollapsed={collapsedSections.other ?? false}
        onToggle={() => toggleSection('other')}
        noteProps={noteProps}
      />
    </>
  );
};

export default QuestionDetailSections;
