import React, { useEffect, useRef, useState } from 'react';

type TooltipProps = {
  content?: string | null;
  placement?: 'top' | 'bottom';
  children: React.ReactElement;
};

type TooltipChildProps = {
  ref?: React.Ref<Element>;
  'aria-describedby'?: string;
  onMouseEnter?: (event: React.MouseEvent<Element>) => void;
  onMouseLeave?: (event: React.MouseEvent<Element>) => void;
  onFocus?: (event: React.FocusEvent<Element>) => void;
  onBlur?: (event: React.FocusEvent<Element>) => void;
};

function setRef<T>(ref: React.Ref<T> | undefined, node: T | null) {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(node);
    return;
  }
  if ('current' in ref) {
    ref.current = node;
  }
}

const Tooltip: React.FC<TooltipProps> = ({ content, placement = 'top', children }) => {
  const idRef = useRef(`tooltip-${Math.random().toString(36).slice(2, 9)}`);
  const id = idRef.current;
  const [open, setOpen] = useState(false);
  const hostRef = useRef<Element | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || !content) return;
    let touchTimer: number | undefined;
    const handleTouch = (e: TouchEvent) => {
      e.stopPropagation();
      setOpen((s) => !s);
      if (touchTimer) window.clearTimeout(touchTimer);
      touchTimer = window.setTimeout(() => setOpen(false), 2500);
    };
    el.addEventListener('touchstart', handleTouch, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTouch as EventListener);
      if (touchTimer) window.clearTimeout(touchTimer);
    };
  }, [content]);

  const childProps = (children.props ?? {}) as TooltipChildProps;

  const merged = React.cloneElement(children, {
    ref: (node: Element | null) => {
      setRef(childProps.ref, node);
      hostRef.current = node;
    },
    'aria-describedby': content
      ? [childProps['aria-describedby'], id].filter(Boolean).join(' ')
      : childProps['aria-describedby'],
    onMouseEnter: (e: React.MouseEvent<Element>) => {
      setOpen(true);
      childProps.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent<Element>) => {
      setOpen(false);
      childProps.onMouseLeave?.(e);
    },
    onFocus: (e: React.FocusEvent<Element>) => {
      setOpen(true);
      childProps.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent<Element>) => {
      setOpen(false);
      childProps.onBlur?.(e);
    }
  });

  return (
    <span className="relative inline-flex">
      {merged}
      {content && open && (
        <span
          id={id}
          role="tooltip"
          className={`z-50 pointer-events-none absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap text-mini px-2 py-1 rounded shadow-[var(--shadow-elev-1)] dark:shadow-[var(--shadow-elev-1-dark)] bg-ink text-white dark:bg-muted-600 dark:text-white ${
            placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {content}
        </span>
      )}
    </span>
  );
};

export default Tooltip;
