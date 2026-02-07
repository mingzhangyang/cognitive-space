import React from 'react';

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  sizeClassName?: string;
};

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(({
  label,
  sizeClassName = 'h-9 w-9',
  className = '',
  type = 'button',
  disabled,
  title,
  children,
  ...props
}, ref) => {
  const ariaLabel = props['aria-label'] ?? label;
  const resolvedTitle = title ?? label;
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
    <button
      ref={ref}
      type={type}
      className={classes}
      aria-label={ariaLabel}
      title={resolvedTitle}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
});

IconButton.displayName = 'IconButton';

export default IconButton;
