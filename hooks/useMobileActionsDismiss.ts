import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DEFAULT_IGNORE_SELECTORS = ['[data-mobile-actions]', '[data-mobile-actions-toggle]'];

type Options = {
  ignoreSelectors?: string[];
};

export const useMobileActionsDismiss = (
  activeId: string | null,
  setActiveId: (value: string | null) => void,
  options?: Options
) => {
  const location = useLocation();

  useEffect(() => {
    if (!activeId) return;
    const selectors = options?.ignoreSelectors ?? DEFAULT_IGNORE_SELECTORS;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (selectors.some((selector) => target.closest(selector))) return;
      setActiveId(null);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [activeId, setActiveId, options?.ignoreSelectors]);

  useEffect(() => {
    if (activeId) setActiveId(null);
  }, [location.key, activeId, setActiveId]);
};
