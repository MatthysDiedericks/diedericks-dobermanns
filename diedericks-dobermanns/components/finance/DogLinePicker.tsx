import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { DogStatusBadge } from '@/components/dogs/DogStatusBadge';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { humanizeStatus } from '@/lib/finance/formatters';
import { requireSupabase } from '@/lib/supabase';
import type { DogStatus } from '@/types/app.types';

export interface PickableDog {
  id: string;
  name: string;
  status: string;
  litter_id: string | null;
  date_of_birth: string | null;
  price: number | null;
}

interface Props {
  onSelect: (dog: PickableDog) => void;
}

function ageLabel(dob: string | null): string {
  if (!dob) return 'DOB unknown';
  const born = new Date(dob);
  const now = new Date();
  const months =
    (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth());
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  return `${years} yr${years === 1 ? '' : 's'}`;
}

export function DogLinePicker({ onSelect }: Props) {
  const [dogs, setDogs] = useState<PickableDog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from('dogs')
        .select('id, name, status, litter_id, date_of_birth, call_name')
        .in('status', ['available', 'in_training', 'reserved'])
        .order('litter_id', { ascending: false, nullsFirst: false })
        .order('date_of_birth', { ascending: false });

      if (error) throw error;
      setDogs(
        (data ?? []).map((d) => ({
          id: d.id,
          name: d.call_name?.trim() || d.name,
          status: d.status,
          litter_id: d.litter_id,
          date_of_birth: d.date_of_birth,
          price: null,
        })),
      );
    } catch {
      setDogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dogs;
    return dogs.filter((d) => d.name.toLowerCase().includes(q));
  }, [dogs, query]);

  const puppies = filtered.filter((d) => d.litter_id != null);
  const adults = filtered.filter((d) => d.litter_id == null);

  const renderRow = (dog: PickableDog) => (
    <Pressable
      key={dog.id}
      onPress={() => onSelect(dog)}
      className="flex-row items-center justify-between border-b border-gold/10 py-3"
    >
      <View className="flex-1 pr-2">
        <Typography variant="body">{dog.name}</Typography>
        <Typography variant="caption">{ageLabel(dog.date_of_birth)}</Typography>
      </View>
      <DogStatusBadge status={dog.status as DogStatus} />
    </Pressable>
  );

  return (
    <View className="rounded-xl border border-gold/30 bg-black-rich">
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search dogs…"
        placeholderTextColor={Colors.silver}
        className="border-b border-gold/20 px-3 py-2 text-white"
      />
      <ScrollView style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled">
        {loading ? (
          <Typography variant="caption" className="p-3 text-silver">
            Loading dogs…
          </Typography>
        ) : filtered.length === 0 ? (
          <Typography variant="caption" className="p-3 text-silver">
            No matching dogs.
          </Typography>
        ) : (
          <>
            {puppies.length > 0 ? (
              <View className="px-3 pt-2">
                <Typography variant="label" className="mb-1 text-gold">
                  Puppies
                </Typography>
                {puppies.map(renderRow)}
              </View>
            ) : null}
            {adults.length > 0 ? (
              <View className="px-3 pt-2 pb-2">
                <Typography variant="label" className="mb-1 text-gold">
                  Adult Dogs
                </Typography>
                {adults.map(renderRow)}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

export function dogLineDescription(dog: PickableDog): string {
  return `${dog.name} — ${humanizeStatus(dog.status)}`;
}

export function dogLineItemType(dog: PickableDog): 'dog_sale' | 'training_fee' {
  return dog.status === 'in_training' ? 'training_fee' : 'dog_sale';
}
