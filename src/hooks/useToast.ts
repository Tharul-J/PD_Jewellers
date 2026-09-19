import { useState, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const MAX_VISIBLE = 3;
const DISMISS_MS = 3500;

/**
 * Toast queue. Mounted once by ToastProvider — components reach it through
 * useToastContext() rather than calling this hook directly.
 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    if (!message) return;
    const id = nextId.current++;
    // A burst of failures (the admin bulk actions can fire several at once) must
    // not bury the screen, so the oldest drops off once the stack is full.
    setToasts(prev => [...prev, { id, message, type }].slice(-MAX_VISIBLE));
    timers.current.set(id, setTimeout(() => dismissToast(id), DISMISS_MS));
  }, [dismissToast]);

  return { toasts, showToast, dismissToast };
}
