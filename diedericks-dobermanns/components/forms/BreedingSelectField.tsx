import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';

import { DogSearchField } from '@/components/dogs/DogSearchField';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { ActiveBreeding } from '@/hooks/useActiveBreedings';
import { dogsMatching } from '@/lib/dogs/search';
import { formatKennelDate } from '@/lib/kennel/formatters';

interface BreedingSelectFieldProps {
  label: string;
  value: string | null;
  onChange: (breeding: ActiveBreeding | null) => void;
  breedings: ActiveBreeding[];
  loading?: boolean;
  placeholder: string;
}

function breedingLabel(b: ActiveBreeding): string {
  const sire = b.sireName ?? 'Unknown sire';
  const due = b.expectedWhelpDate ? ` · due ~${formatKennelDate(b.expectedWhelpDate)}` : '';
  return `${b.damName} × ${sire} · mated ${formatKennelDate(b.matingDate)}${due}`;
}

export function BreedingSelectField({
  label,
  value,
  onChange,
  breedings,
  loading,
  placeholder,
}: BreedingSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = breedings.find((b) => b.id === value);
  const filtered = useMemo(() => {
    const mapped = breedings.map((b) => ({
      id: b.id,
      name: breedingLabel(b),
      mother_name: b.damName,
      father_name: b.sireName,
      litter_date: b.matingDate,
    }));
    const ids = new Set(dogsMatching(mapped, query).map((d) => d.id));
    return breedings.filter((b) => ids.has(b.id) || !query.trim());
  }, [breedings, query]);

  function pick(b: ActiveBreeding | null) {
    onChange(b);
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
        <Typography variant="body" className={selected ? 'text-gold' : 'text-ink-muted'} numberOfLines={2}>
          {loading ? 'Loading breedings…' : selected ? breedingLabel(selected) : placeholder}
        </Typography>
        <Ionicons name="chevron-down" size={18} color={Colors.goldMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/60" onPress={() => setOpen(false)}>
          <Pressable className="max-h-[70%] rounded-t-2xl bg-black-rich p-4" onPress={() => undefined}>
            <Typography variant="subtitle" className="mb-3 text-gold">
              {label}
            </Typography>
            <DogSearchField
              query={query}
              onQueryChange={setQuery}
              debounceMs={0}
              empty={query.trim().length > 0 && filtered.length === 0}
            />
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={
                <Pressable onPress={() => pick(null)} className="border-b border-gold/15 py-3">
                  <Typography variant="body" className="text-ink-muted">
                    Enter details manually
                  </Typography>
                </Pressable>
              }
              ListEmptyComponent={
                <Typography variant="bodyMuted" className="py-6 text-center">
                  No open breedings — record a mating in Heat Cycles first.
                </Typography>
              }
              renderItem={({ item }) => (
                <Pressable onPress={() => pick(item)} className="border-b border-gold/10 py-3">
                  <Typography variant="body">{breedingLabel(item)}</Typography>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
