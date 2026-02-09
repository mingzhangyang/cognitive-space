import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { CopyIcon, EditIcon, TrashIcon } from './Icons';

type ActionKind = 'edit' | 'copy' | 'delete';

type ActionSheetButtonProps = {
  action: ActionKind;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
};

const UNIFIED_TEXT_CLASS = 'text-muted-400 dark:text-muted-500';

const actionConfig: Record<ActionKind, { labelKey: string; textClassName: string; Icon: React.FC<{ className?: string }> }> = {
  edit: { labelKey: 'edit', textClassName: UNIFIED_TEXT_CLASS, Icon: EditIcon },
  copy: { labelKey: 'copy_note', textClassName: UNIFIED_TEXT_CLASS, Icon: CopyIcon },
  delete: { labelKey: 'delete', textClassName: UNIFIED_TEXT_CLASS, Icon: TrashIcon }
};

const ActionSheetButton: React.FC<ActionSheetButtonProps> = ({
  action,
  onClick,
  disabled = false
}) => {
  const { t } = useAppContext();
  const { labelKey, textClassName, Icon } = actionConfig[action];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-colors cursor-pointer
        ${textClassName}
        hover:bg-surface-hover dark:hover:bg-surface-hover-dark
        active:scale-[0.98]
        ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-base font-medium">{t(labelKey)}</span>
    </button>
  );
};

export default ActionSheetButton;
