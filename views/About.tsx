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

  const axioms = [
    {
      title: t('about_axiom_free_title'),
      body: t('about_axiom_free_body'),
    },
    {
      title: t('about_axiom_delayed_title'),
      body: t('about_axiom_delayed_body'),
    },
    {
      title: t('about_axiom_attention_title'),
      body: t('about_axiom_attention_body'),
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

  const boundaries = [
    t('about_boundary_1'),
    t('about_boundary_2'),
    t('about_boundary_3'),
    t('about_boundary_4'),
    t('about_boundary_5'),
    t('about_boundary_6'),
  ];

  return (
    <div className="space-y-12">
      {/* Hero / Intro */}
      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] items-start">
        <div className="space-y-4">
          <header className="space-y-2">
            <h1 className="page-title">{t('menu_about_title')}</h1>
            <p className="page-subtitle">{t('menu_about_intro')}</p>
          </header>

          <p className="text-body-sm-muted leading-relaxed">{t('about_intro_paragraph_1')}</p>
          <p className="text-body-sm-muted leading-relaxed">{t('about_intro_paragraph_2')}</p>
          <p className="text-body-sm-muted leading-relaxed">{t('about_intro_paragraph_3')}</p>

          <div className="flex items-center gap-3 pt-2">
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

      {/* Core Goals */}
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

      {/* Design Philosophy — 3 Axioms */}
      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-body-lg font-semibold text-ink dark:text-ink-dark">{t('about_philosophy_title')}</h2>
          <p className="text-body-sm-muted">{t('about_philosophy_intro')}</p>
        </div>

        <ol className="space-y-4 list-none">
          {axioms.map((axiom, index) => (
            <li
              key={axiom.title}
              className="relative rounded-2xl border border-line/60 bg-surface/70 p-4 pl-12 shadow-[var(--shadow-elev-1)] dark:border-line-dark/60 dark:bg-surface-dark/70 dark:shadow-[var(--shadow-elev-1-dark)]"
            >
              <span className="absolute left-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-bold tabular-nums dark:bg-accent-dark/15 dark:text-accent-dark">
                {index + 1}
              </span>
              <h3 className="text-body-sm font-semibold text-ink dark:text-ink-dark">{axiom.title}</h3>
              <p className="mt-1 text-body-sm-muted leading-relaxed">{axiom.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Cognition Model */}
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

      {/* System Behavior */}
      <section className="space-y-2">
        <h2 className="text-body-lg font-semibold text-ink dark:text-ink-dark">{t('about_behavior_title')}</h2>
        <p className="text-body-sm-muted">{t('about_behavior_paragraph')}</p>
        <ul className="space-y-2 text-body-sm-muted list-disc list-inside">
          {behaviorList.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Boundaries — What we will never do */}
      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-body-lg font-semibold text-ink dark:text-ink-dark">{t('about_boundaries_title')}</h2>
          <p className="text-body-sm-muted">{t('about_boundaries_intro')}</p>
        </div>

        <ul className="space-y-2">
          {boundaries.map((item, index) => (
            <li
              key={index}
              className="flex items-start gap-3 rounded-xl border border-line/40 bg-surface/50 px-4 py-3 text-body-sm-muted dark:border-line-dark/40 dark:bg-surface-dark/50"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line/80 text-muted-400 dark:border-line-dark/80 dark:text-muted-500" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 3l6 6M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Manifesto */}
      <section className="rounded-2xl border border-accent/20 bg-accent/5 p-6 text-center dark:border-accent-dark/20 dark:bg-accent-dark/5">
        <h2 className="text-body-lg font-semibold text-ink dark:text-ink-dark mb-3">{t('about_manifesto_title')}</h2>
        <blockquote className="font-serif text-xl leading-relaxed text-ink dark:text-ink-dark italic">
          "{t('about_manifesto_body')}"
        </blockquote>
        <p className="mt-3 text-body-sm-muted">{t('about_manifesto_closing')}</p>
      </section>
    </div>
  );
};

export default About;
