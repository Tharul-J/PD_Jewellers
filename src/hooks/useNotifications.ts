import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { mergeById, shouldPausePolling, useResumeOnOverlayClose } from '../lib/pollGuard';

interface Notification {
  _id: string;
  type: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByType, setUnreadByType] = useState<Record<string, number>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      // Merge by id so unchanged notifications keep their object identity and
      // the open bell dropdown isn't re-rendered on every tick.
      setNotifications(prev => mergeById(prev, data.notifications ?? []));
      setUnreadCount(data.unreadCount);
      setUnreadByType(data.unreadByType ?? {});
    } catch { /* silent */ }
  }, [user]);

  // Only the *background* ticks defer to the guard. An explicit refetch — mount,
  // tab focus, an action the user just took — always runs.
  const pollNotifications = useCallback(() => {
    if (shouldPausePolling()) return;
    fetchNotifications();
  }, [fetchNotifications]);

  useResumeOnOverlayClose(pollNotifications);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    try {
      await fetch('/api/notifications/read', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setUnreadCount(0);
      setUnreadByType({});
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* silent */ }
  }, [user]);

  const markReadByType = useCallback(async (type: string) => {
    if (!user) return;
    try {
      await fetch(`/api/notifications/read/${type}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setUnreadByType(prev => {
        const cleared = prev[type] ?? 0;
        if (cleared > 0) setUnreadCount(count => Math.max(0, count - cleared));
        return { ...prev, [type]: 0 };
      });
      setNotifications(prev => prev.map(n => (n.type === type ? { ...n, read: true } : n)));
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setUnreadByType({});
      return;
    }

    fetchNotifications();

    const start = () => {
      intervalRef.current = setInterval(pollNotifications, 5000);
    };
    const stop = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        fetchNotifications();
        start();
      }
    };

    start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, fetchNotifications, pollNotifications]);

  return { notifications, unreadCount, unreadByType, markReadByType, markAllRead, refetch: fetchNotifications };
}
