import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { t, language, setLanguage, theme, toggleTheme } = useAppContext();

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto px-6 py-8 relative transition-colors duration-300">
      <header className="mb-10 flex justify-between items-center">
        <Link to="/" className="text-xl font-serif font-bold tracking-tight text-ink dark:text-ink-dark hover:text-accent dark:hover:text-accent-dark transition-colors">
          Cognitive Space
        </Link>
        {!isHome && (
          <Link to="/" className="text-sm text-subtle dark:text-subtle-dark hover:text-ink dark:hover:text-ink-dark transition-colors">
            {t('back_problems')}
          </Link>
        )}
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="mt-20 py-6 border-t border-stone-200 dark:border-stone-800 text-center text-xs text-subtle dark:text-subtle-dark flex flex-col gap-4">
        <p>{t('footer_philosophy')}</p>
        
        <div className="flex justify-center items-center gap-6">
          <button 
            onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
            className="hover:text-accent dark:hover:text-accent-dark font-medium"
          >
            {language === 'en' ? '中文' : 'English'}
          </button>
          <span className="text-stone-300 dark:text-stone-700">|</span>
          <button 
            onClick={toggleTheme}
            className="hover:text-accent dark:hover:text-accent-dark font-medium"
          >
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Layout;