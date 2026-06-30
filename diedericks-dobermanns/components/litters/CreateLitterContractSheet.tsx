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
  onCreate: (dogId: string, clientId: string, title: string) => Promise<void>;
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
      const [reservations, dogsWithOwners] = await Promise.all([
        supabase
          .from('reservations')
          .select('client_id, client:users!reservations_client_id_fkey(id, full_name, phone)')
          .in('dog_id', puppyIds),
        supabase
          .from('dogs')
          .select('owner_id, owner:users!dogs_owner_id_fkey(id, full_name, phone)')
          .in('id', puppyIds)
          .not('owner_id', 'is', null),
      ]);

      const map = new Map<string, ClientOption>();
      for (const row of reservations.data ?? []) {
        const c = row.client as unknown as ClientOption | null;
        if (c?.id) map.set(c.id, c);
      }
      for (const row of dogsWithOwners.data ?? []) {
        const c = row.owner as unknown as ClientOption | null;
        if (c?.id) map.set(c.id, c);
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
    if (!dogId || !clientId) {
      Alert.alert('Missing fields', 'Select a puppy and client.');
      return;
    }
    const dog = puppies.find((p) => p.id === dogId);
    const title = `Purchase Agreement — ${dog?.name ?? 'Puppy'}`;
    setSaving(true);
    try {
      await onCreate(dogId, clientId, title);
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
          Client
        </Typography>
        {clients.length === 0 ? (
          <Typography variant="bodyMuted" className="mb-4">
            No clients linked to puppies in this litter yet.
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
