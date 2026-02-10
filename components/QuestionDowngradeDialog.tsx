import React from 'react';
import { NoteType } from '../types';
import Modal from './Modal';
import { LoadingSpinner } from './Icons';
import { formatTemplate } from '../utils/text';
import { getTypeLabel } from '../utils/notes';
import type { TranslationKey } from '../utils/i18n';

interface QuestionDowngradeDialogProps {
  isOpen: boolean;
  relatedCount: number;
  selectedType: NoteType;
  typeOptions: NoteType[];
  destination: 'release' | 'relink';
  relinkTargets: Array<{ id: string; title: string }>;
  relinkQuestionId: string | null;
  isWorking: boolean;
  onSelectType: (type: NoteType) => void;
  onDestinationChange: (destination: 'release' | 'relink') => void;
  onSelectRelinkQuestion: (questionId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  t: (key: TranslationKey) => string;
}

const QuestionDowngradeDialog: React.FC<QuestionDowngradeDialogProps> = ({
  isOpen,
  relatedCount,
  selectedType,
  typeOptions,
  destination,
  relinkTargets,
  relinkQuestionId,
  isWorking,
  onSelectType,
  onDestinationChange,
  onSelectRelinkQuestion,
  onConfirm,
  onCancel,
  t
}) => {
  if (!isOpen) return null;

  const typeLabel = getTypeLabel(selectedType, t);
  const canRelink = relinkTargets.length > 0;
  const relinkTarget = relinkTargets.find((target) => target.id === relinkQuestionId) || null;
  const isRelink = destination === 'relink';
  const relatedLine = isRelink
    ? (relinkTarget
        ? formatTemplate(t('downgrade_question_relink'), { count: relatedCount, title: relinkTarget.title })
        : t('downgrade_question_relink_none'))
    : (relatedCount > 0
        ? formatTemplate(t('downgrade_question_related'), { count: relatedCount })
        : t('downgrade_question_related_none'));

  return (
    <Modal isOpen={isOpen} onClose={onCancel} cardClassName="max-w-md" isDismissable={!isWorking}>
      <div className="space-y-2 mb-5">
        <p className="text-ink dark:text-ink-dark text-lg font-medium">{t('downgrade_question_title')}</p>
        <p className="text-body-sm-muted">
          {formatTemplate(t('downgrade_question_body'), { type: typeLabel })}
        </p>
        <p className="text-body-sm-muted">{relatedLine}</p>
      </div>

      <div className="space-y-2 mb-6">
        <p className="text-mini-up text-subtle dark:text-subtle-dark">{t('downgrade_question_label')}</p>
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((type) => {
            const isSelected = type === selectedType;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onSelectType(type)}
                aria-pressed={isSelected}
                className={`chip-outline ${
                  isSelected
                    ? 'bg-accent/20 text-accent border-accent/30 dark:bg-accent-dark/20 dark:text-accent-dark dark:border-accent-dark/30'
                    : ''
                }`}
              >
                {getTypeLabel(type, t)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <p className="text-mini-up text-subtle dark:text-subtle-dark">{t('downgrade_question_destination_label')}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onDestinationChange('release')}
            aria-pressed={destination === 'release'}
            className={`chip-outline ${
              destination === 'release'
                ? 'bg-warning/15 text-warning border-warning/30 dark:bg-warning-dark/20 dark:text-warning-dark dark:border-warning-dark/30'
                : ''
            }`}
          >
            {t('downgrade_question_destination_release')}
          </button>
          <button
            type="button"
            onClick={() => onDestinationChange('relink')}
            aria-pressed={destination === 'relink'}
            disabled={!canRelink}
            className={`chip-outline ${
              destination === 'relink'
                ? 'bg-warning/15 text-warning border-warning/30 dark:bg-warning-dark/20 dark:text-warning-dark dark:border-warning-dark/30'
                : ''
            } ${
              !canRelink ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {t('downgrade_question_destination_relink')}
          </button>
        </div>
        {isRelink && (
          canRelink ? (
            <select
              className="input-pill text-sm"
              value={relinkQuestionId ?? ''}
              onChange={(event) => onSelectRelinkQuestion(event.target.value)}
              aria-label={t('downgrade_question_select_question')}
            >
              {relinkTargets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.title}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-body-sm-muted">{t('downgrade_question_relink_none')}</p>
          )
        )}
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
          disabled={isWorking || (isRelink && !relinkTarget)}
          className={`px-4 py-2 text-sm rounded-md bg-accent text-white hover:opacity-90 dark:bg-accent-dark dark:hover:opacity-90 transition-colors inline-flex items-center gap-2 ${
            isWorking || (isRelink && !relinkTarget) ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          {isWorking && <LoadingSpinner className="w-3.5 h-3.5 text-white" />}
          {t('downgrade_question_action')}
        </button>
      </div>
    </Modal>
  );
};

export default QuestionDowngradeDialog;
