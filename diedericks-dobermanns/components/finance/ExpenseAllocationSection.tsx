import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { AllocationType } from '@/hooks/useExpenses';
import { requireSupabase } from '@/lib/supabase';
import { formatDate } from '@/lib/finance/formatters';

interface Props {
  allocationType: AllocationType;
  onAllocationTypeChange: (t: AllocationType) => void;
  selectedDogId: string | null;
  selectedDogName: string;
  onDogSelect: (id: string, name: string) => void;
  selectedLitterId: string | null;
  selectedLitterName: string;
  onLitterSelect: (id: string, name: string) => void;
  locked?: boolean;
  lockLabel?: string;
}

interface DogOption {
  id: string;
  name: string;
}

interface LitterOption {
  id: string;
  label: string;
}

export function ExpenseAllocationSection({
  allocationType,
  onAllocationTypeChange,
  selectedDogId,
  selectedDogName,
  onDogSelect,
  selectedLitterId,
  selectedLitterName,
  onLitterSelect,
  locked,
  lockLabel,
}: Props) {
  const [dogQuery, setDogQuery] = useState('');
  const [litterQuery, setLitterQuery] = useState('');
  const [dogs, setDogs] = useState<DogOption[]>([]);
  const [litters, setLitters] = useState<LitterOption[]>([]);

  useEffect(() => {
    void (async () => {
      const supabase = requireSupabase();
      const { data } = await supabase
        .from('dogs')
        .select('id, name, call_name')
        .order('name');
      setDogs(
        (data ?? []).map((d) => ({
          id: d.id,
          name: d.call_name?.trim() || d.name,
        })),
      );
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const supabase = requireSupabase();
      const { data } = await supabase
        .from('litters')
        .select('id, name, litter_letter, actual_date, expected_date')
        .order('actual_date', { ascending: false, nullsFirst: false })
        .limit(30);
      setLitters(
        (data ?? []).map((l) => {
          const name = l.name ?? (l.litter_letter ? `Litter ${l.litter_letter}` : 'Litter');
          const date = l.actual_date ?? l.expected_date;
          return {
            id: l.id,
            label: date ? `${name} — ${formatDate(date)}` : name,
          };
        }),
      );
    })();
  }, []);

  const filteredDogs = useMemo(() => {
    const q = dogQuery.trim().toLowerCase();
    if (!q) return dogs;
    return dogs.filter((d) => d.name.toLowerCase().includes(q));
  }, [dogs, dogQuery]);

  const filteredLitters = useMemo(() => {
    const q = litterQuery.trim().toLowerCase();
    if (!q) return litters;
    return litters.filter((l) => l.label.toLowerCase().includes(q));
  }, [litters, litterQuery]);

  if (locked && lockLabel) {
    return (
      <View className="mb-4">
        <Typography variant="label" className="mb-2">
          Allocation
        </Typography>
        <Card>
          <Typography variant="body">{lockLabel}</Typography>
        </Card>
      </View>
    );
  }

  return (
    <View className="mb-4">
      <Typography variant="label" className="mb-2">
        Allocation
      </Typography>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        {(['general', 'dog', 'litter'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => onAllocationTypeChange(t)}
            className={`mr-2 rounded-full border px-4 py-2 ${
              allocationType === t ? 'border-gold bg-gold/15' : 'border-gold/30'
            }`}
          >
            <Typography variant="caption">
              {t === 'general' ? 'General' : t === 'dog' ? 'Specific Dog' : 'Specific Litter'}
            </Typography>
          </Pressable>
        ))}
      </ScrollView>

      {allocationType === 'dog' ? (
        <Card>
          {selectedDogId ? (
            <Typography variant="body" className="mb-2">
              Selected: {selectedDogName}
            </Typography>
          ) : null}
          <TextInput
            value={dogQuery}
            onChangeText={setDogQuery}
            placeholder="Search dogs…"
            placeholderTextColor={Colors.silver}
            className="mb-2 border-b border-gold/20 pb-2 text-white"
          />
          <ScrollView style={{ maxHeight: 200 }}>
            {filteredDogs.map((d) => (
              <Pressable
                key={d.id}
                onPress={() => onDogSelect(d.id, d.name)}
                className={`border-b border-gold/10 py-2 ${selectedDogId === d.id ? 'bg-gold/10' : ''}`}
              >
                <Typography variant="body">{d.name}</Typography>
              </Pressable>
            ))}
          </ScrollView>
        </Card>
      ) : null}

      {allocationType === 'litter' ? (
        <Card>
          {selectedLitterId ? (
            <Typography variant="body" className="mb-2">
              Selected: {selectedLitterName}
            </Typography>
          ) : null}
          <TextInput
            value={litterQuery}
            onChangeText={setLitterQuery}
            placeholder="Search litters…"
            placeholderTextColor={Colors.silver}
            className="mb-2 border-b border-gold/20 pb-2 text-white"
          />
          <ScrollView style={{ maxHeight: 200 }}>
            {filteredLitters.map((l) => (
              <Pressable
                key={l.id}
                onPress={() => onLitterSelect(l.id, l.label)}
                className={`border-b border-gold/10 py-2 ${selectedLitterId === l.id ? 'bg-gold/10' : ''}`}
              >
                <Typography variant="body">{l.label}</Typography>
              </Pressable>
            ))}
          </ScrollView>
        </Card>
      ) : null}
    </View>
  );
}
