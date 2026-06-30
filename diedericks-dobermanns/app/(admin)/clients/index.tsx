import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useClients } from '@/hooks/useAdmin';
import { openWhatsApp } from '@/lib/social';

function initials(name: string | null): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function AdminClientsScreen() {
  const router = useRouter();
  const { data: clients, loading } = useClients();

  return (
    <ScreenContainer>
      <PageHeader eyebrow="People" title="Clients" back={false} />
      <View className="gap-3 px-6">
        {!loading && clients.length === 0 ? (
          <EmptyState title="No clients yet" />
        ) : (
          clients.map((client) => (
            <Pressable key={client.id} onPress={() => router.push(`/(admin)/clients/${client.id}`)}>
              <Card className="flex-row items-center">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-gold/15">
                  <Typography variant="subtitle" className="text-gold">
                    {initials(client.full_name)}
                  </Typography>
                </View>
                <View className="ml-4 flex-1">
                  <View className="flex-row items-center gap-2">
                    <Typography variant="subtitle" className="flex-1">
                      {client.full_name ?? 'Unnamed'}
                    </Typography>
                    {client.role === 'trainer' ? <Badge label="Trainer" tone="neutral" /> : null}
                  </View>
                  <Typography variant="caption" className="mt-0.5">
                    {[client.city, client.country].filter(Boolean).join(', ') || 'Location unknown'}
                  </Typography>
                </View>
                {client.phone ? (
                  <Pressable
                    onPress={() =>
                      openWhatsApp(client.phone, `Hi ${client.full_name?.split(' ')[0] ?? ''}, `)
                    }
                    hitSlop={8}
                    className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-gold/15"
                  >
                    <Ionicons name="logo-whatsapp" size={18} color={Colors.gold} />
                  </Pressable>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={Colors.silver} />
              </Card>
            </Pressable>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
