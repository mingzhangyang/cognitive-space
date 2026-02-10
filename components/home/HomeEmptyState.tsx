import React from 'react';
import { EmptyStateIllustration } from '../Icons';

interface HomeEmptyStateProps {
  t: (key: string) => string;
  hasQuestions: boolean;
  isFiltering: boolean;
  hasNotes: boolean;
  onboardingDismissed: boolean;
  onDismissOnboarding: () => void;
}

const HomeEmptyState: React.FC<HomeEmptyStateProps> = ({
  t,
  hasQuestions,
  isFiltering,
  hasNotes,
  onboardingDismissed,
  onDismissOnboarding
}) => {
  return (
    <div className="text-center py-14 px-5 surface-empty shadow-[var(--shadow-elev-1)] dark:shadow-[var(--shadow-elev-1-dark)]">
      {hasQuestions && isFiltering ? (
        <>
          <p className="text-ink dark:text-ink-dark font-serif mb-2 text-lg">
            {t('no_recall_results')}
          </p>
          <p className="text-body-sm-muted">
            {t('recall_hint')}
          </p>
        </>
      ) : (
        <>
          <EmptyStateIllustration className="w-40 h-auto mx-auto mb-4 text-accent/50 dark:text-accent-dark/40" />
          <p className="text-ink dark:text-ink-dark font-serif mb-2 text-lg">
            {hasNotes ? t('no_question_yet') : t('space_empty')}
          </p>
          <p className="text-body-sm-muted">
            {t('just_write')}
          </p>
          {!hasNotes && !onboardingDismissed && (
            <div className="mt-6 mx-auto max-w-xs rounded-xl border border-accent/20 dark:border-accent-dark/20 bg-accent/5 dark:bg-accent-dark/5 px-4 py-3 animate-fade-in">
              <p className="text-body-sm text-ink dark:text-ink-dark mb-2">
                {t('empty_state_onboarding')}
              </p>
              <button
                type="button"
                onClick={onDismissOnboarding}
                className="text-xs text-accent dark:text-accent-dark hover:underline cursor-pointer"
              >
                {t('empty_state_onboarding_dismiss')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HomeEmptyState;
