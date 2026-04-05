import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  sent_at: string;
}

const POLL_INTERVAL = 30_000; // 30 seconds

export const useInAppNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastCheckRef = useRef<string>(new Date().toISOString());
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const hasPushSupport = 'serviceWorker' in navigator && 'PushManager' in window;

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notifications_log')
      .select('*')
      .eq('user_id', user.id)
      .eq('read', false)
      .order('sent_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data as unknown as InAppNotification[]);
      setUnreadCount(data.length);
    }
  }, [user]);

  const pollNewNotifications = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notifications_log')
      .select('*')
      .eq('user_id', user.id)
      .eq('read', false)
      .gt('sent_at', lastCheckRef.current)
      .order('sent_at', { ascending: false });

    if (!error && data && data.length > 0) {
      // Show toast for new notifications (only if no push support)
      if (!hasPushSupport) {
        for (const n of data) {
          toast(n.title, { description: n.message, duration: 6000 });
        }
      }
      lastCheckRef.current = new Date().toISOString();
      // Refresh full unread list
      fetchUnread();
    }
  }, [user, hasPushSupport, fetchUnread]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase
      .from('notifications_log')
      .update({ read: true })
      .eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user || notifications.length === 0) return;
    const ids = notifications.map(n => n.id);
    await supabase
      .from('notifications_log')
      .update({ read: true })
      .in('id', ids);
    setNotifications([]);
    setUnreadCount(0);
  }, [user, notifications]);

  // Initial fetch + start polling
  useEffect(() => {
    if (!user) return;

    fetchUnread();
    lastCheckRef.current = new Date().toISOString();

    pollRef.current = setInterval(pollNewNotifications, POLL_INTERVAL);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        pollNewNotifications();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, fetchUnread, pollNewNotifications]);

  return {
    notifications,
    unreadCount,
    hasPushSupport,
    markAsRead,
    markAllAsRead,
    refetch: fetchUnread,
  };
};
