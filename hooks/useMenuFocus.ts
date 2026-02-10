import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

export const useMenuFocus = (menuItemCount: number) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuItemRefs = useRef<Array<HTMLButtonElement | HTMLAnchorElement | null>>([]);

  const focusMenuItem = useCallback((index: number) => {
    const nextIndex = ((index % menuItemCount) + menuItemCount) % menuItemCount;
    setActiveIndex(nextIndex);
  }, [menuItemCount]);

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

  const handleMenuKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
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
  }, [activeIndex, focusMenuItem, menuItemCount, menuOpen]);

  return {
    menuOpen,
    setMenuOpen,
    activeIndex,
    setActiveIndex,
    menuRef,
    menuButtonRef,
    menuItemRefs,
    handleMenuKeyDown
  };
};
