import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import Modal from './Modal';

type ConfirmDialogProps = {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: 'danger' | 'primary';
  isWorking?: boolean;
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  message,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
  confirmTone = 'danger',
  isWorking = false
}) => {
  const { t } = useAppContext();
  const resolvedCancelLabel = cancelLabel ?? t('cancel');
  const resolvedConfirmLabel = confirmLabel ?? (confirmTone === 'danger' ? t('delete') : t('confirm'));
  const confirmClassName = confirmTone === 'danger'
    ? 'px-4 py-2 text-sm rounded-md btn-danger transition-colors'
    : 'px-4 py-2 text-sm rounded-md bg-ink text-white dark:bg-muted-600 hover:opacity-90 transition-opacity';
  const disabledClassName = isWorking ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer';

  return (
    <Modal isOpen={isOpen} onClose={onCancel} cardClassName="max-w-sm" isDismissable={!isWorking}>
      <p className="text-ink dark:text-ink-dark mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={isWorking}
          className={`px-4 py-2 text-body-sm-muted hover:text-ink dark:hover:text-ink-dark transition-colors ${disabledClassName}`}
        >
          {resolvedCancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={isWorking}
          className={`${confirmClassName} ${disabledClassName}`}
        >
          {resolvedConfirmLabel}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
