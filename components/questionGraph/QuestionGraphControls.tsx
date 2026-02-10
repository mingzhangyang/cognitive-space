import React from 'react';
import { CrosshairIcon, MinusIcon, PlusIcon } from '../Icons';
import IconButton from '../IconButton';

interface QuestionGraphControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  t: (key: string) => string;
}

const QuestionGraphControls: React.FC<QuestionGraphControlsProps> = ({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
  t
}) => {
  return (
    <div className="absolute top-3 right-3 z-20 pointer-events-auto">
      <div className="flex items-center gap-0.5 rounded-full border border-line/60 dark:border-line-dark/60 bg-surface/90 dark:bg-surface-dark/85 px-1 py-1 shadow-[var(--shadow-elev-1)] dark:shadow-[var(--shadow-elev-1-dark)] backdrop-blur-sm">
        <div className="hidden sm:flex items-center gap-1 pl-2.5 pr-1.5">
          <span className="text-[9px] uppercase tracking-[0.18em] font-medium text-muted-400 dark:text-muted-500 select-none">
            {t('zoom_label')}
          </span>
          <span className="min-w-[2.5rem] text-center text-[11px] font-semibold tabular-nums text-subtle dark:text-subtle-dark">
            {Math.round(scale * 100)}%
          </span>
        </div>
        <span className="hidden sm:block h-4 w-px bg-line/50 dark:bg-line-dark/50 mx-0.5" />
        <IconButton
          label={t('zoom_in')}
          onClick={onZoomIn}
          sizeClassName="h-7 w-7"
          className="text-muted-500 dark:text-muted-400 hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark active:scale-95 duration-150"
        >
          <PlusIcon className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton
          label={t('zoom_out')}
          onClick={onZoomOut}
          sizeClassName="h-7 w-7"
          className="text-muted-500 dark:text-muted-400 hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark active:scale-95 duration-150"
        >
          <MinusIcon className="h-3.5 w-3.5" />
        </IconButton>
        <span className="h-4 w-px bg-line/50 dark:bg-line-dark/50 mx-0.5" />
        <button
          type="button"
          onClick={onReset}
          className="h-7 px-2.5 inline-flex items-center gap-1.5 rounded-full cursor-pointer text-muted-500 dark:text-muted-400 hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark active:scale-95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 dark:focus-visible:ring-accent-dark/30"
          aria-label={t('center_view')}
        >
          <CrosshairIcon className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium">{t('center_view')}</span>
        </button>
      </div>
    </div>
  );
};

export default QuestionGraphControls;
