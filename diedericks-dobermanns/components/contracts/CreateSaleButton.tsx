import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { createSaleContract } from '@/lib/contracts/createSale';
import { useAuthStore } from '@/stores/authStore';

export function CreateSaleButton({
  dogId,
  contactId,
  label = 'Create agreement',
}: {
  dogId: string;
  contactId?: string | null;
  label?: string;
}) {
  const router = useRouter();
  const actorId = useAuthStore((s) => s.session?.user?.id);
  const [creating, setCreating] = useState(false);

  return (
    <Button
      label={creating ? 'Creating…' : label}
      variant="secondary"
      disabled={creating}
      onPress={() => {
        if (!actorId) {
          Alert.alert('Not signed in');
          return;
        }
        setCreating(true);
        void createSaleContract({
          dogId,
          contactId,
          actorId,
          actorLabel: 'Admin (app)',
        })
          .then((res) => {
            if (res.error) {
              Alert.alert('Could not create', res.error);
              return;
            }
            if (res.contractId) {
              router.push(`/(admin)/contracts/${res.contractId}` as never);
            }
          })
          .finally(() => setCreating(false));
      }}
    />
  );
}
