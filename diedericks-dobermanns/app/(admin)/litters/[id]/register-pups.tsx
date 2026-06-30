import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { CollarPickerField } from '@/components/litters/CollarPicker';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { type CollarColourId } from '@/lib/litters/collarColours';
import { seedLitterTodos } from '@/hooks/useLitterTodos';
import { gramsToKg } from '@/hooks/useLitterWeights';
import { useLitterDetail } from '@/hooks/useDogs';
import { requireSupabase } from '@/lib/supabase';
import { showError, showSaved } from '@/lib/dogDetail/feedback';

export default function RegisterPupsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const litterId = id ?? '';
  const { litter, puppies, refresh } = useLitterDetail(litterId);
  const [pupIndex, setPupIndex] = useState(puppies.length + 1);
  const [timeBorn, setTimeBorn] = useState(new Date().toTimeString().slice(0, 5));
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [colour, setColour] = useState('Black & Tan');
  const [collar, setCollar] = useState<CollarColourId | null>(null);
  const [birthGrams, setBirthGrams] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState({ male: 0, female: 0 });

  const letter = litter?.litter_letter ?? 'X';
  const usedCollars = useMemo(
    () => puppies.map((p) => (p as { collar_colour?: string }).collar_colour).filter(Boolean) as string[],
    [puppies],
  );
  const duplicateCollar = collar != null && usedCollars.includes(collar);

  async function savePup(andNext: boolean) {
    if (!litter || duplicateCollar) return;
    const grams = parseInt(birthGrams, 10);
    if (!Number.isFinite(grams) || grams <= 0) {
      showError('Enter birth weight in grams.');
      return;
    }
    setSaving(true);
    try {
      const client = requireSupabase();
      const name = `${letter}${pupIndex}`;
      const { data: dog, error: dogErr } = await client
        .from('dogs')
        .insert({
          name,
          sex,
          colour,
          collar_colour: collar,
          date_of_birth: litter.actual_date ?? new Date().toISOString().slice(0, 10),
          litter_id: litterId,
          status: 'puppy',
          birth_weight_grams: grams,
          category: 'puppy',
          breed: 'Dobermann',
        })
        .select('id')
        .single();
      if (dogErr) throw new Error(dogErr.message);

      await client.from('weight_logs').insert({
        dog_id: dog.id,
        weight_kg: gramsToKg(grams),
        recorded_date: litter.actual_date ?? new Date().toISOString().slice(0, 10),
        recorded_at: new Date().toISOString(),
        session: 'AM',
      });

      setSavedCount((c) => ({
        male: c.male + (sex === 'male' ? 1 : 0),
        female: c.female + (sex === 'female' ? 1 : 0),
      }));

      if (andNext) {
        setPupIndex((i) => i + 1);
        setBirthGrams('');
        setCollar(null);
        await refresh();
        showSaved('Saved ✓');
      } else {
        const maleCount = (litter.male_count ?? 0) + savedCount.male + (sex === 'male' ? 1 : 0);
        const femaleCount = (litter.female_count ?? 0) + savedCount.female + (sex === 'female' ? 1 : 0);
        await client
          .from('litters')
          .update({ male_count: maleCount, female_count: femaleCount, puppy_count: maleCount + femaleCount })
          .eq('id', litterId);
        const whelpDate = litter.actual_date ?? new Date().toISOString().slice(0, 10);
        const { count } = await client
          .from('litter_todos')
          .select('id', { count: 'exact', head: true })
          .eq('litter_id', litterId);
        if (!count) await seedLitterTodos(litterId, whelpDate);
        router.replace(`/(admin)/litters/${litterId}?tab=weights` as never);
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not save pup');
    } finally {
      setSaving(false);
    }
  }

  const previewKg = birthGrams ? (parseInt(birthGrams, 10) / 1000).toFixed(3) : '—';

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Whelping" title={`Register Pups — Litter ${letter}`} />
      <ScrollView className="px-6 pb-12">
        <View className="mb-6 rounded-xl border border-gold/20 bg-surface p-4">
          <Typography variant="body">
            ♂ {savedCount.male + puppies.filter((p) => p.sex === 'male').length} · ♀{' '}
            {savedCount.female + puppies.filter((p) => p.sex === 'female').length} · Total{' '}
            {puppies.length + savedCount.male + savedCount.female}
          </Typography>
        </View>

        <Typography variant="label" className="mb-2 text-gold">
          PUP #{pupIndex}
        </Typography>
        <Input label="Time born" value={timeBorn} onChangeText={setTimeBorn} />
        <Typography variant="caption" className="mb-2 text-subtle">
          Sex
        </Typography>
        <View className="mb-4 flex-row gap-2">
          {(['male', 'female'] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => setSex(s)}
              className={`flex-1 rounded-xl border py-4 ${sex === s ? 'border-gold bg-gold/15' : 'border-gold/25'}`}
            >
              <Typography variant="subtitle" className="text-center">
                {s === 'male' ? '♂ MALE' : '♀ FEMALE'}
              </Typography>
            </Pressable>
          ))}
        </View>
        <Input label="Colour" value={colour} onChangeText={setColour} />
        <Typography variant="caption" className="mb-2 mt-2 text-subtle">
          Collar colour
        </Typography>
        <CollarPickerField
          value={collar}
          onChange={setCollar}
          usedColours={usedCollars}
          duplicateWarning={duplicateCollar}
        />
        <Input
          label="Birth weight (g)"
          value={birthGrams}
          onChangeText={setBirthGrams}
          keyboardType="number-pad"
        />
        <Typography variant="caption" className="mb-4 text-subtle">
          = {previewKg} kg
        </Typography>

        <Button
          label="Save & Add Next Pup"
          onPress={() => void savePup(true)}
          loading={saving}
          fullWidth
          className="mb-3"
        />
        {pupIndex > 1 || puppies.length > 0 ? (
          <Button
            label="Litter Complete — Done"
            variant="outline"
            onPress={() => void savePup(false)}
            loading={saving}
            fullWidth
          />
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}
