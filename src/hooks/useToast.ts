import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

let toastId = 0;

const listeners: ((toasts: Toast[]) => void)[] = [];
let currentToasts: Toast[] = [];

function notifyListeners() {
  listeners.forEach((fn) => fn([...currentToasts]));
}

export const toast = {
  success(title: string, message?: string, duration = 4000) {
    const id = `toast-${++toastId}`;
    const t: Toast = { id, type: 'success', title, message, duration };
    currentToasts = [...currentToasts, t];
    notifyListeners();
    if (duration > 0) {
      setTimeout(() => toast.dismiss(id), duration);
    }
    return id;
  },
  error(title: string, message?: string, duration = 5000) {
    const id = `toast-${++toastId}`;
    const t: Toast = { id, type: 'error', title, message, duration };
    currentToasts = [...currentToasts, t];
    notifyListeners();
    if (duration > 0) {
      setTimeout(() => toast.dismiss(id), duration);
    }
    return id;
  },
  info(title: string, message?: string, duration = 4000) {
    const id = `toast-${++toastId}`;
    const t: Toast = { id, type: 'info', title, message, duration };
    currentToasts = [...currentToasts, t];
    notifyListeners();
    if (duration > 0) {
      setTimeout(() => toast.dismiss(id), duration);
    }
    return id;
  },
  warning(title: string, message?: string, duration = 4500) {
    const id = `toast-${++toastId}`;
    const t: Toast = { id, type: 'warning', title, message, duration };
    currentToasts = [...currentToasts, t];
    notifyListeners();
    if (duration > 0) {
      setTimeout(() => toast.dismiss(id), duration);
    }
    return id;
  },
  dismiss(id: string) {
    currentToasts = currentToasts.filter((t) => t.id !== id);
    notifyListeners();
  },
};

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([...currentToasts]);

  const subscribe = useCallback(() => {
    const handler = (newToasts: Toast[]) => setToasts(newToasts);
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  useState(() => {
    const unsubscribe = subscribe();
    return unsubscribe;
  });

  return { toasts, dismiss: toast.dismiss };
}
