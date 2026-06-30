import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, View } from 'react-native';

import { AddContactSheet, type AddContactSheetHandle } from '@/components/contacts/AddContactSheet';
import { InteractionCard } from '@/components/contacts/InteractionCard';
import { LogInteractionSheet, type LogInteractionSheetHandle } from '@/components/contacts/LogInteractionSheet';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useContact, useContactInteractions } from '@/hooks/useContacts';
import { openWhatsApp } from '@/lib/social';
import type { ContactInteraction } from '@/types/phase10';

const PAGE = 20;

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}

export default function ContactDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const contactId = id ?? '';

  const editRef = useRef<AddContactSheetHandle>(null);
  const logRef = useRef<LogInteractionSheetHandle>(null);

  const { contact, loading, refresh } = useContact(contactId);
  const { interactions, loading: ixLoading, refresh: refreshIx } = useContactInteractions(contactId);
  const [visibleCount, setVisibleCount] = useState(PAGE);

  const promptLog = (type: ContactInteraction['interaction_type']) => {
    Alert.alert('Log this interaction?', '', [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Log it',
        onPress: () => logRef.current?.open({ interaction_type: type, direction: 'outbound' }),
      },
    ]);
  };

  const handleWhatsApp = () => {
    if (!contact) return;
    const phone = contact.whatsapp_number ?? contact.phone;
    openWhatsApp(phone, `Hi ${firstName(contact.full_name)}, `);
    promptLog('whatsapp');
  };

  const handleEmail = () => {
    if (!contact?.email) return;
    Linking.openURL(`mailto:${contact.email}`);
    promptLog('email');
  };

  const handleCall = () => {
    if (!contact?.phone) return;
    Linking.openURL(`tel:${contact.phone}`);
    promptLog('call');
  };

  if (loading || !contact) {
    return (
      <ScreenContainer>
        <PageHeader title="Contact" back />
        <ActivityIndicator color={Colors.gold} className="mt-8" />
      </ScreenContainer>
    );
  }

  const typeLabel = (contact.contact_type ?? 'prospect').toUpperCase();
  const location = [contact.city, contact.country].filter(Boolean).join(', ');
  const shown = interactions.slice(0, visibleCount);

  return (
    <ScreenContainer scroll={false}>
      <View className="flex-row items-center justify-between px-6">
        <View className="flex-1">
          <PageHeader title={contact.full_name} back />
        </View>
        <Pressable onPress={() => editRef.current?.open(contact)} hitSlop={8} className="pb-2">
          <Typography variant="label" className="text-gold">
            Edit
          </Typography>
        </Pressable>
      </View>

      <ScrollView className="px-6 pb-12" showsVerticalScrollIndicator={false}>
        <View className="mb-4 flex-row flex-wrap items-center gap-2">
          <View className="rounded-full bg-gold/15 px-3 py-1">
            <Typography variant="caption" className="text-gold">
              {typeLabel}
            </Typography>
          </View>
          {contact.user_id ? (
            <Typography variant="caption" className="text-gold">
              📱 App user
            </Typography>
          ) : null}
        </View>

        <Typography variant="body">{contact.email ?? 'No email'}</Typography>
        <Typography variant="body">{contact.phone ?? 'No phone'}</Typography>
        {location ? (
          <Typography variant="caption" className="mt-1 text-subtle">
            {location}
          </Typography>
        ) : null}

        <Card className="mt-4 flex-row justify-around py-4">
          <Pressable onPress={handleWhatsApp} disabled={!(contact.whatsapp_number ?? contact.phone)} className="items-center gap-1">
            <Ionicons name="logo-whatsapp" size={26} color={Colors.gold} />
            <Typography variant="caption">WhatsApp</Typography>
          </Pressable>
          <Pressable onPress={handleEmail} disabled={!contact.email} className="items-center gap-1">
            <Ionicons name="mail" size={26} color={Colors.gold} />
            <Typography variant="caption">Email</Typography>
          </Pressable>
          <Pressable onPress={handleCall} disabled={!contact.phone} className="items-center gap-1">
            <Ionicons name="call" size={26} color={Colors.gold} />
            <Typography variant="caption">Call</Typography>
          </Pressable>
        </Card>

        {contact.user_id ? (
          <Button
            label="View App Profile"
            variant="outline"
            className="mt-4"
            onPress={() =>
              router.push({ pathname: '/(admin)/clients/[id]', params: { id: contact.user_id! } } as never)
            }
          />
        ) : null}

        {contact.notes ? (
          <View className="mt-6">
            <Typography variant="label" className="mb-2 text-gold">
              NOTES
            </Typography>
            <Card>
              <Typography variant="body">{contact.notes}</Typography>
            </Card>
          </View>
        ) : null}

        <View className="mt-6 flex-row items-center justify-between">
          <Typography variant="label" className="text-gold">
            INTERACTION HISTORY
          </Typography>
          <Pressable onPress={() => logRef.current?.open()}>
            <Typography variant="label" className="text-gold">
              + Log
            </Typography>
          </Pressable>
        </View>

        {ixLoading ? <ActivityIndicator color={Colors.gold} className="my-4" /> : null}
        {shown.map((item) => (
          <InteractionCard key={item.id} item={item} />
        ))}
        {interactions.length > visibleCount ? (
          <Button label="Load more" variant="ghost" onPress={() => setVisibleCount((n) => n + PAGE)} />
        ) : null}
        {!ixLoading && interactions.length === 0 ? (
          <Typography variant="caption" className="mt-2 text-subtle">
            No interactions logged yet.
          </Typography>
        ) : null}
      </ScrollView>

      <AddContactSheet ref={editRef} onSaved={() => void refresh()} />
      <LogInteractionSheet
        ref={logRef}
        contactId={contactId}
        onSaved={() => {
          void refreshIx();
          setVisibleCount(PAGE);
        }}
      />
    </ScreenContainer>
  );
}
