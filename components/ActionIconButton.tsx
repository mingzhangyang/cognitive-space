import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { CopyIcon, EditIcon, TrashIcon } from './Icons';

type ActionKind = 'edit' | 'copy' | 'delete';

type ActionIconButtonProps = {
  action: ActionKind;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  className?: string;
  baseClassName?: string;
  sizeClassName?: string;
  iconClassName?: string;
  type?: 'button' | 'submit' | 'reset';
};

const actionConfig: Record<ActionKind, { labelKey: string; hoverClassName: string; Icon: React.FC<{ className?: string }> }> = {
  edit: {
    labelKey: 'edit',
    hoverClassName: 'hover:text-accent dark:hover:text-accent-dark',
    Icon: EditIcon
  },
  copy: {
    labelKey: 'copy_note',
    hoverClassName: 'hover:text-cs-amber-500 dark:hover:text-cs-amber-300',
    Icon: CopyIcon
  },
  delete: {
    labelKey: 'delete',
    hoverClassName: 'hover:text-red-500 dark:hover:text-red-400',
    Icon: TrashIcon
  }
};

const ActionIconButton: React.FC<ActionIconButtonProps> = ({
  action,
  onClick,
  disabled = false,
  className = '',
  baseClassName = 'text-subtle dark:text-subtle-dark',
  sizeClassName = 'h-10 w-10',
  iconClassName = 'w-4 h-4',
  type = 'button'
}) => {
  const { t } = useAppContext();
  const { labelKey, hoverClassName, Icon } = actionConfig[action];
  const stateClassName = disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer';
  const buttonClassName = [
    sizeClassName,
    'btn-icon',
    baseClassName,
    hoverClassName,
    'hover:bg-surface-hover dark:hover:bg-surface-hover-dark',
    stateClassName,
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={buttonClassName}
      title={t(labelKey)}
      aria-label={t(labelKey)}
    >
      <Icon className={iconClassName} />
    </button>
  );
};

export default ActionIconButton;
