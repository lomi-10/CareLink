// hooks/shared/useNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';

export interface Notification {
  notification_id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  ref_type: string | null;
  ref_id: number | null;
  created_at: string;
}

const ROLE_ENDPOINT: Record<string, string> = {
  helper: 'helper/get_notifications.php',
  parent: 'parent/get_notifications.php',
};

export function useNotifications(role: 'helper' | 'parent') {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) return;
      const user = JSON.parse(raw);
      const endpoint = ROLE_ENDPOINT[role];
      const res  = await fetch(`${API_URL}/${endpoint}?user_id=${user.user_id}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unread_count ?? 0);
      }
    } catch (e) {
      console.error('[useNotifications] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) return;
      const user = JSON.parse(raw);
      await fetch(`${API_URL}/shared/mark_read.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('[useNotifications] markAllRead error:', e);
    }
  };

  const markOneRead = async (notification_id: number) => {
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) return;
      const user = JSON.parse(raw);
      await fetch(`${API_URL}/shared/mark_read.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id, notification_id }),
      });
      setNotifications(prev =>
        prev.map(n => n.notification_id === notification_id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('[useNotifications] markOneRead error:', e);
    }
  };

  return { notifications, unreadCount, loading, refresh: fetchNotifications, markAllRead, markOneRead };
}
