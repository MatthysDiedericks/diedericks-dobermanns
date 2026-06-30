import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { AddContactSheet, type AddContactSheetHandle } from '@/components/contacts/AddContactSheet';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { CONTACT_TAGS, useContactSummary, useContacts } from '@/hooks/useContacts';
import { openWhatsApp } from '@/lib/social';
import { useAuthStore } from '@/stores/authStore';
import type { ContactRow, ContactSegment } from '@/types/phase10';

const SEGMENTS: { id: ContactSegment; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'client', label: 'Clients' },
  { id: 'prospect', label: 'Prospects' },
  { id: 'other', label: 'Other' },
];

function typeBadge(contact: ContactRow) {
  const t = contact.contact_type ?? 'prospect';
  if (t === 'client') return { label: 'Client', className: 'text-gold bg-gold/15' };
  if (t === 'prospect') return { label: 'Prospect', className: 'text-gold/80 bg-gold/10' };
  return { label: t.charAt(0).toUpperCase() + t.slice(1), className: 'text-subtle bg-surface' };
}

export default function ContactsScreen() {
  const router = useRouter();
  const addRef = useRef<AddContactSheetHandle>(null);
  const canManage = useAuthStore((s) => s.hasRole('admin', 'super_admin', 'management', 'trainer'));

  const [segment, setSegment] = useState<ContactSegment>('all');
  const [tag, setTag] = useState('all');
  const [search, setSearch] = useState('');

  const { data, loading, refresh } = useContacts(
    tag === 'all' ? undefined : tag,
    search,
    segment,
  );
  const { summary } = useContactSummary();

  return (
    <ScreenContainer scroll={false}>
      <PageHeader eyebrow="CRM" title="Contacts" back={false} />

      <Typography variant="caption" className="mb-3 px-6 text-subtle">
        {summary.client} clients · {summary.prospect} prospects · {summary.other} other
      </Typography>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 px-6">
        {SEGMENTS.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => setSegment(s.id)}
            className={`mr-2 rounded-full border px-4 py-2 ${segment === s.id ? 'border-gold bg-gold/15' : 'border-gold/30'}`}
          >
            <Typography variant="label">{s.label}</Typography>
          </Pressable>
        ))}
      </ScrollView>

      <View className="px-6 mb-3">
        <Input value={search} onChangeText={setSearch} placeholder="Search contacts" />
        <View className="mt-3 flex-row flex-wrap gap-2">
          {['all', ...CONTACT_TAGS].map((t) => (
            <Pressable
              key={t}
              onPress={() => setTag(t)}
              className={`rounded-full border px-3 py-1 ${tag === t ? 'border-gold bg-gold/20' : 'border-gold/30'}`}
            >
              <Typography variant="caption">{t === 'all' ? 'All tags' : t}</Typography>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View className="px-6">
          <CardListSkeleton count={5} />
        </View>
      ) : null}

      {!loading && data.length === 0 ? (
        <EmptyState title="No contacts" message="Add a contact or adjust your filters." />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-6 pb-24 gap-3"
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.gold} />}
          renderItem={({ item }) => {
            const badge = typeBadge(item);
            const wa = item.whatsapp_number ?? item.phone;
            return (
              <Pressable onPress={() => router.push(`/(tabs)/contacts/${item.id}` as never)}>
                <Card>
                  <View className="flex-row items-start justify-between gap-2">
                    <Typography variant="subtitle" className="flex-1">
                      {item.full_name}
                    </Typography>
                    {item.user_id ? (
                      <Typography variant="caption" accessibilityLabel="App user">
                        📱
                      </Typography>
                    ) : null}
                  </View>
                  <View className="mt-2 flex-row flex-wrap items-center gap-2">
                    <View className={`rounded-full px-2 py-0.5 ${badge.className.split(' ')[1]}`}>
                      <Typography variant="caption" className={badge.className.split(' ')[0]}>
                        {badge.label}
                      </Typography>
                    </View>
                    {(item.tags ?? []).slice(0, 2).map((t) => (
                      <View key={t} className="rounded-full bg-surface px-2 py-0.5">
                        <Typography variant="caption" className="text-subtle">
                          {t}
                        </Typography>
                      </View>
                    ))}
                  </View>
                  <View className="mt-3 flex-row items-center gap-4">
                    {item.phone ? (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation?.();
                          Linking.openURL(`tel:${item.phone}`);
                        }}
                      >
                        <Ionicons name="call" size={20} color={Colors.gold} />
                      </Pressable>
                    ) : null}
                    {wa ? (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation?.();
                          openWhatsApp(wa);
                        }}
                      >
                        <Ionicons name="logo-whatsapp" size={20} color={Colors.gold} />
                      </Pressable>
                    ) : null}
                    {item.email ? (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation?.();
                          Linking.openURL(`mailto:${item.email}`);
                        }}
                      >
                        <Ionicons name="mail" size={20} color={Colors.gold} />
                      </Pressable>
                    ) : null}
                  </View>
                </Card>
              </Pressable>
            );
          }}
        />
      )}

      {canManage ? (
        <Pressable
          onPress={() => addRef.current?.open()}
          className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-gold shadow-lg"
        >
          <Ionicons name="add" size={28} color={Colors.blackRich} />
        </Pressable>
      ) : null}

      <AddContactSheet ref={addRef} onSaved={refresh} />
    </ScreenContainer>
  );
}
