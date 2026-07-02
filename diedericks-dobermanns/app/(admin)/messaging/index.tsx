import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useBroadcasts } from '@/hooks/useAdmin';
import { titleCase } from '@/lib/format';

type Tab = 'compose' | 'history';

export default function MessagingScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('compose');
  const { data: broadcasts, loading } = useBroadcasts();

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Communication" title="Messaging" back={false} />
      <View className="mb-4 flex-row gap-2 px-6">
        <Pressable
          onPress={() => setTab('compose')}
          className={`rounded-lg border px-4 py-2 ${tab === 'compose' ? 'border-gold bg-gold/15' : 'border-gold/20'}`}
        >
          <Typography variant="caption" className={tab === 'compose' ? 'text-gold' : ''}>
            Compose
          </Typography>
        </Pressable>
        <Pressable
          onPress={() => setTab('history')}
          className={`rounded-lg border px-4 py-2 ${tab === 'history' ? 'border-gold bg-gold/15' : 'border-gold/20'}`}
        >
          <Typography variant="caption" className={tab === 'history' ? 'text-gold' : ''}>
            History
          </Typography>
        </Pressable>
      </View>

      {tab === 'compose' ? (
        <View className="px-6">
          <Typography variant="bodyMuted" className="mb-4">
            Send push, email, or WhatsApp updates to a client group or all clients.
          </Typography>
          <Button label="New Broadcast" onPress={() => router.push('/(admin)/broadcast/new')} fullWidth />
        </View>
      ) : (
        <View className="px-6">
          {!loading && broadcasts.length === 0 ? (
            <EmptyState title="No broadcasts yet" message="Compose your first message to clients." />
          ) : (
            broadcasts.map((b) => (
              <Card key={b.id} className="mb-3">
                <View className="flex-row items-center justify-between">
                  <Typography variant="subtitle" className="flex-1 pr-2">
                    {b.title}
                  </Typography>
                  <Badge label={titleCase(b.status)} tone={b.status === 'sent' ? 'success' : 'gold'} />
                </View>
                <Typography variant="caption" className="mt-1 text-silver">
                  {b.recipient_count ?? 0} recipients · {(b.channels ?? []).join(', ')}
                </Typography>
                {b.sent_at ? (
                  <Typography variant="caption" className="text-silver">
                    Sent {new Date(b.sent_at).toLocaleString()}
                  </Typography>
                ) : null}
              </Card>
            ))
          )}
        </View>
      )}
    </ScreenContainer>
  );
}
