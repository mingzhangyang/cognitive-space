import React from 'react';

interface QuestionGraphTooltipProps {
  title: string;
  content: string;
  style: React.CSSProperties;
}

const QuestionGraphTooltip: React.FC<QuestionGraphTooltipProps> = ({
  title,
  content,
  style
}) => {
  return (
    <div
      className="absolute z-10 max-w-xs rounded-lg border border-line dark:border-line-dark bg-surface dark:bg-surface-dark shadow-lg p-3 text-caption-ink"
      style={style}
    >
      <div className="font-semibold mb-1">
        {title}
      </div>
      <div className="text-subtle dark:text-subtle-dark leading-relaxed">
        {content}
      </div>
    </div>
  );
};

export default QuestionGraphTooltip;
