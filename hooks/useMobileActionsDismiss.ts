import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const DEFAULT_IGNORE_SELECTORS = ['[data-mobile-actions]', '[data-mobile-actions-toggle]'];
/** Delay before listening for dismiss events to avoid immediate close on mobile touch */
const ACTIVATION_DELAY_MS = 100;

type Options = {
  ignoreSelectors?: string[];
};

export const useMobileActionsDismiss = (
  activeId: string | null,
  setActiveId: (value: string | null) => void,
  options?: Options
) => {
  const location = useLocation();
  const activatedAtRef = useRef<number>(0);

  useEffect(() => {
    if (!activeId) return;
    // Record activation time to ignore events triggered too soon after opening
    activatedAtRef.current = Date.now();
    const selectors = options?.ignoreSelectors ?? DEFAULT_IGNORE_SELECTORS;
    const isIgnoredNode = (node: Element) =>
      selectors.some((selector) => node.matches(selector) || Boolean(node.closest(selector)));
    const handlePointerDown = (event: PointerEvent) => {
      // Skip events that occur immediately after activation (mobile touch edge case)
      if (Date.now() - activatedAtRef.current < ACTIVATION_DELAY_MS) return;
      const target = event.target;
      const isInIgnoredArea = () => {
        if (typeof event.composedPath === 'function') {
          const path = event.composedPath().filter((node): node is Element => node instanceof Element);
          return path.some((node) => isIgnoredNode(node));
        }
        if (target instanceof Element) {
          return isIgnoredNode(target);
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
