import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

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
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setUnreadByType(data.unreadByType ?? {});
    } catch { /* silent */ }
  }, [user]);

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
      intervalRef.current = setInterval(fetchNotifications, 5000);
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
  }, [user, fetchNotifications]);

  return { notifications, unreadCount, unreadByType, markReadByType, markAllRead, refetch: fetchNotifications };
}
