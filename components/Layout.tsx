import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { HelpIcon, HomeIcon, InboxIcon, MenuIcon } from './Icons';
import { getSessionFooterLine } from '../services/footerLine';
import MessageCenterPanel from './MessageCenterPanel';
import { useAssistantInbox } from '../contexts/AssistantInboxContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { t, language, setLanguage, theme, toggleTheme } = useAppContext();
  const { messageCount, jobs, messages } = useAssistantInbox();
  const year = new Date().getFullYear();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [footerLine, setFooterLine] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuItemRefs = useRef<Array<HTMLButtonElement | HTMLAnchorElement | null>>([]);

  const focusMenuItem = (index: number) => {
    const itemCount = 3;
    const nextIndex = ((index % itemCount) + itemCount) % itemCount;
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
    ? 'bg-amber-400 dark:bg-amber-300'
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
        focusMenuItem(2);
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

  return (
    <div className="min-h-screen flex flex-col max-w-3xl mx-auto w-full px-5 sm:px-6 pt-6 sm:pt-9 pb-10 sm:pb-12 relative transition-colors duration-300">
      <header className="relative z-20 mb-8 sm:mb-10 flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="text-lg sm:text-xl font-serif font-bold tracking-tight text-ink dark:text-ink-dark hover:text-accent dark:hover:text-accent-dark transition-colors leading-tight">
          Cognitive Space
        </Link>
        <div className="flex items-center gap-2">
          {!isHome && (
            <Link
              to="/"
              className="btn-icon btn-glass-icon"
              aria-label={t('back_problems')}
              title={t('back_problems')}
            >
              <HomeIcon className="w-4 h-4" />
            </Link>
          )}
          <button
            onClick={() => {
              setIsInboxOpen(true);
            }}
            className="btn-icon btn-glass-icon btn-glass-icon-borderless relative"
            aria-label={t('assistant_inbox_title')}
            title={t('assistant_inbox_title')}
          >
            <InboxIcon className="w-4 h-4" />
            {messageCount > 0 && (
              <span
                className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full shadow-sm ${inboxDotClassName}`}
                aria-hidden="true"
              />
            )}
          </button>
          <div className="relative" ref={menuRef}>
            <button
              ref={menuButtonRef}
              onClick={() => setMenuOpen(prev => !prev)}
              className="btn-icon btn-glass-icon btn-glass-icon-borderless"
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
                    {language === 'en' ? 'EN' : '中文'}
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
                    <span className="block text-body-sm font-medium">{t('menu_theme_label')}</span>
                    <span className="block text-mini text-subtle dark:text-subtle-dark">
                      {theme === 'light' ? t('menu_theme_action_light') : t('menu_theme_action_dark')}
                    </span>
                  </span>
                </button>
                <a
                  role="menuitem"
                  ref={(el) => {
                    menuItemRefs.current[2] = el;
                  }}
                  href="https://github.com/mingzhangyang/cognitive-space#guide"
                  className="menu-item"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setMenuOpen(false)}
                  tabIndex={activeIndex === 2 ? 0 : -1}
                  onMouseEnter={() => setActiveIndex(2)}
                  onFocus={() => setActiveIndex(2)}
                >
                  <span className="h-9 w-9 rounded-full border border-line dark:border-line-dark bg-surface/80 dark:bg-surface-dark/60 grid place-items-center text-subtle dark:text-subtle-dark">
                    <HelpIcon className="w-4 h-4" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-body-sm font-medium">{t('help')}</span>
                    <span className="block text-mini text-subtle dark:text-subtle-dark">
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

      <footer className="relative mt-16 sm:mt-20 py-6 text-center text-mini-up text-subtle dark:text-subtle-dark before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-line dark:before:bg-line-dark">
        <p>{footerLine ?? t('footer_philosophy')}</p>
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

      <MessageCenterPanel
        isOpen={isInboxOpen}
        onClose={() => {
          setIsInboxOpen(false);
        }}
      />
    </div>
  );
};

export default Layout;
