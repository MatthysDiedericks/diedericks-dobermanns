import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { ERROR_CODES } from '@/lib/errors/codes';
import { logError } from '@/lib/errors/logError';
import { canConfirmPuppyReceived } from '@/lib/fulfilment/clientConfirm';
import { useAuthStore } from '@/stores/authStore';
import type { Dog } from '@/types/app.types';

const storageKey = (dogId: string) => `dd-delivery-confirmed:${dogId}`;

export function ReceivedPuppyCard({ dog }: { dog: Dog }) {
  const actorId = useAuthStore((s) => s.session?.user.id);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(storageKey(dog.id)).then((v) => {
      if (v === '1') setDone(true);
    });
  }, [dog.id]);

  const onConfirm = useCallback(async () => {
    setBusy(true);
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
    setBusy(false);
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
