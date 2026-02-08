import React, { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from 'react';

export type NotificationVariant = 'info' | 'success' | 'warning' | 'error';

export type NotificationInput = {
  title?: string;
  message: string;
  variant?: NotificationVariant;
  duration?: number;
  id?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export type NotificationItem = {
  id: string;
  title?: string;
  message: string;
  variant: NotificationVariant;
  duration: number;
  createdAt: number;
  action?: {
    label: string;
    onClick: () => void;
  };
};

type NotificationContextProps = {
  notifications: NotificationItem[];
  notify: (input: NotificationInput) => string;
  dismiss: (id: string) => void;
  clearAll: () => void;
};

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

const createNotificationId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      timersRef.current.delete(id);
    }
  }, []);

  const notify = useCallback((input: NotificationInput) => {
    const id = input.id ?? createNotificationId();
    const duration = input.duration ?? 3800;
    const item: NotificationItem = {
      id,
      title: input.title,
      message: input.message,
      variant: input.variant ?? 'info',
      duration,
      createdAt: Date.now(),
      action: input.action,
    };

    setNotifications((prev) => {
      const existing = prev.find((entry) => entry.id === id);
      if (existing) {
        const timer = timersRef.current.get(id);
        if (timer) {
          window.clearTimeout(timer);
          timersRef.current.delete(id);
        }
      }
      const filtered = prev.filter((entry) => entry.id !== id);
      const next = [item, ...filtered].slice(0, 5);
      const nextIds = new Set(next.map((entry) => entry.id));
      filtered.forEach((entry) => {
        if (nextIds.has(entry.id)) return;
        const timer = timersRef.current.get(entry.id);
        if (timer) {
          window.clearTimeout(timer);
          timersRef.current.delete(entry.id);
        }
      });
      return next;
    });

    if (duration > 0) {
      const timer = window.setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, timer);
    }

    return id;
  }, [dismiss]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const value = useMemo(() => ({ notifications, notify, dismiss, clearAll }), [notifications, notify, dismiss, clearAll]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
