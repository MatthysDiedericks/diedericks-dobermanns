import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { requireSupabase } from '@/lib/supabase';
import type { Dog } from '@/types/app.types';

export interface CreateLitterContractSheetHandle {
  open: () => void;
  close: () => void;
}

type ClientOption = { id: string; full_name: string | null; phone: string | null };

interface CreateLitterContractSheetProps {
  puppies: Dog[];
  onCreate: (dogId: string, contactId?: string) => Promise<unknown>;
}

export const CreateLitterContractSheet = forwardRef<
  CreateLitterContractSheetHandle,
  CreateLitterContractSheetProps
>(function CreateLitterContractSheet({ puppies, onCreate }, ref) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['70%'], []);
  const [dogId, setDogId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [saving, setSaving] = useState(false);

  const loadClients = useCallback(async () => {
    const puppyIds = puppies.map((p) => p.id);
    if (puppyIds.length === 0) {
      setClients([]);
      return;
    }
    try {
      const supabase = requireSupabase();
      const [contactsOnDogs, dogsWithOwners] = await Promise.all([
        supabase
          .from('dogs')
          .select('owner_contact_id, contact:contacts!dogs_owner_contact_id_fkey(id, full_name, phone)')
          .in('id', puppyIds)
          .not('owner_contact_id', 'is', null),
        supabase
          .from('dogs')
          .select('reserved_for_name')
          .in('id', puppyIds),
      ]);

      const map = new Map<string, ClientOption>();
      for (const row of contactsOnDogs.data ?? []) {
        const c = row.contact as unknown as ClientOption | null;
        if (c?.id) map.set(c.id, c);
      }
      const names = (dogsWithOwners.data ?? [])
        .map((d) => d.reserved_for_name)
        .filter((n): n is string => Boolean(n));
      if (names.length) {
        const { data: byName } = await supabase
          .from('contacts')
          .select('id, full_name, phone')
          .in('full_name', names)
          .is('merged_into_contact_id', null);
        for (const c of byName ?? []) {
          if (c.id) map.set(c.id, c);
        }
      }
      setClients([...map.values()]);
    } catch {
      setClients([]);
    }
  }, [puppies]);

  const reset = useCallback(() => {
    setDogId(puppies[0]?.id ?? '');
    setClientId('');
    void loadClients();
  }, [loadClients, puppies]);

  const close = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  useImperativeHandle(ref, () => ({
    open: () => {
      reset();
      sheetRef.current?.present();
    },
    close,
  }));

  useEffect(() => {
    if (clients.length && !clientId) setClientId(clients[0].id);
  }, [clientId, clients]);

  async function handleCreate() {
    if (!dogId) {
      Alert.alert('Missing fields', 'Select a puppy.');
      return;
    }
    setSaving(true);
    try {
      await onCreate(dogId, clientId || undefined);
      close();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not create contract');
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: Colors.nav }}
      handleIndicatorStyle={{ backgroundColor: Colors.gold }}
    >
      <BottomSheetScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Typography variant="subtitle" className="mb-4 text-gold">
          New contract
        </Typography>

        <Typography variant="caption" className="mb-2 text-silver">
          Puppy
        </Typography>
        <View className="mb-4 gap-2">
          {puppies.map((p) => {
            const active = dogId === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setDogId(p.id)}
                className={`rounded-lg border px-3 py-2 ${active ? 'border-gold bg-gold/15' : 'border-gold/20'}`}
              >
                <Typography variant="body">{p.name}</Typography>
              </Pressable>
            );
          })}
        </View>

        <Typography variant="caption" className="mb-2 text-silver">
          Buyer (contact — no portal account needed)
        </Typography>
        {clients.length === 0 ? (
          <Typography variant="bodyMuted" className="mb-4">
            No contacts linked to these puppies yet. Create from the dog profile after linking a buyer.
          </Typography>
        ) : (
          <View className="mb-4 gap-2">
            {clients.map((c) => {
              const active = clientId === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setClientId(c.id)}
                  className={`rounded-lg border px-3 py-2 ${active ? 'border-gold bg-gold/15' : 'border-gold/20'}`}
                >
                  <Typography variant="body">{c.full_name ?? 'Client'}</Typography>
                  {c.phone ? (
                    <Typography variant="caption" className="text-silver">
                      {c.phone}
                    </Typography>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}

        <Button label="Create Draft Contract" onPress={() => void handleCreate()} loading={saving} fullWidth />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
