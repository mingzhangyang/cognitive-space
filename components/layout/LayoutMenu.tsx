import React from 'react';
import { DatabaseIcon, InfoIcon, MoonIcon, SunIcon } from '../Icons';
import { Language, Theme } from '../../contexts/AppContext';

interface LayoutMenuProps {
  isOpen: boolean;
  isHome: boolean;
  language: Language;
  theme: Theme;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  menuItemRefs: React.MutableRefObject<Array<HTMLButtonElement | HTMLAnchorElement | null>>;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onToggleLanguage: () => void;
  onToggleTheme: () => void;
  onOpenDataMenu: () => void;
  onNavigateAbout: () => void;
  t: (key: string) => string;
}

interface LayoutMenuItemProps {
  index: number;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  menuItemRefs: React.MutableRefObject<Array<HTMLButtonElement | HTMLAnchorElement | null>>;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  rightLabel?: string;
}

const LayoutMenuItem: React.FC<LayoutMenuItemProps> = ({
  index,
  activeIndex,
  setActiveIndex,
  menuItemRefs,
  onClick,
  icon,
  title,
  subtitle,
  rightLabel
}) => {
  return (
    <button
      role="menuitem"
      ref={(el) => {
        menuItemRefs.current[index] = el;
      }}
      onClick={onClick}
      className="menu-item"
      tabIndex={activeIndex === index ? 0 : -1}
      onMouseEnter={() => setActiveIndex(index)}
      onFocus={() => setActiveIndex(index)}
    >
      <span className="h-9 w-9 rounded-full border border-line dark:border-line-dark bg-surface/80 dark:bg-surface-dark/60 grid place-items-center text-subtle dark:text-subtle-dark">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-body-sm font-medium">{title}</span>
        {subtitle && (
          <span className="block text-mini text-subtle dark:text-subtle-dark">
            {subtitle}
          </span>
        )}
      </span>
      {rightLabel && (
        <span className="text-micro uppercase tracking-[0.2em] text-muted-400 dark:text-muted-400">
          {rightLabel}
        </span>
      )}
    </button>
  );
};

const LayoutMenu: React.FC<LayoutMenuProps> = ({
  isOpen,
  isHome,
  language,
  theme,
  activeIndex,
  setActiveIndex,
  menuItemRefs,
  onKeyDown,
  onToggleLanguage,
  onToggleTheme,
  onOpenDataMenu,
  onNavigateAbout,
  t
}) => {
  if (!isOpen) return null;

  const aboutIndex = isHome ? 3 : 2;

  return (
    <div
      id="app-menu"
      role="menu"
      className="menu-popover animate-fade-in motion-reduce:animate-none"
      onKeyDown={onKeyDown}
    >
      <span aria-hidden="true" className="menu-caret" />
      <LayoutMenuItem
        index={0}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
        menuItemRefs={menuItemRefs}
        onClick={onToggleLanguage}
        icon={(
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
        )}
        title={t('menu_language_label')}
        subtitle={language === 'en' ? t('menu_language_action_en') : t('menu_language_action_zh')}
        rightLabel={language === 'en' ? t('menu_language_en') : t('menu_language_zh')}
      />
      <LayoutMenuItem
        index={1}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
        menuItemRefs={menuItemRefs}
        onClick={onToggleTheme}
        icon={theme === 'light' ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />}
        title={t('menu_theme_label')}
        subtitle={theme === 'light' ? t('menu_theme_action_light') : t('menu_theme_action_dark')}
      />
      {isHome && (
        <LayoutMenuItem
          index={2}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          menuItemRefs={menuItemRefs}
          onClick={onOpenDataMenu}
          icon={<DatabaseIcon className="w-4 h-4" />}
          title={t('menu_data_label')}
          subtitle={t('menu_data_action')}
        />
      )}
      <LayoutMenuItem
        index={aboutIndex}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
        menuItemRefs={menuItemRefs}
        onClick={onNavigateAbout}
        icon={<InfoIcon className="w-4 h-4" />}
        title={t('menu_about_label')}
        subtitle={t('menu_about_action')}
      />
    </div>
  );
};

export default LayoutMenu;
