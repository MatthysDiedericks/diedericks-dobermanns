import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useClientGroup, useClients } from '@/hooks/useAdmin';
import {
  addGroupMember,
  removeGroupMember,
  renameClientGroup,
  useSubmitting,
} from '@/hooks/useMutations';
import { openWhatsApp } from '@/lib/social';

export default function ClientGroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { group, members, loading, refetch } = useClientGroup(id);
  const { data: allClients } = useClients();
  const { submitting, run } = useSubmitting();

  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  const memberIds = new Set(members.map((m) => m.client_id));
  const candidates = allClients.filter((c) => !memberIds.has(c.id));

  async function rename() {
    if (!id || !name.trim()) return;
    const { error } = await run(() => renameClientGroup(id, name.trim()));
    if (!error) {
      setName('');
      await refetch();
    }
  }
  async function add(clientId: string) {
    if (!id) return;
    await run(() => addGroupMember(id, clientId));
    await refetch();
  }
  async function remove(memberId: string) {
    await run(() => removeGroupMember(memberId));
    await refetch();
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Group" title={group?.name ?? (loading ? 'Loading…' : 'Group')} />

      <View className="px-6">
        <Button
          label="Send Message to Group"
          onPress={() =>
            router.push({ pathname: '/(admin)/broadcast/new', params: { groupId: id ?? '' } })
          }
          fullWidth
        />

        {/* Rename */}
        <View className="mt-6">
          <Input label="Rename group" value={name} onChangeText={setName} placeholder={group?.name ?? 'Group name'} />
          <Button label="Save name" variant="outline" onPress={rename} loading={submitting} fullWidth />
        </View>

        {/* Members */}
        <View className="mt-8">
          <SectionHeader eyebrow={`${members.length} total`} title="Members" />
          <View className="gap-3">
            {members.length === 0 ? (
              <Typography variant="bodyMuted">No members yet.</Typography>
            ) : (
              members.map((m) => (
                <Card key={m.id} className="flex-row items-center">
                  <View className="flex-1">
                    <Typography variant="subtitle">{m.client?.full_name ?? 'Client'}</Typography>
                    <Typography variant="caption" className="mt-0.5">
                      {[m.client?.city, m.client?.country].filter(Boolean).join(', ') || m.client?.phone || '—'}
                    </Typography>
                  </View>
                  {m.client?.phone ? (
                    <Pressable
                      onPress={() => openWhatsApp(m.client?.phone, `Hi ${m.client?.full_name?.split(' ')[0] ?? ''}, `)}
                      hitSlop={8}
                      className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-gold/15"
                    >
                      <Ionicons name="logo-whatsapp" size={18} color={Colors.gold} />
                    </Pressable>
                  ) : null}
                  <Pressable onPress={() => remove(m.id)} hitSlop={8}>
                    <Ionicons name="close-circle" size={22} color={Colors.danger} />
                  </Pressable>
                </Card>
              ))
            )}
          </View>
        </View>

        {/* Add members */}
        <View className="mt-8">
          {adding ? (
            <>
              <SectionHeader eyebrow="Tap to add" title="Add Members" />
              <View className="gap-2">
                {candidates.length === 0 ? (
                  <Typography variant="bodyMuted">Everyone is already in this group.</Typography>
                ) : (
                  candidates.map((c) => (
                    <Pressable key={c.id} onPress={() => add(c.id)}>
                      <Card className="flex-row items-center">
                        <Typography variant="body" className="flex-1">
                          {c.full_name ?? 'Client'}
                        </Typography>
                        <Ionicons name="add-circle" size={22} color={Colors.gold} />
                      </Card>
                    </Pressable>
                  ))
                )}
              </View>
              <Button label="Done adding" variant="secondary" onPress={() => setAdding(false)} fullWidth className="mt-3" />
            </>
          ) : (
            <Button label="+ Add Members" variant="outline" onPress={() => setAdding(true)} fullWidth />
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}
