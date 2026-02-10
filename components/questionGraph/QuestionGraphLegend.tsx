import React from 'react';

interface LegendItem {
  id: string;
  label: string;
  color: string;
}

interface QuestionGraphLegendProps {
  items: LegendItem[];
}

const QuestionGraphLegend: React.FC<QuestionGraphLegendProps> = ({ items }) => {
  return (
    <div className="absolute left-3 bottom-3 flex flex-wrap gap-2 text-micro text-muted-500 dark:text-muted-400 pointer-events-none">
      {items.map((item) => (
        <div
          key={`legend-${item.id}`}
          className="flex items-center gap-1.5 rounded-full border border-line/60 dark:border-line-dark/60 bg-surface/70 dark:bg-surface-dark/70 px-2 py-1 shadow-sm backdrop-blur-sm"
        >
          <span
            className="inline-flex h-2 w-2 rounded-full"
            style={{
              backgroundColor: item.color,
              boxShadow: `0 0 8px color-mix(in srgb, ${item.color} 60%, transparent)`
            }}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default QuestionGraphLegend;
