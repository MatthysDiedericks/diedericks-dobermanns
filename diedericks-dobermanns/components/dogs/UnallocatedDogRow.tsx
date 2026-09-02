import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AllocateClientPicker } from '@/components/dogs/AllocateClientPicker';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { programmeTierLabel } from '@/lib/dogs/programmeTier';
import type { ClientOption, UnallocatedDog } from '@/lib/dogs/unallocatedSales';
import { formatKennelDate } from '@/lib/kennel/formatters';

type Props = {
  dog: UnallocatedDog;
  clients: ClientOption[];
  onAllocate: (dogId: string, clientUserId: string) => Promise<{ error?: string }>;
};

export function UnallocatedDogRow({ dog, clients, onAllocate }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<ClientOption | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function allocate() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const result = await onAllocate(dog.id, selected.id);
    setBusy(false);
    if (result.error) setError(result.error);
  }

  return (
    <View className="rounded-sm border border-gold/20 bg-surface p-4">
      <Pressable
        onPress={() =>
          router.push({ pathname: '/(admin)/dogs/[id]', params: { id: dog.id } } as never)
        }
      >
        <Typography variant="body" className="text-gold">
          {dog.name}
        </Typography>
      </Pressable>
      <Typography variant="caption" className="mt-1 text-subtle">
        {programmeTierLabel(dog.programme_tier)} · sold {formatKennelDate(dog.created_at)}
      </Typography>

      <View className="mt-3">
        <AllocateClientPicker clients={clients} selected={selected} onSelect={setSelected} />
      </View>

      {selected ? (
        <View className="mt-3">
          <Typography variant="caption" className="text-text">
            Link {dog.name} to {selected.full_name || selected.email}?
          </Typography>
          <View className="mt-2 flex-row gap-3">
            <Button
              label={busy ? 'Linking…' : 'Allocate'}
              size="sm"
              disabled={busy}
              loading={busy}
              onPress={() => void allocate()}
            />
            <Button
              label="Cancel"
              size="sm"
              variant="outline"
              disabled={busy}
              onPress={() => setSelected(null)}
            />
          </View>
        </View>
      ) : null}

      {error ? (
        <Typography variant="caption" className="mt-2 text-danger">
          {error}
        </Typography>
      ) : null}
    </View>
  );
}
