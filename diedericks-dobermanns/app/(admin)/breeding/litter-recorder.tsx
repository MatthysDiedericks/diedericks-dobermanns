import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useAllPairings, useRecordLitterFromPairing } from '@/hooks/useBreedingProgramme';
import { requireSupabase } from '@/lib/supabase';
import type { BreedingDog, BreedingLine } from '@/types/breeding';

function nameIncludes(name: string, fragment: string): boolean {
  return name.toLowerCase().includes(fragment.toLowerCase());
}

export default function LitterRecorderScreen() {
  const router = useRouter();
  const { pairingId: paramPairingId } = useLocalSearchParams<{ pairingId?: string }>();
  const { pairings, loading } = useAllPairings();
  const recordLitter = useRecordLitterFromPairing();

  const [pairingId, setPairingId] = useState(paramPairingId ?? '');
  const [whelpDate, setWhelpDate] = useState(new Date().toISOString().slice(0, 10));
  const [puppyCount, setPuppyCount] = useState('6');
  const [maleCount, setMaleCount] = useState('3');
  const [femaleCount, setFemaleCount] = useState('3');
  const [retainedMaleId, setRetainedMaleId] = useState('');
  const [retainedFemaleIds, setRetainedFemaleIds] = useState<string[]>([]);
  const [pups, setPups] = useState<{ id: string; name: string; sex: string | null }[]>([]);
  const [crossLine, setCrossLine] = useState<BreedingLine>('A');
  const [saving, setSaving] = useState(false);

  const pairing = useMemo(
    () => pairings.find((p) => p.id === pairingId),
    [pairings, pairingId],
  );

  const showLineBSireBanner = useMemo(() => {
    if (!pairing?.sire?.name || !pairing?.dam?.name) return false;
    return nameIncludes(pairing.sire.name, 'Hunter') && nameIncludes(pairing.dam.name, 'Cleopatra');
  }, [pairing]);

  useEffect(() => {
    if (paramPairingId && !pairingId) setPairingId(paramPairingId);
  }, [paramPairingId, pairingId]);

  useEffect(() => {
    void (async () => {
      const { data } = await requireSupabase()
        .from('dogs')
        .select('id, name, sex')
        .in('category', ['puppy', 'breeding_stock'])
        .order('name');
      setPups((data ?? []) as { id: string; name: string; sex: string | null }[]);
    })();
  }, []);

  const nextGeneration = (pairing?.generation ?? 1) + 1;
  const defaultLine = pairing?.line === 'Cross' ? crossLine : (pairing?.line ?? 'A');

  function toggleFemale(id: string) {
    setRetainedFemaleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onSave() {
    if (!pairingId) return;
    setSaving(true);
    try {
      await recordLitter({
        pairingId,
        whelpDate,
        puppyCount: Number(puppyCount) || 0,
        maleCount: Number(maleCount) || 0,
        femaleCount: Number(femaleCount) || 0,
        retainedMaleId: retainedMaleId || null,
        retainedFemaleIds,
        retainedMaleLine: defaultLine,
        retainedMaleGeneration: nextGeneration,
        retainedFemales: retainedFemaleIds.map((id) => ({
          id,
          line: pairing?.line === 'Cross' ? crossLine : (pairing?.line ?? 'A'),
          generation: nextGeneration,
        })),
        litterName: pairing
          ? `${pairing.sire?.name ?? 'Sire'} × ${pairing.dam?.name ?? 'Dam'} ${whelpDate}`
          : undefined,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Breeding Programme" title="Litter Recorder" />
      <ScrollView className="px-6 pb-12">
        {showLineBSireBanner ? (
          <Card className="mb-4 border-gold/40 bg-gold/10">
            <Typography variant="label" className="text-gold">
              This litter should produce your next Line B Sire (Gen 2)
            </Typography>
          </Card>
        ) : null}

        <Typography variant="caption" className="mb-2 text-muted">
          Pairing *
        </Typography>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {loading ? (
            <Typography variant="caption">Loading pairings…</Typography>
          ) : (
            pairings
              .filter((p) => p.status !== 'Prohibited')
              .map((p) => (
                <Button
                  key={p.id}
                  label={`${p.sire?.name ?? '?'} × ${p.dam?.name ?? '?'}`}
                  size="sm"
                  variant={pairingId === p.id ? 'primary' : 'outline'}
                  onPress={() => setPairingId(p.id)}
                />
              ))
          )}
        </View>

        <Typography variant="caption" className="mb-1 text-muted">
          Whelp date *
        </Typography>
        <TextInput
          value={whelpDate}
          onChangeText={setWhelpDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.silver}
          className="mb-4 rounded-xl border border-gold/20 bg-[#111008] px-4 py-3 font-body text-ink"
        />

        <View className="mb-4 flex-row gap-3">
          <View className="flex-1">
            <Typography variant="caption" className="mb-1 text-muted">
              Total pups
            </Typography>
            <TextInput
              value={puppyCount}
              onChangeText={setPuppyCount}
              keyboardType="number-pad"
              className="rounded-xl border border-gold/20 bg-[#111008] px-4 py-3 font-body text-ink"
            />
          </View>
          <View className="flex-1">
            <Typography variant="caption" className="mb-1 text-muted">
              Males
            </Typography>
            <TextInput
              value={maleCount}
              onChangeText={setMaleCount}
              keyboardType="number-pad"
              className="rounded-xl border border-gold/20 bg-[#111008] px-4 py-3 font-body text-ink"
            />
          </View>
          <View className="flex-1">
            <Typography variant="caption" className="mb-1 text-muted">
              Females
            </Typography>
            <TextInput
              value={femaleCount}
              onChangeText={setFemaleCount}
              keyboardType="number-pad"
              className="rounded-xl border border-gold/20 bg-[#111008] px-4 py-3 font-body text-ink"
            />
          </View>
        </View>

        {pairing?.line === 'Cross' ? (
          <>
            <Typography variant="caption" className="mb-2 text-muted">
              Which line does retained stock return to?
            </Typography>
            <View className="mb-4 flex-row gap-2">
              {(['A', 'B'] as const).map((l) => (
                <Button
                  key={l}
                  label={`Line ${l}`}
                  size="sm"
                  variant={crossLine === l ? 'primary' : 'outline'}
                  onPress={() => setCrossLine(l)}
                />
              ))}
            </View>
          </>
        ) : null}

        <Typography variant="label" className="mb-2 text-gold">
          SUCCESSION — Select pups to retain
        </Typography>

        <Typography variant="caption" className="mb-2 text-muted">
          Retained male (Line {defaultLine} Sire 2 prospect)
        </Typography>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {pups
            .filter((p) => p.sex === 'male')
            .map((p) => (
              <Button
                key={p.id}
                label={p.name}
                size="sm"
                variant={retainedMaleId === p.id ? 'primary' : 'outline'}
                onPress={() => setRetainedMaleId(p.id)}
              />
            ))}
        </View>

        <Typography variant="caption" className="mb-2 text-muted">
          Retained females (Dam prospects)
        </Typography>
        <View className="mb-6 flex-row flex-wrap gap-2">
          {pups
            .filter((p) => p.sex === 'female')
            .map((p) => (
              <Button
                key={p.id}
                label={p.name}
                size="sm"
                variant={retainedFemaleIds.includes(p.id) ? 'primary' : 'outline'}
                onPress={() => toggleFemale(p.id)}
              />
            ))}
        </View>

        <Button label="Save litter & succession" onPress={() => void onSave()} loading={saving} fullWidth />
      </ScrollView>
    </ScreenContainer>
  );
}
