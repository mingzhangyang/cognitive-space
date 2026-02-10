import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import MessageCenterPanel from './MessageCenterPanel';
import LayoutHeader from './layout/LayoutHeader';
import LayoutFooter from './layout/LayoutFooter';
import LayoutDataModals from './layout/LayoutDataModals';
import { useDataManagement } from '../hooks/useDataManagement';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { t } = useAppContext();

  const [isInboxOpen, setIsInboxOpen] = useState(false);

  const data = useDataManagement();

  return (
    <div className="min-h-screen flex flex-col max-w-3xl mx-auto w-full px-5 sm:px-6 pt-6 sm:pt-9 pb-10 sm:pb-12 relative transition-colors duration-300">
      <LayoutHeader
        isHome={isHome}
        onOpenInbox={() => setIsInboxOpen(true)}
        onOpenDataMenu={() => data.setIsDataMenuOpen(true)}
      />

      <main className="flex-1 animate-fade-in min-h-0">
        {children}
      </main>

      <LayoutFooter />

      <MessageCenterPanel
        isOpen={isInboxOpen}
        onClose={() => {
          setIsInboxOpen(false);
        }}
      />
      <input
        ref={data.importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={data.handleImportFileChange}
        aria-label={t('menu_import_data_label')}
      />
      <LayoutDataModals
        isDataMenuOpen={data.isDataMenuOpen}
        onCloseDataMenu={() => data.setIsDataMenuOpen(false)}
        onOpenClearConfirm={() => data.setIsClearConfirmOpen(true)}
        isExporting={data.isExporting}
        isImporting={data.isImporting}
        onExport={data.handleExportData}
        onImportClick={data.handleImportClick}
        isImportConfirmOpen={data.isImportConfirmOpen}
        onImportCancel={data.handleImportCancel}
        importConfirmMessage={data.importConfirmMessage}
        importMode={data.importMode}
        onImportModeChange={data.setImportMode}
        importModeHelp={data.importModeHelp}
        onImportConfirm={data.handleImportConfirm}
        isClearConfirmOpen={data.isClearConfirmOpen}
        onClearConfirm={data.handleClearData}
        onClearCancel={() => {
          if (!data.isClearing) data.setIsClearConfirmOpen(false);
        }}
        isClearing={data.isClearing}
      />
    </div>
  );
};

export default Layout;
