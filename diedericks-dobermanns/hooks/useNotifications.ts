import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';

import { MOCK_NOTIFICATIONS } from '@/lib/mockData';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type { NotificationLog } from '@/types/app.types';

interface UseNotificationsResult {
  items: NotificationLog[];
  unreadCount: number;
  loading: boolean;
  markAllRead: () => void;
  refetch: () => Promise<void>;
}

/**
 * Loads the signed-in user's notification log, registers this device for push,
 * and keeps the inbox in sync with foreground notification events. Intended to
 * be mounted once in the authenticated layout.
 */
export function useNotifications(): UseNotificationsResult {
  const userId = useAuthStore((s) => s.session?.user.id);
  const items = useNotificationStore((s) => s.items);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const setItems = useNotificationStore((s) => s.setItems);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    if (!supabase || !userId) {
      setItems(MOCK_NOTIFICATIONS);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('notifications_log')
      .select('id, recipient_id, type, subject, body, status, sent_at')
      .eq('recipient_id', userId)
      .order('sent_at', { ascending: false });
    setItems((data ?? []) as NotificationLog[]);
    setLoading(false);
  }, [userId, setItems]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Refresh the inbox when a notification arrives or is tapped while open.
  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(() => {
      refetch();
    });
    const responded = Notifications.addNotificationResponseReceivedListener(() => {
      refetch();
    });
    return () => {
      received.remove();
      responded.remove();
    };
  }, [refetch]);

  return { items, unreadCount, loading, markAllRead, refetch };
}
