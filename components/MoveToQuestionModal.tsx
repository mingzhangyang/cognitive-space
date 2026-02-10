import React from 'react';
import Modal from './Modal';
import { LoadingSpinner } from './Icons';
import type { TranslationKey } from '../utils/i18n';

interface MoveToQuestionModalProps {
  isOpen: boolean;
  isWorking: boolean;
  questions: Array<{ id: string; title: string }>;
  selectedQuestionId: string | null;
  onSelectQuestion: (questionId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  t: (key: TranslationKey) => string;
}

const MoveToQuestionModal: React.FC<MoveToQuestionModalProps> = ({
  isOpen,
  isWorking,
  questions,
  selectedQuestionId,
  onSelectQuestion,
  onConfirm,
  onCancel,
  t
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isWorking && onCancel()}
      cardClassName="max-w-sm"
      isDismissable={!isWorking}
    >
      <div className="space-y-2 mb-5">
        <p className="text-ink dark:text-ink-dark text-lg font-medium">{t('move_to_question_title')}</p>
      </div>
      <div className="mb-6">
        <select
          className="input-pill text-sm"
          value={selectedQuestionId ?? ''}
          onChange={(e) => onSelectQuestion(e.target.value)}
          aria-label={t('select_question')}
        >
          {questions.map((q) => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={isWorking}
          className={`px-4 py-2 rounded-md text-body-sm-muted hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark transition-colors ${
            isWorking ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          {t('cancel')}
        </button>
        <button
          onClick={onConfirm}
          disabled={isWorking || !selectedQuestionId}
          className={`px-4 py-2 text-sm rounded-md bg-accent dark:bg-accent-dark text-white hover:opacity-90 transition-opacity inline-flex items-center gap-2 ${
            isWorking || !selectedQuestionId ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          {isWorking && <LoadingSpinner className="w-3.5 h-3.5 text-white" />}
          {t('move_to_question_confirm')}
        </button>
      </div>
    </Modal>
  );
};

export default MoveToQuestionModal;
