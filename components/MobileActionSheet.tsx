import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppContext } from '../contexts/AppContext';
import { XIcon } from './Icons';

type MobileActionSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
};

const MobileActionSheet: React.FC<MobileActionSheetProps> = ({
  isOpen,
  onClose,
  children,
  title
}) => {
  const { t } = useAppContext();
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when sheet is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative bg-surface dark:bg-surface-dark rounded-t-2xl border-t border-line dark:border-line-dark p-4 pb-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-muted-300 dark:bg-muted-600" />
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pt-2">
          <span className="text-sm font-medium text-subtle dark:text-subtle-dark">
            {title || t('actions')}
          </span>
          <button
            onClick={onClose}
            className="btn-icon h-8 w-8 text-muted-400 hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark cursor-pointer"
            aria-label={t('menu_close')}
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        {/* Actions */}
        <div className="flex flex-col gap-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MobileActionSheet;
