import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DatabaseIcon,
  HomeIcon,
  InboxIcon,
  InfoIcon,
  MenuIcon,
  MoonIcon,
  SunIcon
} from '../Icons';
import IconButton from '../IconButton';
import Tooltip from '../Tooltip';
import { useAppContext } from '../../contexts/AppContext';
import { useAssistantInbox } from '../../contexts/AssistantInboxContext';

interface LayoutHeaderProps {
  isHome: boolean;
  onOpenInbox: () => void;
  onOpenDataMenu: () => void;
}

const LayoutHeader: React.FC<LayoutHeaderProps> = ({
  isHome,
  onOpenInbox,
  onOpenDataMenu
}) => {
  const { t, language, setLanguage, theme, toggleTheme } = useAppContext();
  const { messageCount, jobs, messages } = useAssistantInbox();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuItemRefs = useRef<Array<HTMLButtonElement | HTMLAnchorElement | null>>([]);

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

  const menuWasOpen = useRef(false);

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

  const hasRunningJobs = jobs.length > 0;
  const hasSuggestions = messages.length > 0;
  const inboxDotClassName = hasRunningJobs
    ? 'bg-warning dark:bg-warning-dark'
    : hasSuggestions
      ? 'bg-accent dark:bg-accent-dark'
      : 'bg-line dark:bg-line-dark';

  const aboutIndex = isHome ? 3 : 2;

  return (
    <header className="relative z-20 mb-8 sm:mb-10 flex flex-wrap items-center justify-between gap-3">
      <Link
        to="/"
        className="flex items-center gap-3 text-lg sm:text-xl font-serif font-bold tracking-tight text-ink dark:text-ink-dark hover:text-accent dark:hover:text-accent-dark transition-colors leading-tight cursor-pointer"
      >
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
          onClick={onOpenInbox}
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
            onClick={() => setMenuOpen((prev) => !prev)}
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
              <span aria-hidden="true" className="menu-caret" />
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
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
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
                    onOpenDataMenu();
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
  );
};

export default LayoutHeader;
