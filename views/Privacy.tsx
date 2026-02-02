import React from 'react';
import { useAppContext } from '../contexts/AppContext';

const Privacy: React.FC = () => {
  const { t } = useAppContext();

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-serif font-medium text-ink dark:text-ink-dark leading-tight">
          {t('privacy_title')}
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-subtle dark:text-subtle-dark">
          {t('privacy_updated')}
        </p>
      </div>

      <div className="max-w-2xl space-y-6 text-sm sm:text-base text-subtle dark:text-subtle-dark leading-relaxed">
        <p>{t('privacy_intro')}</p>

        <section className="space-y-2">
          <h2 className="text-xs sm:text-sm font-bold tracking-widest uppercase text-subtle dark:text-subtle-dark">
            {t('privacy_local_title')}
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t('privacy_local_item_notes')}</li>
            <li>{t('privacy_local_item_prefs')}</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs sm:text-sm font-bold tracking-widest uppercase text-subtle dark:text-subtle-dark">
            {t('privacy_ai_title')}
          </h2>
          <p>{t('privacy_ai_body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs sm:text-sm font-bold tracking-widest uppercase text-subtle dark:text-subtle-dark">
            {t('privacy_tracking_title')}
          </h2>
          <p>{t('privacy_tracking_body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs sm:text-sm font-bold tracking-widest uppercase text-subtle dark:text-subtle-dark">
            {t('privacy_choices_title')}
          </h2>
          <p>{t('privacy_choices_body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs sm:text-sm font-bold tracking-widest uppercase text-subtle dark:text-subtle-dark">
            {t('privacy_changes_title')}
          </h2>
          <p>{t('privacy_changes_body')}</p>
        </section>
      </div>
    </div>
  );
};

export default Privacy;
