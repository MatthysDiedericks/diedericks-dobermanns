import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, SectionList, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { groupDogs, type DogGroupable } from '@/lib/dogs/groups';

export type DogPickerOption = DogGroupable & { id: string; name: string };

interface DogGroupPickerFieldProps {
  label: string;
  value: string | null;
  onChange: (id: string | null) => void;
  dogs: DogPickerOption[];
  placeholder: string;
}

/**
 * Searchable dog picker, grouped by DOG_GROUPS. Mirrors DogSelectField's
 * bottom-sheet pattern but buckets results into sections so staff can find
 * "the elite developed one" without knowing its exact name.
 */
export function DogGroupPickerField({ label, value, onChange, dogs, placeholder }: DogGroupPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = dogs.find((d) => d.id === value);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q ? dogs.filter((d) => d.name.toLowerCase().includes(q)) : dogs;
    return groupDogs(pool).map((g) => ({ title: g.label, data: g.dogs }));
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
          <Pressable className="max-h-[75%] rounded-t-2xl bg-black-rich p-4" onPress={() => undefined}>
            <Typography variant="subtitle" className="mb-3 text-gold">
              {label}
            </Typography>
            <Input
              placeholder="Search dogs by name…"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
            />
            <Pressable onPress={() => pick(null)} className="mb-2 py-2">
              <Typography variant="caption" className="text-muted">
                Clear selection — show everything
              </Typography>
            </Pressable>
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              renderSectionHeader={({ section }) => (
                <Typography variant="caption" className="mt-3 text-gold-dim">
                  {section.title}
                </Typography>
              )}
              renderItem={({ item }) => (
                <Pressable onPress={() => pick(item.id)} className="border-b border-gold/10 py-3">
                  <Typography variant="body">{item.name}</Typography>
                </Pressable>
              )}
              ListEmptyComponent={
                <Typography variant="caption" className="py-3 text-subtle">
                  No matching dogs.
                </Typography>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
