import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { useAppContext } from '../contexts/AppContext';
import { AlertIcon, CheckIcon, HelpIcon, XIcon } from './Icons';
import IconButton from './IconButton';

const variantStyles = {
  info: {
    icon: HelpIcon,
    iconWrap: 'bg-accent/10 text-accent dark:bg-accent-dark/10 dark:text-accent-dark',
    border: 'border-l-4 border-accent/70 dark:border-accent-dark/80',
  },
  success: {
    icon: CheckIcon,
    iconWrap: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300',
    border: 'border-l-4 border-emerald-500/70 dark:border-emerald-400/80',
  },
  warning: {
    icon: AlertIcon,
    iconWrap: 'bg-warning/10 text-warning dark:bg-warning-dark/10 dark:text-warning-dark',
    border: 'border-l-4 border-warning/70 dark:border-warning-dark/80',
  },
  error: {
    icon: XIcon,
    iconWrap: 'bg-red-500/10 text-red-600 dark:bg-red-500/10 dark:text-red-300',
    border: 'border-l-4 border-red-500/70 dark:border-red-400/80',
  },
} as const;

const NotificationToaster: React.FC = () => {
  const { t } = useAppContext();
  const { notifications, dismiss } = useNotifications();

  if (!notifications.length) {
    return null;
  }

  return (
    <div
      className="fixed right-4 left-4 sm:left-auto sm:right-6 top-4 sm:top-6 z-50 flex flex-col gap-3 w-full sm:w-96 pointer-events-none"
      aria-live="polite"
      aria-relevant="additions"
    >
      {notifications.map((notification) => {
        const styles = variantStyles[notification.variant];
        const Icon = styles.icon;
        return (
          <div
            key={notification.id}
            role="status"
            aria-atomic="true"
            className={`pointer-events-auto w-full rounded-2xl border border-line dark:border-line-dark bg-surface/95 dark:bg-surface-dark/90 backdrop-blur-sm px-4 py-3 flex gap-3 items-start shadow-[var(--shadow-elev-2)] dark:shadow-[var(--shadow-elev-2-dark)] animate-fade-in motion-reduce:animate-none ${styles.border}`}
          >
            <span className={`mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full ${styles.iconWrap}`}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
              {notification.title && (
                <div className="text-sm font-semibold text-ink dark:text-ink-dark">
                  {notification.title}
                </div>
              )}
              <div className="text-sm text-subtle dark:text-subtle-dark leading-relaxed break-words">
                {notification.message}
              </div>
              {notification.action && (
                <button
                  type="button"
                  onClick={() => {
                    notification.action!.onClick();
                    dismiss(notification.id);
                  }}
                  className="mt-1.5 text-sm font-semibold text-accent dark:text-accent-dark hover:underline cursor-pointer"
                >
                  {notification.action.label}
                </button>
              )}
            </div>
            <IconButton
              label={t('dismiss_notification')}
              sizeClassName="h-8 w-8"
              onClick={() => dismiss(notification.id)}
              className="text-muted-400 hover:text-ink dark:text-muted-400 dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
            >
              <XIcon className="h-4 w-4" />
            </IconButton>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationToaster;
