import React from 'react';
import { NoteType } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { SUBTYPE_KEYS } from '../utils/subtypes';

interface TypeBadgeProps {
  type: NoteType;
  subType?: string;
}

const TypeBadge: React.FC<TypeBadgeProps> = ({ type, subType }) => {
  const { t } = useAppContext();

  const colors = {
    [NoteType.CLAIM]: 'bg-surface-hover dark:bg-surface-hover-dark text-note-claim dark:text-note-claim-dark border-line dark:border-line-dark',
    [NoteType.EVIDENCE]: 'bg-surface-hover dark:bg-surface-hover-dark text-note-evidence dark:text-note-evidence-dark border-line dark:border-line-dark',
    [NoteType.TRIGGER]: 'bg-surface-hover dark:bg-surface-hover-dark text-note-trigger dark:text-note-trigger-dark border-line dark:border-line-dark',
    [NoteType.QUESTION]: 'bg-surface-hover dark:bg-surface-hover-dark/80 text-muted-600 dark:text-muted-300 border-line-muted dark:border-line-dark',
    [NoteType.UNCATEGORIZED]: 'bg-surface-hover dark:bg-surface-hover-dark text-muted-400 dark:text-muted-500 border-line dark:border-line-dark'
  };

  // Data is normalized on write by storageService + background migration,
  // so subType should already be a canonical key. Fall back to raw value for safety.
  const resolvedSubType = subType && SUBTYPE_KEYS.has(subType)
    ? t(`subtype_${subType}` as any)
    : subType?.trim();

  return (
    <span className={`badge-base ${colors[type] || colors[NoteType.UNCATEGORIZED]}`}>
      {t(`type_${type}` as any)}
      {resolvedSubType && (
        <span className="font-normal opacity-70 ml-1 normal-case tracking-normal">· {resolvedSubType}</span>
      )}
    </span>
  );
};

export default TypeBadge;
