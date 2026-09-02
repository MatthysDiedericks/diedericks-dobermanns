import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Linking, Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { matchedAliasName, type ContactListItem } from '@/lib/contacts/search';
import { openWhatsApp } from '@/lib/social';
import type { ContactRow } from '@/types/phase10';

function typeBadge(contact: ContactRow) {
  const t = contact.contact_type ?? 'prospect';
  if (t === 'client') return { label: 'Client', className: 'text-gold bg-gold/15' };
  if (t === 'prospect') return { label: 'Prospect', className: 'text-gold/80 bg-gold/10' };
  return { label: t.charAt(0).toUpperCase() + t.slice(1), className: 'text-subtle bg-surface' };
}

export function ContactListRow({ item, query }: { item: ContactListItem; query: string }) {
  const router = useRouter();
  const badge = typeBadge(item);
  const wa = item.whatsapp_number ?? item.phone;
  const aka = matchedAliasName(item, query);
  const [textClass, bgClass] = badge.className.split(' ');

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/(admin)/contacts/[id]', params: { id: item.id } } as never)
      }
    >
      <Card>
        <View className="flex-row items-start justify-between gap-2">
          <Typography variant="subtitle" className="flex-1">
            {item.full_name || 'Unnamed'}
          </Typography>
          {item.user_id ? (
            <Typography variant="caption" accessibilityLabel="App user">
              📱
            </Typography>
          ) : null}
        </View>
        {aka ? (
          <Typography variant="caption" className="mt-1 text-subtle">
            also known as {aka}
          </Typography>
        ) : null}
        <View className="mt-2 flex-row flex-wrap items-center gap-2">
          <View className={`rounded-full px-2 py-0.5 ${bgClass}`}>
            <Typography variant="caption" className={textClass}>
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
        <Typography variant="caption" className="mt-2 text-subtle">
          {item.whatsapp_number || item.phone || item.email || '—'}
        </Typography>
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
}
