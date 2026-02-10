import React from 'react';
import { Link } from 'react-router-dom';
import { SearchIcon, XIcon } from '../Icons';
import IconButton from '../IconButton';

interface HomeRecallPanelProps {
  t: (key: string) => string;
  wanderingPlanetCount: number;
  isRecallOpen: boolean;
  query: string;
  isFiltering: boolean;
  onOpenRecall: () => void;
  onCloseRecall: () => void;
  onQueryChange: (value: string) => void;
  onClearQuery: () => void;
  onExitRecall: () => void;
}

const HomeRecallPanel: React.FC<HomeRecallPanelProps> = ({
  t,
  wanderingPlanetCount,
  isRecallOpen,
  query,
  isFiltering,
  onOpenRecall,
  onCloseRecall,
  onQueryChange,
  onClearQuery,
  onExitRecall
}) => {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-3">
        {!isRecallOpen ? (
          <button
            type="button"
            onClick={onOpenRecall}
            className="btn-pill btn-outline muted-label w-full sm:w-auto"
            aria-label={t('recall_label')}
          >
            <SearchIcon className="w-4 h-4" />
            <span>{t('recall_label')}</span>
          </button>
        ) : null}
        {wanderingPlanetCount > 0 && (
          <Link
            to="/wandering-planet"
            className="btn-pill btn-outline muted-label w-full sm:w-auto"
          >
            <img src="/asteroid.svg" alt="" aria-hidden="true" className="w-4 h-4" />
            <span>{t('wandering_planet')}</span>
            <span className="ml-1 px-1.5 py-0.5 bg-line dark:bg-line-dark rounded-full text-micro">
              {wanderingPlanetCount}
            </span>
          </Link>
        )}
      </div>
      {isRecallOpen && (
        <>
          <label htmlFor="recall" className="muted-label">
            {t('recall_label')}
          </label>
          <div className="mt-3 relative">
            <SearchIcon className="w-4 h-4 text-muted-500 dark:text-muted-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="recall"
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onBlur={onCloseRecall}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onExitRecall();
                }
              }}
              placeholder={t('recall_placeholder')}
              className="input-pill"
              aria-label={t('recall_label')}
              autoFocus
            />
            {isFiltering && (
              <IconButton
                label={t('clear_recall')}
                sizeClassName="h-10 w-10"
                onClick={onClearQuery}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-400 hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
              >
                <XIcon className="w-4 h-4" />
              </IconButton>
            )}
          </div>
          <p className="mt-2 text-caption">{t('recall_hint')}</p>
        </>
      )}
    </div>
  );
};

export default HomeRecallPanel;
