import React from 'react';
import Tooltip from './Tooltip';

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  sizeClassName?: string;
  /** Set to `false` to suppress the tooltip while keeping the aria-label. */
  showTooltip?: boolean;
};

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(({
  label,
  sizeClassName = 'h-9 w-9',
  className = '',
  type = 'button',
  disabled,
  title,
  showTooltip = true,
  children,
  ...props
}, ref) => {
  const ariaLabel = props['aria-label'] ?? label;
  const tooltipContent = showTooltip ? (title ?? label) : null;
  const classes = [
    'btn-icon',
    sizeClassName,
    !disabled && 'cursor-pointer',
    className,
    disabled && 'opacity-60 cursor-not-allowed'
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tooltip content={tooltipContent}>
      <button
        ref={ref}
        type={type}
        className={classes}
        aria-label={ariaLabel}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    </Tooltip>
  );
});

IconButton.displayName = 'IconButton';

export default IconButton;
