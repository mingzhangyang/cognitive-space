import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { MoreIcon } from './Icons';
import ActionIconButton from './ActionIconButton';
import ActionSheetButton from './ActionSheetButton';
import type { ActionKind } from './ActionSheetButton';
import IconButton from './IconButton';
import MobileActionSheet from './MobileActionSheet';

export type CardAction = {
  action: ActionKind;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
};

type CardActionsProps = {
  actions: CardAction[];
  isMobileSheetOpen: boolean;
  onMobileSheetOpen: React.MouseEventHandler<HTMLButtonElement>;
  onMobileSheetClose: () => void;
  /** Extra class names on the desktop ActionIconButton (e.g. hover-reveal) */
  desktopButtonClassName?: string;
  /** Base color class for desktop ActionIconButton */
  desktopButtonBaseClassName?: string;
  /** Gap class for the desktop icon group */
  desktopGapClassName?: string;
  /** Color class for the mobile hamburger button */
  mobileButtonClassName?: string;
};

const CardActions: React.FC<CardActionsProps> = ({
  actions,
  isMobileSheetOpen,
  onMobileSheetOpen,
  onMobileSheetClose,
  desktopButtonClassName = 'opacity-0 sm:group-hover:opacity-100 transition-opacity',
  desktopButtonBaseClassName,
  desktopGapClassName = 'gap-1',
  mobileButtonClassName = 'text-subtle dark:text-subtle-dark hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark',
}) => {
  const { t } = useAppContext();

  return (
    <div className="relative flex items-center gap-1">
      <IconButton
        label={t('actions_show')}
        showTooltip={false}
        sizeClassName="h-10 w-10"
        onClick={onMobileSheetOpen}
        className={`sm:hidden ${mobileButtonClassName}`}
      >
        <MoreIcon className="w-4 h-4" />
      </IconButton>
      <div className={`hidden sm:flex ${desktopGapClassName} ${desktopButtonClassName}`}>
        {actions.map(({ action, onClick, disabled }) => (
          <ActionIconButton
            key={action}
            action={action}
            onClick={onClick}
            disabled={disabled}
            {...(desktopButtonBaseClassName ? { baseClassName: desktopButtonBaseClassName } : {})}
          />
        ))}
      </div>
      <MobileActionSheet
        isOpen={isMobileSheetOpen}
        onClose={onMobileSheetClose}
      >
        {actions.map(({ action, onClick, disabled }) => (
          <ActionSheetButton
            key={action}
            action={action}
            onClick={(e) => {
              onMobileSheetClose();
              onClick(e);
            }}
            disabled={disabled}
          />
        ))}
      </MobileActionSheet>
    </div>
  );
};

export default CardActions;
