import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { HomeIcon } from './Icons';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { t, language, setLanguage, theme, toggleTheme } = useAppContext();

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto w-full px-5 sm:px-6 pt-6 sm:pt-9 pb-10 sm:pb-12 relative transition-colors duration-300">
      <header className="mb-8 sm:mb-10 flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="text-lg sm:text-xl font-serif font-bold tracking-tight text-ink dark:text-ink-dark hover:text-accent dark:hover:text-accent-dark transition-colors leading-tight">
          Cognitive Space
        </Link>
        <div className="flex items-center gap-3">
          {!isHome && (
            <Link to="/" className="text-sm text-subtle dark:text-subtle-dark hover:text-ink dark:hover:text-ink-dark transition-colors" aria-label={t('back_problems')} title={t('back_problems')}>
              <HomeIcon className="w-5 h-5" />
            </Link>
          )}
          <div className="flex items-center gap-2 rounded-full border border-stone-200/70 dark:border-stone-800/70 bg-white/70 dark:bg-stone-900/60 backdrop-blur px-2 py-1.5 sm:p-0 sm:border-transparent sm:bg-transparent sm:backdrop-blur-0">
            <button
              onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
              className="h-11 w-11 sm:h-9 sm:w-9 grid place-items-center rounded-full text-subtle dark:text-subtle-dark hover:text-accent dark:hover:text-accent-dark hover:bg-stone-100/80 dark:hover:bg-stone-800/80 transition-colors"
              aria-label={language === 'en' ? 'Switch language to Chinese' : 'Switch language to English'}
              title={language === 'en' ? 'Switch language to Chinese' : 'Switch language to English'}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18" />
                <path d="M12 3a16 16 0 0 1 0 18" />
                <path d="M12 3a16 16 0 0 0 0 18" />
              </svg>
            </button>
            <button
              onClick={toggleTheme}
              className="h-11 w-11 sm:h-9 sm:w-9 grid place-items-center rounded-full text-subtle dark:text-subtle-dark hover:text-accent dark:hover:text-accent-dark hover:bg-stone-100/80 dark:hover:bg-stone-800/80 transition-colors"
              aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
              title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            >
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
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 animate-fade-in">
        {children}
      </main>

      <footer className="relative mt-16 sm:mt-20 py-6 text-center text-[11px] sm:text-xs text-subtle dark:text-subtle-dark before:absolute before:top-0 before:left-0 before:right-20 sm:before:right-0 before:h-px before:bg-stone-200/80 dark:before:bg-stone-800">
        <p>{t('footer_philosophy')}</p>
      </footer>
    </div>
  );
};

export default Layout;
