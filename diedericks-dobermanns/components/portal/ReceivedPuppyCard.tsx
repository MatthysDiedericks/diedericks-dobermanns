import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { ERROR_CODES } from '@/lib/errors/codes';
import { logError } from '@/lib/errors/logError';
import { canConfirmPuppyReceived } from '@/lib/fulfilment/clientConfirm';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Dog } from '@/types/app.types';

const storageKey = (dogId: string) => `dd-delivery-confirmed:${dogId}`;

async function deliveryAlreadyConfirmed(dogId: string): Promise<boolean> {
  try {
    const { data, error } = await requireSupabase().rpc('client_already_confirmed_delivery', {
      p_dog_id: dogId,
    });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

export function ReceivedPuppyCard({ dog }: { dog: Dog }) {
  const actorId = useAuthStore((s) => s.session?.user.id);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const local = await AsyncStorage.getItem(storageKey(dog.id));
      if (local === '1') {
        if (!cancelled) setDone(true);
        return;
      }
      if (await deliveryAlreadyConfirmed(dog.id)) {
        await AsyncStorage.setItem(storageKey(dog.id), '1');
        if (!cancelled) setDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dog.id]);

  const onConfirm = useCallback(async () => {
    setBusy(true);
    try {
      if (await deliveryAlreadyConfirmed(dog.id)) {
        await AsyncStorage.setItem(storageKey(dog.id), '1');
        setDone(true);
        return;
      }
      await logError({
        code: ERROR_CODES.DELIVERY_CONFIRMED_BY_CLIENT,
        area: 'other',
        message: 'Client confirmed they received their puppy',
        entityType: 'dog',
        entityId: dog.id,
        surface: 'app',
        actorRole: 'client',
        actorId: actorId ?? null,
        route: `/(portal)/dogs/${dog.id}`,
      });
      await AsyncStorage.setItem(storageKey(dog.id), '1');
      setDone(true);
    } finally {
      setBusy(false);
    }
  }, [actorId, dog.id]);

  if (!canConfirmPuppyReceived(dog)) return null;

  if (done) {
    return (
      <View className="mb-4 rounded-sm border border-gold/30 bg-gold/10 p-4">
        <Typography variant="subtitle" className="text-gold">
          Thanks — we'll follow up to close this out
        </Typography>
      </View>
    );
  }

  return (
    <View className="mb-4 rounded-sm border border-gold/20 bg-surface p-4">
      <Typography variant="bodyMuted" className="mb-3">
        Let us know when your Dobermann is with you. We still confirm the date on our side.
      </Typography>
      <Button
        label={busy ? 'Sending…' : "I've received my puppy"}
        onPress={() => void onConfirm()}
        disabled={busy}
      />
    </View>
  );
}
