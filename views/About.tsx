import React from 'react';
import { useAppContext } from '../contexts/AppContext';

const About: React.FC = () => {
  const { t } = useAppContext();

  const goalPoints = [
    {
      title: t('about_goal_externalize_title'),
      body: t('about_goal_externalize_body'),
    },
    {
      title: t('about_goal_aggregate_title'),
      body: t('about_goal_aggregate_body'),
    },
    {
      title: t('about_goal_cost_title'),
      body: t('about_goal_cost_body'),
    },
    {
      title: t('about_goal_ai_title'),
      body: t('about_goal_ai_body'),
    },
  ];

  const cognitionUnits = [
    {
      title: t('about_model_question_title'),
      body: t('about_model_question_body'),
    },
    {
      title: t('about_model_claim_title'),
      body: t('about_model_claim_body'),
    },
    {
      title: t('about_model_evidence_title'),
      body: t('about_model_evidence_body'),
    },
    {
      title: t('about_model_trigger_title'),
      body: t('about_model_trigger_body'),
    },
  ];

  const behaviorList = [
    t('about_behavior_item_write'),
    t('about_behavior_item_structure'),
    t('about_behavior_item_hint'),
  ];

  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] items-start">
        <div className="space-y-4">
          <header className="space-y-2">
            <h1 className="page-title">{t('menu_about_title')}</h1>
            <p className="page-subtitle">{t('menu_about_intro')}</p>
          </header>

          <p className="text-body-sm-muted leading-relaxed">{t('about_intro_paragraph_1')}</p>
          <p className="text-body-sm-muted leading-relaxed">{t('about_intro_paragraph_2')}</p>
          <p className="text-body-sm-muted leading-relaxed">{t('about_intro_paragraph_3')}</p>

          <div className="flex items-center gap-3">
            <img
              src="/favicon.svg"
              alt={t('app_name')}
              className="h-24 w-24 rounded-2xl border border-line/60 bg-transparent p-1 shadow-[var(--shadow-elev-1)] dark:border-line-dark/60 dark:bg-transparent"
            />
            <p className="text-body-sm font-medium text-ink dark:text-ink-dark">{t('app_name')}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-line/60 bg-surface/70 p-5 shadow-[var(--shadow-elev-1)] dark:border-line-dark/60 dark:bg-surface-dark/70 dark:shadow-[var(--shadow-elev-1-dark)]">
          <img src="/about-hero.svg" alt={t('about_hero_alt')} className="w-full" />
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-body-lg font-semibold text-ink dark:text-ink-dark">{t('about_goals_title')}</h2>
          <p className="text-body-sm-muted">{t('about_goals_intro')}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {goalPoints.map((point) => (
            <article
              key={point.title}
              className="space-y-2 rounded-2xl border border-line/60 bg-surface/70 p-4 shadow-[var(--shadow-elev-1)] dark:border-line-dark/60 dark:bg-surface-dark/70 dark:shadow-[var(--shadow-elev-1-dark)]"
            >
              <h3 className="text-body-sm font-semibold text-ink dark:text-ink-dark">{point.title}</h3>
              <p className="text-body-sm-muted">{point.body}</p>
            </article>
          ))}
        </div>

        <p className="text-body-sm-muted">{t('about_non_goals')}</p>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-body-lg font-semibold text-ink dark:text-ink-dark">{t('about_model_title')}</h2>
          <p className="text-body-sm-muted">{t('about_model_intro')}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {cognitionUnits.map((unit) => (
            <article
              key={unit.title}
              className="space-y-2 rounded-2xl border border-line/60 bg-surface/70 p-4 shadow-[var(--shadow-elev-1)] dark:border-line-dark/60 dark:bg-surface-dark/70 dark:shadow-[var(--shadow-elev-1-dark)]"
            >
              <h3 className="text-body-sm font-semibold text-ink dark:text-ink-dark">{unit.title}</h3>
              <p className="text-body-sm-muted leading-relaxed">{unit.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-body-lg font-semibold text-ink dark:text-ink-dark">{t('about_behavior_title')}</h2>
        <p className="text-body-sm-muted">{t('about_behavior_paragraph')}</p>
        <ul className="space-y-2 text-body-sm-muted list-disc list-inside">
          {behaviorList.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default About;
