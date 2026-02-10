import type { ChangeEvent } from 'react';
import { useMemo, useRef, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useNotifications } from '../contexts/NotificationContext';
import {
  clearAllData,
  exportAppData,
  importAppData,
  parseAppDataExport,
  type AppDataExport,
  type ImportMode
} from '../services/storageService';
import { formatTemplate } from '../utils/text';

export const useDataManagement = () => {
  const { t } = useAppContext();
  const { notify } = useNotifications();

  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<AppDataExport | null>(null);
  const [pendingImportName, setPendingImportName] = useState('');
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const importInputRef = useRef<HTMLInputElement | null>(null);

  const importConfirmMessage = useMemo(() => {
    if (!pendingImport) return '';
    return formatTemplate(t('import_data_confirm'), {
      notes: pendingImport.notes.length,
      events: pendingImport.events.length,
      file: pendingImportName || t('import_file_fallback')
    });
  }, [pendingImport, pendingImportName, t]);

  const importModeHelp = importMode === 'merge'
    ? t('import_mode_merge_hint')
    : t('import_mode_replace_hint');

  const handleExportData = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setIsDataMenuOpen(false);
    try {
      const payload = await exportAppData();
      if (!payload || typeof document === 'undefined') {
        notify({ message: t('export_failed'), variant: 'error' });
        return;
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStamp = new Date(payload.exportedAt).toISOString().slice(0, 10);
      link.href = url;
      link.download = `${t('export_file_base')}-${dateStamp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      notify({ message: t('export_ready'), variant: 'success' });
    } catch (error) {
      console.error('Failed to export data', error);
      notify({ message: t('export_failed'), variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearData = async () => {
    if (isClearing) return;
    setIsClearing(true);
    const success = await clearAllData();
    setIsClearing(false);
    setIsClearConfirmOpen(false);
    if (!success) {
      notify({ message: t('clear_failed'), variant: 'error' });
      return;
    }
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleImportClick = () => {
    if (isImporting) return;
    setIsDataMenuOpen(false);
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;
    try {
      const content = await file.text();
      const parsed = parseAppDataExport(JSON.parse(content));
      if (!parsed) {
        notify({ message: t('import_invalid'), variant: 'error' });
        return;
      }
      setPendingImport(parsed);
      setPendingImportName(file.name);
      setIsImportConfirmOpen(true);
    } catch (error) {
      console.error('Failed to import data', error);
      notify({ message: t('import_failed'), variant: 'error' });
    }
  };

  const handleImportConfirm = async () => {
    if (!pendingImport || isImporting) return;
    setIsImporting(true);
    const success = await importAppData(pendingImport, importMode);
    setIsImporting(false);
    setIsImportConfirmOpen(false);
    setPendingImport(null);
    setPendingImportName('');
    if (!success) {
      notify({ message: t('import_failed'), variant: 'error' });
      return;
    }
    notify({ message: t('import_success'), variant: 'success' });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleImportCancel = () => {
    if (isImporting) return;
    setIsImportConfirmOpen(false);
    setPendingImport(null);
    setPendingImportName('');
  };

  return {
    isDataMenuOpen,
    isExporting,
    isImporting,
    isImportConfirmOpen,
    importMode,
    isClearConfirmOpen,
    isClearing,
    importInputRef,
    importConfirmMessage,
    importModeHelp,
    setIsDataMenuOpen,
    setIsClearConfirmOpen,
    setImportMode,
    handleExportData,
    handleClearData,
    handleImportClick,
    handleImportFileChange,
    handleImportConfirm,
    handleImportCancel
  };
};
