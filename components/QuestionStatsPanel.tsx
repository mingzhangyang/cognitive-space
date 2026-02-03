import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { QuestionConstellationStats } from '../services/storageService';

interface QuestionStatsPanelProps {
  stats: QuestionConstellationStats | null;
  relationDensity: number | null;
}

const formatDateTime = (timestamp: number | null) => {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString();
};

const formatPercent = (value: number | null) => {
  if (value === null) return '—';
  return `${Math.round(value * 100)}%`;
};

const QuestionStatsPanel: React.FC<QuestionStatsPanelProps> = ({ stats, relationDensity }) => {
  const { t } = useAppContext();

  return (
    <div className="surface-panel p-5 space-y-5">
      <div>
        <p className="muted-label">
          {t('stats_related_notes')}
        </p>
        <p className="text-2xl font-serif text-ink dark:text-ink-dark mt-2">
          {stats ? stats.relatedCount : 0}
        </p>
      </div>

      <div>
        <p className="muted-label">
          {t('stats_type_distribution')}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink dark:text-ink-dark">
          <span className="px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            {t('section_claims')}: {stats?.claimCount ?? 0}
          </span>
          <span className="px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
            {t('section_evidence')}: {stats?.evidenceCount ?? 0}
          </span>
          <span className="px-2 py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
            {t('section_triggers')}: {stats?.triggerCount ?? 0}
          </span>
        </div>
      </div>

      <div>
        <p className="muted-label">
          {t('stats_last_updated')}
        </p>
        <p className="text-body-sm mt-2">
          {formatDateTime(stats?.lastUpdatedAt ?? null)}
        </p>
      </div>

      <div>
        <p className="muted-label">
          {t('stats_relation_density')}
        </p>
        <p className="text-body-sm mt-2">
          {formatPercent(relationDensity)}
        </p>
      </div>
    </div>
  );
};

export default QuestionStatsPanel;
