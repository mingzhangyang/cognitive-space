import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DatabaseIcon,
  HomeIcon,
  InboxIcon,
  InfoIcon,
  MenuIcon,
  MoonIcon,
  SunIcon,
  TrashIcon
} from './Icons';
import IconButton from './IconButton';
import Tooltip from './Tooltip';
import { getSessionFooterLine } from '../services/footerLine';
import MessageCenterPanel from './MessageCenterPanel';
import { useAssistantInbox } from '../contexts/AssistantInboxContext';
import {
  clearAllData,
  exportAppData,
  importAppData,
  parseAppDataExport,
  type AppDataExport,
  type ImportMode
} from '../services/storageService';
import ConfirmDialog from './ConfirmDialog';
import { useNotifications } from '../contexts/NotificationContext';
import { formatTemplate } from '../utils/text';
import Modal from './Modal';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { t, language, setLanguage, theme, toggleTheme } = useAppContext();
  const { messageCount, jobs, messages } = useAssistantInbox();
  const { notify } = useNotifications();
  const year = new Date().getFullYear();
  const footerBrandLine = formatTemplate(t('footer_brand_line'), { year });
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [footerLine, setFooterLine] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<AppDataExport | null>(null);
  const [pendingImportName, setPendingImportName] = useState('');
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuItemRefs = useRef<Array<HTMLButtonElement | HTMLAnchorElement | null>>([]);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const menuItemCount = isHome ? 4 : 3;

  const focusMenuItem = (index: number) => {
    const nextIndex = ((index % menuItemCount) + menuItemCount) % menuItemCount;
    setActiveIndex(nextIndex);
  };

  useEffect(() => {
    if (!menuOpen) return;

    const handleOutsideClick = (event: Event) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || menuButtonRef.current?.contains(target)) return;
      setMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    let isActive = true;
    void getSessionFooterLine(language).then((line) => {
      if (!isActive) return;
      setFooterLine(line);
    });
    return () => {
      isActive = false;
    };
  }, [language]);

  const menuWasOpen = useRef(false);
  const hasRunningJobs = jobs.length > 0;
  const hasSuggestions = messages.length > 0;
  const inboxDotClassName = hasRunningJobs
    ? 'bg-warning dark:bg-warning-dark'
    : hasSuggestions
      ? 'bg-accent dark:bg-accent-dark'
      : 'bg-line dark:bg-line-dark';

  useEffect(() => {
    if (!menuOpen) {
      if (menuWasOpen.current) {
        menuButtonRef.current?.focus();
      }
      menuWasOpen.current = false;
      return;
    }

    menuWasOpen.current = true;
    setActiveIndex(0);
    requestAnimationFrame(() => {
      menuItemRefs.current[0]?.focus();
    });
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    menuItemRefs.current[activeIndex]?.focus();
  }, [activeIndex, menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [menuOpen]);

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!menuOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusMenuItem(activeIndex + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusMenuItem(activeIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusMenuItem(0);
        break;
      case 'End':
        event.preventDefault();
        focusMenuItem(menuItemCount - 1);
        break;
      case 'Escape':
        event.preventDefault();
        setMenuOpen(false);
        break;
      case 'Tab':
        event.preventDefault();
        focusMenuItem(activeIndex + (event.shiftKey ? -1 : 1));
        break;
      default:
        break;
    }
  };

  const handleExportData = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setMenuOpen(false);
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
    setMenuOpen(false);
    setIsDataMenuOpen(false);
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const aboutIndex = isHome ? 3 : 2;
  const importConfirmMessage = pendingImport
    ? formatTemplate(t('import_data_confirm'), {
        notes: pendingImport.notes.length,
        events: pendingImport.events.length,
        file: pendingImportName || t('import_file_fallback')
      })
    : '';
  const importModeHelp = importMode === 'merge'
    ? t('import_mode_merge_hint')
    : t('import_mode_replace_hint');

  return (
    <div className="min-h-screen flex flex-col max-w-3xl mx-auto w-full px-5 sm:px-6 pt-6 sm:pt-9 pb-10 sm:pb-12 relative transition-colors duration-300">
      <header className="relative z-20 mb-8 sm:mb-10 flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3 text-lg sm:text-xl font-serif font-bold tracking-tight text-ink dark:text-ink-dark hover:text-accent dark:hover:text-accent-dark transition-colors leading-tight cursor-pointer">
          <span>{t('app_name')}</span>
        </Link>
        <div className="flex items-center gap-2">
          {!isHome && (
            <Tooltip content={t('back_problems')}>
              <Link
                to="/"
                className="btn-icon btn-glass-icon"
                aria-label={t('back_problems')}
              >
                <HomeIcon className="w-4 h-4" />
              </Link>
            </Tooltip>
          )}
          <IconButton
            label={t('assistant_inbox_title')}
            onClick={() => {
              setIsInboxOpen(true);
            }}
            className="btn-glass-icon btn-glass-icon-borderless relative"
          >
            <InboxIcon className="w-4 h-4" />
            {messageCount > 0 && (
              <span
                className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full shadow-[var(--shadow-elev-1)] dark:shadow-[var(--shadow-elev-1-dark)] ${inboxDotClassName}`}
                aria-hidden="true"
              />
            )}
          </IconButton>
          <div className="relative" ref={menuRef}>
            <IconButton
              ref={menuButtonRef}
              label={menuOpen ? t('menu_close') : t('menu_open')}
              onClick={() => setMenuOpen(prev => !prev)}
              className="btn-glass-icon btn-glass-icon-borderless"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls="app-menu"
            >
              <MenuIcon className="w-4 h-4" />
            </IconButton>
            {menuOpen && (
              <div
                id="app-menu"
                role="menu"
                className="menu-popover animate-fade-in motion-reduce:animate-none"
                onKeyDown={handleMenuKeyDown}
              >
                <span
                  aria-hidden="true"
                  className="menu-caret"
                />
                <button
                  role="menuitem"
                  ref={(el) => {
                    menuItemRefs.current[0] = el;
                  }}
                  onClick={() => {
                    setLanguage(language === 'en' ? 'zh' : 'en');
                    setMenuOpen(false);
                  }}
                  className="menu-item"
                  tabIndex={activeIndex === 0 ? 0 : -1}
                  onMouseEnter={() => setActiveIndex(0)}
                  onFocus={() => setActiveIndex(0)}
                >
                  <span className="h-9 w-9 rounded-full border border-line dark:border-line-dark bg-surface/80 dark:bg-surface-dark/60 grid place-items-center text-subtle dark:text-subtle-dark">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M3 12h18" />
                      <path d="M12 3a16 16 0 0 1 0 18" />
                      <path d="M12 3a16 16 0 0 0 0 18" />
                    </svg>
                  </span>
                  <span className="flex-1">
                    <span className="block text-body-sm font-medium">{t('menu_language_label')}</span>
                    <span className="block text-mini text-subtle dark:text-subtle-dark">
                      {language === 'en' ? t('menu_language_action_en') : t('menu_language_action_zh')}
                    </span>
                  </span>
                  <span className="text-micro uppercase tracking-[0.2em] text-muted-400 dark:text-muted-400">
                    {language === 'en' ? t('menu_language_en') : t('menu_language_zh')}
                  </span>
                </button>
                <button
                  role="menuitem"
                  ref={(el) => {
                    menuItemRefs.current[1] = el;
                  }}
                  onClick={() => {
                    toggleTheme();
                    setMenuOpen(false);
                  }}
                  className="menu-item"
                  tabIndex={activeIndex === 1 ? 0 : -1}
                  onMouseEnter={() => setActiveIndex(1)}
                  onFocus={() => setActiveIndex(1)}
                >
                  <span className="h-9 w-9 rounded-full border border-line dark:border-line-dark bg-surface/80 dark:bg-surface-dark/60 grid place-items-center text-subtle dark:text-subtle-dark">
                    {theme === 'light' ? (
                      <MoonIcon className="w-4 h-4" />
                    ) : (
                      <SunIcon className="w-4 h-4" />
                    )}
                  </span>
                  <span className="flex-1">
                    <span className="block text-body-sm font-medium">{t('menu_theme_label')}</span>
                    <span className="block text-mini text-subtle dark:text-subtle-dark">
                      {theme === 'light' ? t('menu_theme_action_light') : t('menu_theme_action_dark')}
                    </span>
                  </span>
                </button>
                {isHome && (
                  <button
                    role="menuitem"
                    ref={(el) => {
                      menuItemRefs.current[2] = el;
                    }}
                    onClick={() => {
                      setMenuOpen(false);
                      setIsDataMenuOpen(true);
                    }}
                    className="menu-item"
                    tabIndex={activeIndex === 2 ? 0 : -1}
                    onMouseEnter={() => setActiveIndex(2)}
                    onFocus={() => setActiveIndex(2)}
                  >
                    <span className="h-9 w-9 rounded-full border border-line dark:border-line-dark bg-surface/80 dark:bg-surface-dark/60 grid place-items-center text-subtle dark:text-subtle-dark">
                      <DatabaseIcon className="w-4 h-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-body-sm font-medium">{t('menu_data_label')}</span>
                      <span className="block text-mini text-subtle dark:text-subtle-dark">
                        {t('menu_data_action')}
                      </span>
                    </span>
                  </button>
                )}
                <button
                  role="menuitem"
                  ref={(el) => {
                    menuItemRefs.current[aboutIndex] = el;
                  }}
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/about');
                  }}
                  className="menu-item"
                  tabIndex={activeIndex === aboutIndex ? 0 : -1}
                  onMouseEnter={() => setActiveIndex(aboutIndex)}
                  onFocus={() => setActiveIndex(aboutIndex)}
                >
                  <span className="h-9 w-9 rounded-full border border-line dark:border-line-dark bg-surface/80 dark:bg-surface-dark/60 grid place-items-center text-subtle dark:text-subtle-dark">
                    <InfoIcon className="w-4 h-4" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-body-sm font-medium">{t('menu_about_label')}</span>
                    <span className="block text-mini text-subtle dark:text-subtle-dark">
                      {t('menu_about_action')}
                    </span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 animate-fade-in min-h-0">
        {children}
      </main>

      <footer className="relative mt-16 sm:mt-20 py-6 text-center text-mini-up text-subtle dark:text-subtle-dark before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-line dark:before:bg-line-dark">
        <p>{footerLine ?? t('footer_philosophy')}</p>
        <p className="mt-1 flex items-center justify-center gap-2">
          <span>{footerBrandLine}</span>
          <span aria-hidden="true" className="text-muted-300 dark:text-muted-700">|</span>
          <Link
            to="/privacy"
            className="hover:text-ink dark:hover:text-ink-dark transition-colors"
            aria-label={t('privacy_title')}
          >
            {t('privacy_title')}
          </Link>
          <span aria-hidden="true" className="text-muted-300 dark:text-muted-700">|</span>
          <a
            href="https://github.com/mingzhangyang/cognitive-space/issues"
            className="hover:text-ink dark:hover:text-ink-dark transition-colors"
            target="_blank"
            rel="noreferrer"
            aria-label={t('issues_title')}
          >
            {t('issues_title')}
          </a>
        </p>
      </footer>

      <MessageCenterPanel
        isOpen={isInboxOpen}
        onClose={() => {
          setIsInboxOpen(false);
        }}
      />
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportFileChange}
        aria-label={t('menu_import_data_label')}
      />
      <Modal
        isOpen={isDataMenuOpen}
        onClose={() => setIsDataMenuOpen(false)}
        cardClassName="max-w-md w-full"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-ink dark:text-ink-dark text-lg font-medium">{t('menu_data_label')}</p>
            <p className="text-body-sm-muted">{t('menu_data_action')}</p>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleExportData}
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
              onClick={handleImportClick}
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
                setIsDataMenuOpen(false);
                setIsClearConfirmOpen(true);
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
              onClick={() => setIsDataMenuOpen(false)}
              className="px-4 py-2 text-body-sm-muted hover:text-ink dark:hover:text-ink-dark transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={isImportConfirmOpen}
        onClose={handleImportCancel}
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
                onClick={() => setImportMode('merge')}
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
                onClick={() => setImportMode('replace')}
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
              onClick={handleImportCancel}
              disabled={isImporting}
              className={`px-4 py-2 text-body-sm-muted hover:text-ink dark:hover:text-ink-dark transition-colors ${
                isImporting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleImportConfirm}
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
        onConfirm={handleClearData}
        onCancel={() => {
          if (!isClearing) setIsClearConfirmOpen(false);
        }}
        confirmLabel={t('clear_data_action')}
        confirmTone="danger"
        isWorking={isClearing}
      />
    </div>
  );
};

export default Layout;
