import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { BreedingDog } from '@/hooks/useBreedingDogs';

interface DogSelectFieldProps {
  label: string;
  value: string | null;
  onChange: (id: string | null) => void;
  dogs: BreedingDog[];
  placeholder: string;
}

export function DogSelectField({ label, value, onChange, dogs, placeholder }: DogSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = dogs.find((d) => d.id === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dogs;
    return dogs.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.registration_number?.toLowerCase().includes(q) ?? false) ||
        (d.colour?.toLowerCase().includes(q) ?? false),
    );
  }, [dogs, query]);

  function pick(id: string | null) {
    onChange(id);
    setOpen(false);
    setQuery('');
  }

  return (
    <View className="mb-4">
      <Typography variant="caption" className="mb-2 text-silver">
        {label}
      </Typography>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-xl border border-gold/20 bg-surface px-4 py-3"
      >
        <Typography variant="body" className={selected ? 'text-gold' : 'text-ink-muted'}>
          {selected?.name ?? placeholder}
        </Typography>
        <Ionicons name="chevron-down" size={18} color={Colors.goldMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/60" onPress={() => setOpen(false)}>
          <Pressable className="max-h-[70%] rounded-t-2xl bg-black-rich p-4" onPress={() => undefined}>
            <Typography variant="subtitle" className="mb-3 text-gold">
              {label}
            </Typography>
            <Input
              placeholder="Search by name, colour, registration…"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
            />
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={
                <Pressable onPress={() => pick(null)} className="border-b border-gold/15 py-3">
                  <Typography variant="body" className="text-ink-muted">
                    Clear selection
                  </Typography>
                </Pressable>
              }
              renderItem={({ item }) => (
                <Pressable onPress={() => pick(item.id)} className="border-b border-gold/10 py-3">
                  <Typography variant="body">{item.name}</Typography>
                  <Typography variant="caption" className="text-subtle">
                    {[item.colour, item.registration_number].filter(Boolean).join(' · ') || '—'}
                  </Typography>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
