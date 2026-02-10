import React from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { PlusIcon } from '../Icons';
import Tooltip from '../Tooltip';

interface HomeFabProps {
  t: (key: string) => string;
  fabContainer: HTMLElement | null;
}

const HomeFab: React.FC<HomeFabProps> = ({ t, fabContainer }) => {
  if (!fabContainer) return null;

  return createPortal(
    <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-8 z-50 flex flex-col items-center gap-2">
      <Tooltip content={t('keyboard_shortcut_write')}>
        <Link
          to="/write"
          className="bg-action text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform hover:bg-action-hover focus:outline-none focus:ring-4 focus:ring-action-ring dark:bg-action dark:hover:bg-action-hover-dark dark:focus:ring-action-ring/50"
          aria-label={t('write_label')}
        >
          <PlusIcon className="w-6 h-6" />
        </Link>
      </Tooltip>
    </div>,
    fabContainer
  );
};

export default HomeFab;
