import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { CollarPickerField } from '@/components/litters/CollarPicker';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { seedLitterTodos } from '@/hooks/useLitterTodos';
import { useLitterDetail } from '@/hooks/useDogs';
import { DOG_COLOUR_OPTIONS, type DogColourCode } from '@/lib/colours/dogColours';
import { newbornPuppyInsert } from '@/lib/litters/newbornPuppy';
import { collarLabel, type CollarColourId } from '@/lib/litters/collarColours';
import { PUPPY_OUTCOMES, type PuppyOutcome } from '@/lib/litters/outcomes';
import {
  formatPuppySaved,
  intakeIsComplete,
  validatePuppyIntake,
  type IntakeErrors,
} from '@/lib/litters/puppyIntake';
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
  const [colour, setColour] = useState<DogColourCode>('black_tan');
  const [collar, setCollar] = useState<CollarColourId | null>(null);
  const [tail, setTail] = useState<'docked' | 'natural' | null>(null);
  const [birthGrams, setBirthGrams] = useState('');
  const [outcome, setOutcome] = useState<PuppyOutcome>('live');
  const [outcomeDate, setOutcomeDate] = useState('');
  const [outcomeNote, setOutcomeNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<IntakeErrors>({});
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [savedLine, setSavedLine] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState({ male: 0, female: 0 });

  const letter = litter?.litter_letter ?? 'X';
  const usedCollars = useMemo(
    () => puppies.map((p) => (p as { collar_colour?: string }).collar_colour).filter(Boolean) as string[],
    [puppies],
  );
  const duplicateCollar = collar != null && usedCollars.includes(collar);

  async function savePup(andNext: boolean) {
    if (!litter) return;
    const grams = parseInt(birthGrams, 10);
    const intakeErrors = validatePuppyIntake({
      sex,
      collarColour: collar,
      tailType: tail,
      birthWeightGrams: Number.isFinite(grams) ? grams : null,
      birthTime: timeBorn,
      usedCollars,
      allowDuplicateCollar: allowDuplicate,
    });
    setFieldErrors(intakeErrors);
    if (!intakeIsComplete(intakeErrors) || !tail) return;
    setSaving(true);
    try {
      const client = requireSupabase();
      const name = `${letter}${pupIndex}`;
      const birthDate = litter.actual_date ?? new Date().toISOString().slice(0, 10);
      const { data: dog, error: dogErr } = await client
        .from('dogs')
        .insert(
          newbornPuppyInsert({
            name,
            sex,
            tail_type: tail,
            programme_tier: litter.default_programme_tier ?? null,
            colour,
            collar_colour: collar,
            birth_order: pupIndex,
            birth_time: timeBorn || null,
            birth_weight_grams: grams,
            date_of_birth: birthDate,
            litter_id: litterId,
            outcome,
            outcome_date: outcomeDate || null,
            outcome_note: outcomeNote || null,
          }),
        )
        .select('id')
        .single();
      if (dogErr) throw new Error(dogErr.message);

      // No birth weight log — it lives on dogs.birth_weight_grams alone. A log
      // row with session 'AM' on the birth date was claimed by the puppy's own
      // first morning weigh-in, which overwrote the birth weight.

      setSavedCount((c) => ({
        male: c.male + (sex === 'male' ? 1 : 0),
        female: c.female + (sex === 'female' ? 1 : 0),
      }));

      if (andNext) {
        setPupIndex((i) => i + 1);
        setBirthGrams('');
        setCollar(null);
        setTail(null);
        setOutcome('live');
        setOutcomeDate('');
        setOutcomeNote('');
        setAllowDuplicate(false);
        setFieldErrors({});
        const line = formatPuppySaved({
          order: pupIndex,
          collarLabel: collarLabel(collar),
          sex,
          grams,
          time: timeBorn,
        });
        setSavedLine(line);
        await refresh();
        showSaved(line);
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
        <Typography variant="caption" className="mb-2 text-subtle">
          Colour
        </Typography>
        <View className="mb-4 flex-row gap-2">
          {DOG_COLOUR_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setColour(opt.value)}
              className={`flex-1 rounded-xl border py-3 ${colour === opt.value ? 'border-gold bg-gold/15' : 'border-gold/25'}`}
            >
              <Typography variant="caption" className="text-center">
                {opt.label}
              </Typography>
            </Pressable>
          ))}
        </View>
        <Typography variant="caption" className="mb-2 mt-2 text-subtle">
          Collar colour
        </Typography>
        <CollarPickerField
          value={collar}
          onChange={setCollar}
          usedColours={usedCollars}
          duplicateWarning={duplicateCollar}
        />
        {fieldErrors.collar ? (
          <Typography variant="caption" className="mb-2 text-red-300">{fieldErrors.collar}</Typography>
        ) : null}
        <Typography variant="caption" className="mb-2 mt-2 text-subtle">
          Tail
        </Typography>
        <View className="mb-3 flex-row gap-2">
          {(['docked', 'natural'] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setTail(value)}
              className={`flex-1 rounded-xl border py-3 ${
                tail === value ? 'border-gold bg-gold/15' : 'border-gold/25'
              }`}
            >
              <Typography variant="caption" className="text-center">
                {value === 'docked' ? 'Docked' : 'Natural'}
              </Typography>
            </Pressable>
          ))}
        </View>
        {fieldErrors.tail ? (
          <Typography variant="caption" className="mb-2 text-red-300">{fieldErrors.tail}</Typography>
        ) : null}
        {duplicateCollar ? (
          <Pressable onPress={() => setAllowDuplicate((v) => !v)} className="mb-3">
            <Typography variant="caption" className="text-amber-200">
              {allowDuplicate ? '✓ ' : ''}Save anyway — two of this collar
            </Typography>
          </Pressable>
        ) : null}
        <Input
          label="Birth weight (g)"
          value={birthGrams}
          onChangeText={setBirthGrams}
          keyboardType="number-pad"
        />
        <Typography variant="caption" className="mb-4 text-subtle">
          = {previewKg} kg
        </Typography>
        {fieldErrors.weight ? (
          <Typography variant="caption" className="mb-2 text-red-300">{fieldErrors.weight}</Typography>
        ) : null}
        {fieldErrors.time ? (
          <Typography variant="caption" className="mb-2 text-red-300">{fieldErrors.time}</Typography>
        ) : null}
        {savedLine ? (
          <Typography variant="caption" className="mb-3 text-emerald-300">{savedLine}</Typography>
        ) : null}
        <Typography variant="caption" className="mb-2 text-subtle">
          Outcome
        </Typography>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {PUPPY_OUTCOMES.map((o) => (
            <Pressable
              key={o.value}
              onPress={() => setOutcome(o.value)}
              className={`rounded-xl border px-3 py-3 ${
                outcome === o.value ? 'border-gold bg-gold/15' : 'border-gold/25'
              }`}
            >
              <Typography variant="caption">{o.label}</Typography>
            </Pressable>
          ))}
        </View>
        {outcome !== 'live' ? (
          <>
            <Input
              label={outcome === 'stillborn' ? 'Date (optional)' : 'Date died'}
              value={outcomeDate}
              onChangeText={setOutcomeDate}
              placeholder="YYYY-MM-DD"
            />
            <Input label="Note" value={outcomeNote} onChangeText={setOutcomeNote} />
          </>
        ) : null}

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
