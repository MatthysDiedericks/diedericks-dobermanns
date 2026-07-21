import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { RefreshControl, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useNotifications } from '@/hooks/useNotifications';
import type { NotificationLog, NotificationType } from '@/types/app.types';

const ICON: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  push: 'notifications',
  email: 'mail',
  whatsapp: 'logo-whatsapp',
  application_confirmation: 'document-text',
  document_expiry: 'time-outline',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week(s) ago`;
  return new Date(iso).toLocaleDateString();
}

function NotificationCard({ item }: { item: NotificationLog }) {
  const isApplication = item.type === 'application_confirmation';

  return (
    <Card className="flex-row">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-gold/15">
        <Ionicons name={ICON[item.type] ?? 'notifications'} size={18} color={Colors.gold} />
      </View>
      <View className="ml-4 flex-1">
        {isApplication ? (
          <Badge label="Application" tone="gold" className="mb-2 self-start" />
        ) : null}
        <Typography variant="subtitle">{item.subject ?? 'Update'}</Typography>
        {item.body ? (
          <Typography variant="bodyMuted" className="mt-1" numberOfLines={isApplication ? undefined : 3}>
            {item.body}
          </Typography>
        ) : null}
        <Typography variant="caption" className="mt-2">
          {timeAgo(item.sent_at)}
        </Typography>
      </View>
    </Card>
  );
}

export default function NotificationsScreen() {
  const { items, loading, markAllRead, refetch } = useNotifications();

  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  return (
    <ScreenContainer
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Colors.gold} />
      }
    >
      <PageHeader eyebrow="Updates" title="Notifications" back={false} />
      <View className="gap-3 px-6">
        {loading && items.length === 0 ? (
          <CardListSkeleton count={3} />
        ) : !loading && items.length === 0 ? (
          <EmptyState title="No notifications yet" message="You're all caught up for now." />
        ) : (
          items.map((n) => <NotificationCard key={n.id} item={n} />)
        )}
      </View>
    </ScreenContainer>
  );
}
