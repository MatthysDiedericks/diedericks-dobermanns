import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useClientMessages } from '@/hooks/useMessages';
import { markBroadcastRead } from '@/hooks/useMutations';
import { useAuthStore } from '@/stores/authStore';

export default function MessagesScreen() {
  const { data, loading, refetch } = useClientMessages();
  const profileId = useAuthStore((s) => s.profile?.id);
  const marked = useRef(false);

  // Mark everything read the first time the inbox is opened.
  useEffect(() => {
    if (marked.current || !profileId) return;
    const unread = data.filter((m) => !m.read_at);
    if (unread.length === 0) return;
    marked.current = true;
    Promise.all(unread.map((m) => markBroadcastRead(m.id, profileId))).then(() => refetch());
  }, [data, profileId, refetch]);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Inbox" title="Messages" back={false} />
      <View className="gap-3 px-6">
        {!loading && data.length === 0 ? (
          <EmptyState
            title="No messages yet"
            message="Updates from Diedericks Dobermanns will appear here."
          />
        ) : (
          data.map((m) => (
            <Card key={m.id}>
              <View className="flex-row items-center">
                {!m.read_at ? <View className="mr-2 h-2 w-2 rounded-full bg-gold" /> : null}
                <Typography variant="subtitle" className="flex-1">
                  {m.title}
                </Typography>
                <Typography variant="caption">
                  {new Date(m.sent_at ?? m.created_at).toLocaleDateString()}
                </Typography>
              </View>
              {m.image_url ? (
                <View className="mt-3 h-44 w-full overflow-hidden rounded-xl bg-surface">
                  <Image source={{ uri: m.image_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                </View>
              ) : null}
              <Typography variant="bodyMuted" className="mt-2">
                {m.body}
              </Typography>
            </Card>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
