import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { t, language, setLanguage, theme, toggleTheme } = useAppContext();

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto px-6 py-8 relative transition-colors duration-300">
      <header className="mb-10 flex justify-between items-start">
        <Link to="/" className="text-xl font-serif font-bold tracking-tight text-ink dark:text-ink-dark hover:text-accent dark:hover:text-accent-dark transition-colors">
          Cognitive Space
        </Link>
        <div className="flex items-center gap-4">
          {!isHome && (
            <Link to="/" className="text-sm text-subtle dark:text-subtle-dark hover:text-ink dark:hover:text-ink-dark transition-colors">
              {t('back_problems')}
            </Link>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
              className="p-2 rounded-md text-subtle dark:text-subtle-dark hover:text-accent dark:hover:text-accent-dark hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
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
              className="p-2 rounded-md text-subtle dark:text-subtle-dark hover:text-accent dark:hover:text-accent-dark hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
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

      <main className="flex-1">
        {children}
      </main>

      <footer className="mt-20 py-6 border-t border-stone-200 dark:border-stone-800 text-center text-xs text-subtle dark:text-subtle-dark">
        <p>{t('footer_philosophy')}</p>
      </footer>
    </div>
  );
};

export default Layout;
