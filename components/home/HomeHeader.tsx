import React from 'react';

interface HomeHeaderProps {
  t: (key: string) => string;
  hasQuestions: boolean;
  questionCount: number;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({
  t,
  hasQuestions,
  questionCount
}) => {
  return (
    <div className="mb-7 sm:mb-8">
      <h1 className="page-title mb-2">
        {t('living_questions')}
        {hasQuestions && (
          <span className="ml-2 text-muted-400 dark:text-muted-500 tabular-nums font-sans text-lg sm:text-xl font-normal">
            {t('question_count_separator')} {questionCount}
          </span>
        )}
      </h1>
      <p className="page-subtitle">{t('problems_mind')}</p>
    </div>
  );
};

export default HomeHeader;
