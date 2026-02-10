import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HomeIcon, InboxIcon, MenuIcon } from '../Icons';
import IconButton from '../IconButton';
import Tooltip from '../Tooltip';
import { useAppContext } from '../../contexts/AppContext';
import { useAssistantInbox } from '../../contexts/AssistantInboxContext';
import { useMenuFocus } from '../../hooks/useMenuFocus';
import LayoutMenu from './LayoutMenu';

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

  const menuItemCount = isHome ? 4 : 3;

  const {
    menuOpen,
    setMenuOpen,
    activeIndex,
    setActiveIndex,
    menuRef,
    menuButtonRef,
    menuItemRefs,
    handleMenuKeyDown
  } = useMenuFocus(menuItemCount);

  const hasRunningJobs = jobs.length > 0;
  const hasSuggestions = messages.length > 0;
  const inboxDotClassName = hasRunningJobs
    ? 'bg-warning dark:bg-warning-dark'
    : hasSuggestions
      ? 'bg-accent dark:bg-accent-dark'
      : 'bg-line dark:bg-line-dark';

  const handleToggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
    setMenuOpen(false);
  };

  const handleToggleTheme = () => {
    toggleTheme();
    setMenuOpen(false);
  };

  const handleOpenDataMenu = () => {
    setMenuOpen(false);
    onOpenDataMenu();
  };

  const handleNavigateAbout = () => {
    setMenuOpen(false);
    navigate('/about');
  };

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
          <LayoutMenu
            isOpen={menuOpen}
            isHome={isHome}
            language={language}
            theme={theme}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            menuItemRefs={menuItemRefs}
            onKeyDown={handleMenuKeyDown}
            onToggleLanguage={handleToggleLanguage}
            onToggleTheme={handleToggleTheme}
            onOpenDataMenu={handleOpenDataMenu}
            onNavigateAbout={handleNavigateAbout}
            t={t}
          />
        </div>
      </div>
    </header>
  );
};

export default LayoutHeader;
