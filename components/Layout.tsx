import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { HelpIcon, HomeIcon, MenuIcon } from './Icons';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { t, language, setLanguage, theme, toggleTheme } = useAppContext();
  const year = new Date().getFullYear();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || menuButtonRef.current?.contains(target)) return;
      setMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen flex flex-col max-w-3xl mx-auto w-full px-5 sm:px-6 pt-6 sm:pt-9 pb-10 sm:pb-12 relative transition-colors duration-300">
      <header className="mb-8 sm:mb-10 flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="text-lg sm:text-xl font-serif font-bold tracking-tight text-ink dark:text-ink-dark hover:text-accent dark:hover:text-accent-dark transition-colors leading-tight">
          Cognitive Space
        </Link>
        <div className="flex items-center gap-2">
          {!isHome && (
            <Link
              to="/"
              className="h-11 w-11 sm:h-9 sm:w-9 btn-icon text-subtle dark:text-subtle-dark hover:text-accent dark:hover:text-accent-dark hover:bg-surface-hover/80 dark:hover:bg-surface-hover-dark/80 border border-line/70 dark:border-line-strong-dark/70 bg-surface/70 dark:bg-surface-dark/60 backdrop-blur"
              aria-label={t('back_problems')}
              title={t('back_problems')}
            >
              <HomeIcon className="w-4 h-4" />
            </Link>
          )}
          <div className="relative" ref={menuRef}>
            <button
              ref={menuButtonRef}
              onClick={() => setMenuOpen(prev => !prev)}
              className="h-11 w-11 sm:h-9 sm:w-9 btn-icon text-subtle dark:text-subtle-dark hover:text-accent dark:hover:text-accent-dark hover:bg-surface-hover/80 dark:hover:bg-surface-hover-dark/80 border border-line/70 dark:border-line-strong-dark/70 bg-surface/70 dark:bg-surface-dark/60 backdrop-blur"
              aria-label={menuOpen ? t('menu_close') : t('menu_open')}
              title={menuOpen ? t('menu_close') : t('menu_open')}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls="app-menu"
            >
              <MenuIcon className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div
                id="app-menu"
                role="menu"
                className="absolute right-0 mt-3 w-64 rounded-2xl border border-line/70 dark:border-line-strong-dark/70 bg-surface/90 dark:bg-surface-dark/80 backdrop-blur shadow-lg shadow-ink/5 dark:shadow-black/40 p-2 animate-fade-in"
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    setLanguage(language === 'en' ? 'zh' : 'en');
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-hover/80 dark:hover:bg-surface-hover-dark/80 transition-colors"
                >
                  <span className="h-9 w-9 rounded-full border border-line/60 dark:border-line-dark/60 bg-surface/80 dark:bg-surface-dark/80 grid place-items-center text-subtle dark:text-subtle-dark">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M3 12h18" />
                      <path d="M12 3a16 16 0 0 1 0 18" />
                      <path d="M12 3a16 16 0 0 0 0 18" />
                    </svg>
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-ink dark:text-ink-dark">{t('menu_language_label')}</span>
                    <span className="block text-[11px] text-subtle dark:text-subtle-dark">
                      {language === 'en' ? t('menu_language_action_en') : t('menu_language_action_zh')}
                    </span>
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-400 dark:text-muted-500">
                    {language === 'en' ? 'EN' : '中文'}
                  </span>
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    toggleTheme();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-hover/80 dark:hover:bg-surface-hover-dark/80 transition-colors"
                >
                  <span className="h-9 w-9 rounded-full border border-line/60 dark:border-line-dark/60 bg-surface/80 dark:bg-surface-dark/80 grid place-items-center text-subtle dark:text-subtle-dark">
                    {theme === 'light' ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 12.4A8.5 8.5 0 1 1 11.6 3a7 7 0 0 0 9.4 9.4Z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v2" />
                        <path d="M12 20v2" />
                        <path d="M4.9 4.9l1.4 1.4" />
                        <path d="M17.7 17.7l1.4 1.4" />
                        <path d="M2 12h2" />
                        <path d="M20 12h2" />
                        <path d="M4.9 19.1l1.4-1.4" />
                        <path d="M17.7 6.3l1.4-1.4" />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-ink dark:text-ink-dark">{t('menu_theme_label')}</span>
                    <span className="block text-[11px] text-subtle dark:text-subtle-dark">
                      {theme === 'light' ? t('menu_theme_action_light') : t('menu_theme_action_dark')}
                    </span>
                  </span>
                </button>
                <a
                  role="menuitem"
                  href="https://github.com/mingzhangyang/cognitive-space#guide"
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-hover/80 dark:hover:bg-surface-hover-dark/80 transition-colors"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="h-9 w-9 rounded-full border border-line/60 dark:border-line-dark/60 bg-surface/80 dark:bg-surface-dark/80 grid place-items-center text-subtle dark:text-subtle-dark">
                    <HelpIcon className="w-4 h-4" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-ink dark:text-ink-dark">{t('help')}</span>
                    <span className="block text-[11px] text-subtle dark:text-subtle-dark">
                      {t('menu_help_action')}
                    </span>
                  </span>
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 animate-fade-in min-h-0">
        {children}
      </main>

      <footer className="relative mt-16 sm:mt-20 py-6 text-center text-[11px] sm:text-xs text-subtle dark:text-subtle-dark before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-line/80 dark:before:bg-line-strong-dark">
        <p>{t('footer_philosophy')}</p>
        <p className="mt-1 flex items-center justify-center gap-2">
          <span>@{year} Orangely.xyz</span>
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
    </div>
  );
};

export default Layout;
