import React from 'react';
import { NoteType } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { SUBTYPE_KEYS } from '../utils/subtypes';
import { getTypeLabel } from '../utils/notes';
import { isTranslationKey } from '../utils/i18n';

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
  const subTypeKey = subType ? `subtype_${subType}` : '';
  const resolvedSubType = subType && SUBTYPE_KEYS.has(subType) && isTranslationKey(subTypeKey)
    ? t(subTypeKey)
    : subType?.trim();

  return (
    <span className={`badge-base ${colors[type] || colors[NoteType.UNCATEGORIZED]}`}>
      {getTypeLabel(type, t)}
      {resolvedSubType && (
        <span className="font-normal opacity-70 ml-1 normal-case tracking-normal">· {resolvedSubType}</span>
      )}
    </span>
  );
};

export default TypeBadge;
