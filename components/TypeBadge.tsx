import React from 'react';
import { NoteType } from '../types';
import { useAppContext } from '../contexts/AppContext';

interface TypeBadgeProps {
  type: NoteType;
  subType?: string;
}

const TypeBadge: React.FC<TypeBadgeProps> = ({ type, subType }) => {
  const { t } = useAppContext();

  const colors = {
    [NoteType.CLAIM]: 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 border-blue-100 dark:border-blue-700',
    [NoteType.EVIDENCE]: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200 border-emerald-100 dark:border-emerald-700',
    [NoteType.TRIGGER]: 'bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-200 border-purple-100 dark:border-purple-700',
    [NoteType.QUESTION]: 'bg-surface-hover dark:bg-surface-hover-dark/80 text-muted-600 dark:text-muted-300 border-line-muted dark:border-line-dark',
    [NoteType.UNCATEGORIZED]: 'bg-gray-50 dark:bg-gray-800/70 text-gray-500 dark:text-gray-300 border-gray-100 dark:border-gray-700'
  };

  return (
    <span className={`badge-base ${colors[type] || colors[NoteType.UNCATEGORIZED]}`}>
      {t(`type_${type}` as any)}
      {subType && <span className="font-normal opacity-70 ml-1 normal-case tracking-normal">· {subType}</span>}
    </span>
  );
};

export default TypeBadge;
