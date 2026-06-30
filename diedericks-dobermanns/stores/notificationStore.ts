import { create } from 'zustand';

import type { NotificationLog } from '@/types/app.types';

/** Counts items newer than the last time the user opened their inbox. */
function computeUnread(items: NotificationLog[], lastReadAt: string | null): number {
  if (!lastReadAt) return items.length;
  return items.filter((i) => i.sent_at > lastReadAt).length;
}

interface NotificationState {
  items: NotificationLog[];
  lastReadAt: string | null;
  unreadCount: number;
  setItems: (items: NotificationLog[]) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  lastReadAt: null,
  unreadCount: 0,
  setItems: (items) =>
    set({ items, unreadCount: computeUnread(items, get().lastReadAt) }),
  markAllRead: () =>
    set({ lastReadAt: new Date().toISOString(), unreadCount: 0 }),
}));
