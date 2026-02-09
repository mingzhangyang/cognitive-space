import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { LoadingSpinner, CheckIcon, XIcon } from './Icons';

type InlineEditFormProps = {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  rows?: number;
  className?: string;
};

const InlineEditForm: React.FC<InlineEditFormProps> = ({
  value,
  onChange,
  onSave,
  onCancel,
  isSaving,
  rows = 3,
  className = '',
}) => {
  const { t } = useAppContext();
  const isDisabled = isSaving || !value.trim();

  return (
    <div className={`space-y-2 ${className}`}>
      <textarea
        className="textarea-base"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            onSave();
          }
        }}
        rows={rows}
        autoFocus
      />
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={isDisabled}
          className={`flex items-center gap-1 px-3 py-1.5 text-sm bg-accent dark:bg-accent-dark text-white rounded-md hover:opacity-90 transition-opacity ${
            isDisabled ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          {isSaving ? <LoadingSpinner className="w-3.5 h-3.5 text-white" /> : <CheckIcon className="w-3.5 h-3.5" />}
          {isSaving ? t('saving') : t('save')}
        </button>
        <button
          onClick={onCancel}
          disabled={isSaving}
          className={`flex items-center gap-1 px-3 py-1.5 text-body-sm-muted hover:text-ink dark:hover:text-ink-dark transition-colors ${
            isSaving ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <XIcon className="w-3.5 h-3.5" />
          {t('cancel')}
        </button>
      </div>
    </div>
  );
};

export default InlineEditForm;
