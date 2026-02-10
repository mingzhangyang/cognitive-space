import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { CopyIcon, CopyToIcon, EditIcon, TrashIcon, MoveIcon } from './Icons';

/**
 * CSS class used for action sheet option text to ensure a unified muted color
 * across light and dark themes.
 */
export const UNIFIED_TEXT_CLASS = 'text-muted-400 dark:text-muted-500';

/**
 * Action kinds supported by the action sheet.
 * - `edit`: edit the item
 * - `copy`: copy the item content
 * - `copy_to`: copy the item to another question
 * - `delete`: remove the item
 * - `move`: move the item to another question
 */
export type ActionKind = 'edit' | 'copy' | 'copy_to' | 'delete' | 'move';

/**
 * Props for `ActionSheetButton`.
 * - `action`: which action to render (icon + localized label)
 * - `onClick`: optional click handler
 * - `disabled`: whether the button is disabled
 */
export type ActionSheetButtonProps = {
  action: ActionKind;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
};

/**
 * Mapping from `ActionKind` to localized label and icon.
 * Uses `UNIFIED_TEXT_CLASS` so all action items share the same text color.
 */
const actionConfig: Record<
  ActionKind,
  { labelKey: string; textClassName: string; Icon: React.FC<{ className?: string }> }
> = {
  edit: { labelKey: 'edit', textClassName: UNIFIED_TEXT_CLASS, Icon: EditIcon },
  copy: { labelKey: 'copy_note', textClassName: UNIFIED_TEXT_CLASS, Icon: CopyIcon },
  copy_to: { labelKey: 'copy_to_question', textClassName: UNIFIED_TEXT_CLASS, Icon: CopyToIcon },
  delete: { labelKey: 'delete', textClassName: UNIFIED_TEXT_CLASS, Icon: TrashIcon },
  move: { labelKey: 'move_to_question', textClassName: UNIFIED_TEXT_CLASS, Icon: MoveIcon }
};

/**
 * A single-line action used inside mobile action sheets. Renders an icon and
 * a localized label. Styling matches other sheet options (muted text,
 * hover background, disabled state).
 */
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
