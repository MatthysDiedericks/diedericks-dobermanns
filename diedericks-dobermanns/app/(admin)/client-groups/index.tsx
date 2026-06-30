import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useClientGroups } from '@/hooks/useAdmin';
import { createClientGroup, useSubmitting } from '@/hooks/useMutations';
import type { ClientGroupType } from '@/types/app.types';

const TYPE_META: Record<ClientGroupType, { label: string; tone: BadgeTone }> = {
  litter: { label: 'Litter', tone: 'gold' },
  training: { label: 'Training', tone: 'success' },
  custom: { label: 'Custom', tone: 'neutral' },
  all_clients: { label: 'All Clients', tone: 'muted' },
};

const NEW_TYPES: ClientGroupType[] = ['custom', 'training', 'all_clients'];

export default function ClientGroupsScreen() {
  const router = useRouter();
  const { data: groups, loading, refetch } = useClientGroups();
  const { submitting, run } = useSubmitting();

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<ClientGroupType>('custom');

  async function create() {
    if (!name.trim()) return;
    const { error } = await run(() => createClientGroup(name.trim(), type));
    if (!error) {
      setName('');
      setType('custom');
      setCreating(false);
      await refetch();
    }
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Communication" title="Client Groups" back={false} />

      <View className="px-6">
        {creating ? (
          <Card className="mb-4">
            <Typography variant="subtitle" className="mb-3">
              New Group
            </Typography>
            <Input label="Group name" value={name} onChangeText={setName} placeholder="e.g. Spring 2026 Litter" />
            <View className="mb-3 flex-row flex-wrap gap-2">
              {NEW_TYPES.map((t) => {
                const active = type === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setType(t)}
                    className={`rounded-xl border px-4 py-2.5 ${active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'}`}
                  >
                    <Typography variant="caption" className={active ? 'text-gold' : 'text-ink-muted'}>
                      {TYPE_META[t].label}
                    </Typography>
                  </Pressable>
                );
              })}
            </View>
            <View className="flex-row gap-3">
              <Button label="Cancel" variant="secondary" onPress={() => setCreating(false)} className="flex-1" />
              <Button label="Create" onPress={create} loading={submitting} className="flex-1" />
            </View>
          </Card>
        ) : (
          <Button label="+ New Group" variant="outline" onPress={() => setCreating(true)} fullWidth className="mb-4" />
        )}

        <View className="gap-3">
          {!loading && groups.length === 0 ? (
            <EmptyState title="No groups yet" message="Create a group or confirm a reservation to auto-create a litter group." />
          ) : (
            groups.map((g) => (
              <Pressable
                key={g.id}
                onPress={() => router.push({ pathname: '/(admin)/client-groups/[id]', params: { id: g.id } })}
              >
                <Card>
                  <View className="flex-row items-center">
                    <View className="flex-1 flex-row items-center gap-2">
                      <Typography variant="subtitle" numberOfLines={1} className="flex-shrink">
                        {g.name}
                      </Typography>
                      {g.type === 'litter' ? <Ionicons name="flash" size={14} color={Colors.gold} /> : null}
                    </View>
                    <Badge label={TYPE_META[g.type].label} tone={TYPE_META[g.type].tone} />
                  </View>
                  <View className="mt-2 flex-row items-center justify-between">
                    <Typography variant="caption">
                      {g.member_count != null ? `${g.member_count} member${g.member_count === 1 ? '' : 's'}` : 'Members'}
                    </Typography>
                    <Typography variant="caption">
                      {g.last_message_at
                        ? `Last message ${new Date(g.last_message_at).toLocaleDateString()}`
                        : 'No messages yet'}
                    </Typography>
                  </View>
                </Card>
              </Pressable>
            ))
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}
