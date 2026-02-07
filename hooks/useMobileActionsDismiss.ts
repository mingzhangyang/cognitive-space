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
      const target = event.target;
      const isInIgnoredArea = () => {
        if (typeof event.composedPath === 'function') {
          const path = event.composedPath().filter((node): node is Element => node instanceof Element);
          return selectors.some((selector) => path.some((node) => node.matches(selector)));
        }
        if (target instanceof Element) {
          return selectors.some((selector) => Boolean(target.closest(selector)));
        }
        return false;
      };
      if (isInIgnoredArea()) return;
      setActiveId(null);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [activeId, setActiveId, options?.ignoreSelectors]);

  useEffect(() => {
    if (activeId) setActiveId(null);
  }, [location.key, activeId, setActiveId]);
};
