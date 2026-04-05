import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { markNotificationRead, markAllNotificationsRead } from '../utils/notificationUtils';

/**
 * Hook quản lý notifications realtime cho một user.
 * @param {string|null} userId - auth.uid() của user hiện tại
 */
export const useNotifications = (userId) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // ─── Fetch initial list ───────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[useNotifications] fetch error:', error.message);
      setLoading(false);
      return;
    }

    const list = data || [];
    setNotifications(list);
    setUnreadCount(list.filter((n) => !n.is_read).length);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  // ─── Realtime subscription ────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev].slice(0, 50));
          setUnreadCount((prev) => prev + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // ─── Actions ──────────────────────────────────────────────
  const markRead = useCallback(async (id) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await markAllNotificationsRead(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [userId]);

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    refetch: fetchNotifications,
  };
};
