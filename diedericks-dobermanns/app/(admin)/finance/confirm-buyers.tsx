import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import type { NameSuggestion } from '@/lib/clients/clientRecord';
import { loadUnlinkedSoldDogs, type UnlinkedSoldDog } from '@/lib/clients/loadSaleLinks';
import { confirmDogBuyer } from '@/lib/clients/saleLinkWrites';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function ConfirmBuyersScreen() {
  const router = useRouter();
  const canWrite = useAuthStore((s) => s.hasRole('admin', 'super_admin'));
  const [dogs, setDogs] = useState<UnlinkedSoldDog[]>([]);
  const [contacts, setContacts] = useState<Array<{ id: string; fullName: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [alsoOwner, setAlsoOwner] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    void loadUnlinkedSoldDogs(requireSupabase())
      .then((data) => {
        setDogs(data.dogs);
        setContacts(data.contacts);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load dogs'));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <ScreenContainer scroll={false}>
      <PageHeader title="Confirm buyers" />
      <ScrollView className="px-6 pb-12">
        <Typography variant="caption" className="mb-4">
          {dogs.length} sold dogs have a name and no buyer contact. Confirm one dog at a time. A suggestion is not a
          link.
        </Typography>
        {error ? <Typography variant="body" className="mb-3 text-danger">{error}</Typography> : null}
        {dogs.map((dog) => {
          const contactId = picked[dog.id] ?? '';
          const contact = contacts.find((row) => row.id === contactId);
          return (
            <Card key={dog.id} className="mb-4">
              <Pressable onPress={() => router.push(`/(admin)/dogs/${dog.id}` as never)}>
                <Typography variant="label" className="text-gold">
                  {dog.name}
                </Typography>
              </Pressable>
              <Typography variant="caption">Owner name on the dog: {dog.ownerName}</Typography>
              {dog.suggestions.map((suggestion: NameSuggestion) => (
                <View key={suggestion.id} className="mt-2">
                  <Typography variant="caption">
                    {suggestion.rightLabel}: {suggestion.rightValue}
                  </Typography>
                  <Typography variant="caption">
                    {suggestion.leftLabel}: {suggestion.leftValue}
                  </Typography>
                  {canWrite ? (
                    <Pressable
                      onPress={() => {
                        setPicked((current) => ({ ...current, [dog.id]: suggestion.id }));
                        setConfirmed((current) => ({ ...current, [dog.id]: false }));
                      }}
                    >
                      <Typography variant="label" className="text-gold">
                        Use this suggestion
                      </Typography>
                    </Pressable>
                  ) : null}
                </View>
              ))}
              {canWrite ? (
                <View className="mt-3">
                  <Typography variant="caption">
                    Selected contact: {contact?.fullName ?? 'none — use a suggestion'}
                  </Typography>
                  <Pressable
                    className="mt-2"
                    onPress={() => setConfirmed((current) => ({ ...current, [dog.id]: !current[dog.id] }))}
                  >
                    <Typography variant="caption" className={confirmed[dog.id] ? 'text-gold' : ''}>
                      {confirmed[dog.id] ? '☑ ' : '☐ '}I confirm {contact?.fullName ?? 'this contact'} bought {dog.name}.
                      This is not an automatic name match.
                    </Typography>
                  </Pressable>
                  <Pressable
                    className="mt-2"
                    onPress={() => setAlsoOwner((current) => ({ ...current, [dog.id]: !current[dog.id] }))}
                  >
                    <Typography variant="caption">
                      {alsoOwner[dog.id] ? '☑ ' : '☐ '}Also record this contact as the current owner.
                    </Typography>
                  </Pressable>
                  <Button
                    label={busyId === dog.id ? 'Saving…' : 'Confirm buyer'}
                    className="mt-3"
                    disabled={busyId === dog.id || !confirmed[dog.id] || !contactId}
                    onPress={() => {
                      setBusyId(dog.id);
                      setError(null);
                      void confirmDogBuyer({
                        dogId: dog.id,
                        contactId,
                        confirmed: Boolean(confirmed[dog.id]),
                        alsoCurrentOwner: Boolean(alsoOwner[dog.id]),
                      })
                        .then(() => load())
                        .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not save'))
                        .finally(() => setBusyId(null));
                    }}
                  />
                </View>
              ) : null}
            </Card>
          );
        })}
      </ScrollView>
    </ScreenContainer>
  );
}
