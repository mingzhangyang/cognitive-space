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
  const [canShow, setCanShow] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(hover: none) and (pointer: coarse)');
    const update = () => setCanShow(!media.matches);
    update();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  const hasContent = Boolean(content);
  const shouldShowOnHover = hasContent && canShow;

  useEffect(() => {
    if (!hasContent) setOpen(false);
  }, [hasContent]);

  const childProps = (children.props ?? {}) as TooltipChildProps;

  const merged = React.cloneElement(children, {
    ref: (node: Element | null) => {
      setRef(childProps.ref, node);
    },
    'aria-describedby': hasContent
      ? [childProps['aria-describedby'], id].filter(Boolean).join(' ')
      : childProps['aria-describedby'],
    onMouseEnter: (e: React.MouseEvent<Element>) => {
      if (shouldShowOnHover) setOpen(true);
      childProps.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent<Element>) => {
      if (shouldShowOnHover) setOpen(false);
      childProps.onMouseLeave?.(e);
    },
    onFocus: (e: React.FocusEvent<Element>) => {
      if (hasContent) setOpen(true);
      childProps.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent<Element>) => {
      if (hasContent) setOpen(false);
      childProps.onBlur?.(e);
    }
  });

  return (
    <span className="relative inline-flex">
      {merged}
      {hasContent && open && (
        <span
          id={id}
          role="tooltip"
          className={`z-50 pointer-events-none absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap text-mini leading-tight px-2.5 py-1 rounded-md border border-line/60 dark:border-line-dark/60 shadow-[var(--shadow-elev-1)] dark:shadow-[var(--shadow-elev-1-dark)] bg-ink/95 text-white dark:bg-muted-700 dark:text-white animate-fade-in ${
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
