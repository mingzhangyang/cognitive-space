import React from 'react';
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from '../Icons';
import ConfirmDialog from '../ConfirmDialog';
import Modal from '../Modal';
import { useAppContext } from '../../contexts/AppContext';
import type { ImportMode } from '../../services/storageService';

interface LayoutDataModalsProps {
  isDataMenuOpen: boolean;
  onCloseDataMenu: () => void;
  onOpenClearConfirm: () => void;
  isExporting: boolean;
  isImporting: boolean;
  onExport: () => void;
  onImportClick: () => void;
  isImportConfirmOpen: boolean;
  onImportCancel: () => void;
  importConfirmMessage: string;
  importMode: ImportMode;
  onImportModeChange: (mode: ImportMode) => void;
  importModeHelp: string;
  onImportConfirm: () => void;
  isClearConfirmOpen: boolean;
  onClearConfirm: () => void;
  onClearCancel: () => void;
  isClearing: boolean;
}

const LayoutDataModals: React.FC<LayoutDataModalsProps> = ({
  isDataMenuOpen,
  onCloseDataMenu,
  onOpenClearConfirm,
  isExporting,
  isImporting,
  onExport,
  onImportClick,
  isImportConfirmOpen,
  onImportCancel,
  importConfirmMessage,
  importMode,
  onImportModeChange,
  importModeHelp,
  onImportConfirm,
  isClearConfirmOpen,
  onClearConfirm,
  onClearCancel,
  isClearing
}) => {
  const { t } = useAppContext();

  return (
    <>
      <Modal isOpen={isDataMenuOpen} onClose={onCloseDataMenu} cardClassName="max-w-md w-full">
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-ink dark:text-ink-dark text-lg font-medium">{t('menu_data_label')}</p>
            <p className="text-body-sm-muted">{t('menu_data_action')}</p>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={onExport}
              className={`menu-item ${isExporting ? 'opacity-60 cursor-not-allowed' : ''}`}
              disabled={isExporting}
            >
              <span className="h-9 w-9 rounded-full border border-line dark:border-line-dark bg-surface/80 dark:bg-surface-dark/60 grid place-items-center text-subtle dark:text-subtle-dark">
                <ArrowDownIcon className="w-4 h-4" />
              </span>
              <span className="flex-1">
                <span className="block text-body-sm font-medium">{t('menu_export_data_label')}</span>
                <span className="block text-mini text-subtle dark:text-subtle-dark">
                  {t('menu_export_data_action')}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={onImportClick}
              className={`menu-item ${isImporting ? 'opacity-60 cursor-not-allowed' : ''}`}
              disabled={isImporting}
            >
              <span className="h-9 w-9 rounded-full border border-line dark:border-line-dark bg-surface/80 dark:bg-surface-dark/60 grid place-items-center text-subtle dark:text-subtle-dark">
                <ArrowUpIcon className="w-4 h-4" />
              </span>
              <span className="flex-1">
                <span className="block text-body-sm font-medium">{t('menu_import_data_label')}</span>
                <span className="block text-mini text-subtle dark:text-subtle-dark">
                  {t('menu_import_data_action')}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                onCloseDataMenu();
                onOpenClearConfirm();
              }}
              className="menu-item"
            >
              <span className="h-9 w-9 rounded-full border border-line dark:border-line-dark bg-surface/80 dark:bg-surface-dark/60 grid place-items-center text-subtle dark:text-subtle-dark">
                <TrashIcon className="w-4 h-4" />
              </span>
              <span className="flex-1">
                <span className="block text-body-sm font-medium">{t('menu_clear_data_label')}</span>
                <span className="block text-mini text-subtle dark:text-subtle-dark">
                  {t('menu_clear_data_action')}
                </span>
              </span>
            </button>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onCloseDataMenu}
              className="px-4 py-2 text-body-sm-muted hover:text-ink dark:hover:text-ink-dark transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={isImportConfirmOpen}
        onClose={onImportCancel}
        cardClassName="max-w-md"
        isDismissable={!isImporting}
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-ink dark:text-ink-dark text-lg font-medium">{t('import_data_title')}</p>
            <p className="text-body-sm-muted">{importConfirmMessage}</p>
          </div>
          <div className="space-y-2">
            <p className="text-mini-up text-subtle dark:text-subtle-dark">{t('import_mode_label')}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onImportModeChange('merge')}
                aria-pressed={importMode === 'merge'}
                disabled={isImporting}
                className={`chip-outline cursor-pointer ${
                  importMode === 'merge'
                    ? 'bg-warning/15 text-warning border-warning/30 dark:bg-warning-dark/20 dark:text-warning-dark dark:border-warning-dark/30'
                    : ''
                } ${isImporting ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {t('import_mode_merge_label')}
              </button>
              <button
                type="button"
                onClick={() => onImportModeChange('replace')}
                aria-pressed={importMode === 'replace'}
                disabled={isImporting}
                className={`chip-outline cursor-pointer ${
                  importMode === 'replace'
                    ? 'bg-warning/15 text-warning border-warning/30 dark:bg-warning-dark/20 dark:text-warning-dark dark:border-warning-dark/30'
                    : ''
                } ${isImporting ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {t('import_mode_replace_label')}
              </button>
            </div>
            <p className="text-caption text-subtle dark:text-subtle-dark">{importModeHelp}</p>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={onImportCancel}
              disabled={isImporting}
              className={`px-4 py-2 text-body-sm-muted hover:text-ink dark:hover:text-ink-dark transition-colors ${
                isImporting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {t('cancel')}
            </button>
            <button
              onClick={onImportConfirm}
              disabled={isImporting}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                importMode === 'replace'
                  ? 'btn-danger'
                  : 'bg-ink text-white dark:bg-muted-600 hover:opacity-90 transition-opacity'
              } ${isImporting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {t('import_data_action')}
            </button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        message={t('clear_data_confirm')}
        onConfirm={onClearConfirm}
        onCancel={onClearCancel}
        confirmLabel={t('clear_data_action')}
        confirmTone="danger"
        isWorking={isClearing}
      />
    </>
  );
};

export default LayoutDataModals;
