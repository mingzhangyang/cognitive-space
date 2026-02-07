import { useCallback } from 'react';
import type React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useNotifications } from '../contexts/NotificationContext';

type CopyOptions = {
  successKey?: string;
  duration?: number;
};

const DEFAULT_DURATION = 2000;

export const useCopyToClipboard = (options: CopyOptions = {}) => {
  const { t } = useAppContext();
  const { notify } = useNotifications();
  const { successKey = 'copy_note_success', duration = DEFAULT_DURATION } = options;

  const copyText = useCallback(
    async (content: string, event?: React.SyntheticEvent) => {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      if (!content || typeof navigator === 'undefined') return false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(content);
          notify({ message: t(successKey), variant: 'success', duration });
          return true;
        }
      } catch {
        // Fall through to legacy copy.
      }
      if (typeof document === 'undefined') return false;
      const textArea = document.createElement('textarea');
      textArea.value = content;
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        notify({ message: t(successKey), variant: 'success', duration });
        return true;
      } finally {
        document.body.removeChild(textArea);
      }
    },
    [duration, notify, successKey, t]
  );

  return { copyText };
};
