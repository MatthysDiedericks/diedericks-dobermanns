import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { reclassifyExpenses } from '@/hooks/useExpenses';
import type { AllocationType } from '@/lib/finance/allocation';
import { requireSupabase } from '@/lib/supabase';
import { showSaved } from '@/lib/dogDetail/feedback';

export function ExpensesReclassifyBar({
  selectedIds,
  onDone,
}: {
  selectedIds: string[];
  onDone: () => void;
}) {
  const [target, setTarget] = useState<AllocationType>('shared');
  const [dogQuery, setDogQuery] = useState('');
  const [litterQuery, setLitterQuery] = useState('');
  const [dogId, setDogId] = useState<string | null>(null);
  const [litterId, setLitterId] = useState<string | null>(null);
  const [dogs, setDogs] = useState<{ id: string; name: string }[]>([]);
  const [litters, setLitters] = useState<{ id: string; label: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const supabase = requireSupabase();
      const [{ data: dogRows }, { data: litterRows }] = await Promise.all([
        supabase.from('dogs').select('id, name, call_name').order('name').limit(400),
        supabase
          .from('litters')
          .select('id, name, litter_letter, actual_date')
          .order('actual_date', { ascending: false, nullsFirst: false })
          .limit(40),
      ]);
      setDogs(
        (dogRows ?? []).map((d) => ({
          id: d.id,
          name: d.call_name?.trim() || d.name,
        })),
      );
      setLitters(
        (litterRows ?? []).map((l) => {
          const name = l.name ?? (l.litter_letter ? `Litter ${l.litter_letter}` : 'Litter');
          return { id: l.id, label: l.actual_date ? `${name} · ${l.actual_date}` : name };
        }),
      );
    })();
  }, []);

  const filteredDogs = useMemo(() => {
    const q = dogQuery.trim().toLowerCase();
    if (!q) return dogs.slice(0, 12);
    return dogs.filter((d) => d.name.toLowerCase().includes(q)).slice(0, 12);
  }, [dogs, dogQuery]);

  const filteredLitters = useMemo(() => {
    const q = litterQuery.trim().toLowerCase();
    if (!q) return litters;
    return litters.filter((l) => l.label.toLowerCase().includes(q));
  }, [litters, litterQuery]);

  async function apply() {
    setBusy(true);
    try {
      await reclassifyExpenses({
        ids: selectedIds,
        allocationType: target,
        dogId,
        litterId,
      });
      showSaved('Reclassified');
      onDone();
    } catch (e) {
      Alert.alert('Could not reclassify', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBusy(false);
    }
  }

  if (selectedIds.length === 0) return null;

  return (
    <View className="mb-4 rounded-xl border border-gold/30 bg-gold/10 p-3">
      <Typography variant="caption" className="mb-2 text-gold">
        Reclassify {selectedIds.length} expense{selectedIds.length === 1 ? '' : 's'}
      </Typography>
      <View className="mb-2 flex-row flex-wrap gap-2">
        {(['company', 'shared', 'dog', 'litter'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTarget(t)}
            className={`rounded-full border px-3 py-1.5 ${
              target === t ? 'border-gold bg-gold/20' : 'border-gold/30'
            }`}
          >
            <Typography variant="caption">
              {t === 'company'
                ? 'Company'
                : t === 'shared'
                  ? 'Shared'
                  : t === 'dog'
                    ? 'Dog'
                    : 'Litter'}
            </Typography>
          </Pressable>
        ))}
      </View>
      {target === 'dog' ? (
        <View className="mb-2">
          <TextInput
            value={dogQuery}
            onChangeText={setDogQuery}
            placeholder="Search dogs…"
            placeholderTextColor={Colors.silver}
            className="mb-2 border-b border-gold/20 pb-2 text-white"
          />
          <ScrollView style={{ maxHeight: 140 }}>
            {filteredDogs.map((d) => (
              <Pressable
                key={d.id}
                onPress={() => setDogId(d.id)}
                className={`py-2 ${dogId === d.id ? 'bg-gold/10' : ''}`}
              >
                <Typography variant="body">{d.name}</Typography>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
      {target === 'litter' ? (
        <View className="mb-2">
          <TextInput
            value={litterQuery}
            onChangeText={setLitterQuery}
            placeholder="Search litters…"
            placeholderTextColor={Colors.silver}
            className="mb-2 border-b border-gold/20 pb-2 text-white"
          />
          <ScrollView style={{ maxHeight: 140 }}>
            {filteredLitters.map((l) => (
              <Pressable
                key={l.id}
                onPress={() => setLitterId(l.id)}
                className={`py-2 ${litterId === l.id ? 'bg-gold/10' : ''}`}
              >
                <Typography variant="body">{l.label}</Typography>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
      <Pressable
        onPress={() => void apply()}
        disabled={busy}
        className="rounded-full border border-gold bg-gold px-4 py-2"
      >
        <Typography variant="label" className="text-center text-black-rich">
          {busy ? 'Saving…' : 'Apply'}
        </Typography>
      </Pressable>
    </View>
  );
}
