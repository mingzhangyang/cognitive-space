import React from 'react';
import { Note } from '../types';
import { useAppContext } from '../contexts/AppContext';
import Modal from './Modal';

interface QuestionSelectorModalProps {
  isOpen: boolean;
  questions: Note[];
  onSelect: (questionId: string) => void;
  onCancel: () => void;
}

const QuestionSelectorModal: React.FC<QuestionSelectorModalProps> = ({
  isOpen,
  questions,
  onSelect,
  onCancel
}) => {
  const { t } = useAppContext();

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} cardClassName="max-w-md w-full max-h-[70vh] flex flex-col">
      <h3 className="text-lg font-medium text-ink dark:text-ink-dark mb-4">{t('select_question')}</h3>
      <div className="overflow-y-auto flex-1 space-y-2">
        {questions.length === 0 ? (
          <p className="text-body-sm-muted py-4 text-center">
            {t('no_questions_available')}
          </p>
        ) : (
          questions.map((q) => (
            <button
              key={q.id}
              onClick={() => onSelect(q.id)}
              className="w-full text-left p-3 rounded-lg border border-line dark:border-line-dark hover:border-warning/30 dark:hover:border-warning-dark/30 hover:bg-warning/5 dark:hover:bg-warning-dark/10 transition-colors cursor-pointer"
            >
              <p className="text-body-sm line-clamp-2">{q.content}</p>
            </button>
          ))
        )}
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-body-sm-muted hover:text-ink dark:hover:text-ink-dark transition-colors cursor-pointer"
        >
          {t('cancel')}
        </button>
      </div>
    </Modal>
  );
};

export default QuestionSelectorModal;
