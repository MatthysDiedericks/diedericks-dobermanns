import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { BreedingSelectField } from '@/components/forms/BreedingSelectField';
import { DogSelectField } from '@/components/forms/DogSelectField';
import { ControlledInput, OptionGroup, ToggleRow } from '@/components/forms/fields';
import {
  litterFormDefaults,
  litterFormPayload,
  litterSchema,
  type LitterFormValues,
} from '@/components/forms/litterFormSchema';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { useActiveBreedings, type ActiveBreeding } from '@/hooks/useActiveBreedings';
import { useBreedingDogs, type BreedingDog } from '@/hooks/useBreedingDogs';
import { goHomeWindow, whelpWindow } from '@/lib/dogs/whelpDates';
import { linkBreedingToLitter, saveLitter } from '@/hooks/useMutations';
import {
  blank,
  generateLitterName,
  litterNameDate,
  nextLitterLetter,
  validateLitter,
} from '@/lib/litters/validate';
import { requireSupabase, supabase } from '@/lib/supabase';
import type { Litter } from '@/types/app.types';
import type { TablesInsert } from '@/types/database.types';

interface LitterFormProps {
  litter?: Litter;
  onSaved: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function mergeDams(active: BreedingDog[], historical: BreedingDog[]): BreedingDog[] {
  const seen = new Set(active.map((d) => d.id));
  const extra = historical.filter((d) => !seen.has(d.id));
  return [...active, ...extra].sort((a, b) => a.name.localeCompare(b.name));
}

export function LitterForm({ litter, onSaved }: LitterFormProps) {
  const { females, males, historicalDams, loading: dogsLoading } = useBreedingDogs();
  const { breedings, loading: breedingsLoading } = useActiveBreedings();
  const { control, handleSubmit, watch, setValue } = useForm<LitterFormValues>({
    resolver: zodResolver(litterSchema),
    defaultValues: litterFormDefaults(litter),
  });
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedBreedingId, setSelectedBreedingId] = useState<string | null>(null);
  const [includeHistorical, setIncludeHistorical] = useState(false);
  const inFlight = useRef(false);
  const lastGeneratedName = useRef<string | null>(null);
  const skipLetterSuggest = useRef(Boolean(litter?.litter_letter));

  const status = watch('status');
  const motherId = watch('mother_id');
  const fatherId = watch('father_id');
  const name = watch('name');
  const expectedDate = watch('expected_date');
  const actualDate = watch('actual_date');
  const isNew = !litter;
  const damOptions = useMemo(
    () => (includeHistorical ? mergeDams(females, historicalDams) : females),
    [females, historicalDams, includeHistorical],
  );
  const dam =
    damOptions.find((d) => d.id === motherId) ??
    historicalDams.find((d) => d.id === motherId) ??
    null;
  const sire = males.find((d) => d.id === fatherId) ?? null;
  const problems = validateLitter({
    name,
    status,
    mother_id: motherId,
    father_id: fatherId,
    expected_date: expectedDate,
    actual_date: actualDate,
    dam,
    sire,
    includeRetiredAndDeceasedDams: includeHistorical,
    existingMotherId: litter?.mother_id ?? null,
    existingFatherId: litter?.father_id ?? null,
  });
  const showBornOffer =
    (status === 'planned' || status === 'expected') && Boolean(blank(actualDate));

  useEffect(() => {
    const generated = generateLitterName(
      dam?.name,
      sire?.name,
      litterNameDate(expectedDate, actualDate),
    );
    if (!generated) return;
    if (!blank(name) || name === lastGeneratedName.current) {
      lastGeneratedName.current = generated;
      setValue('name', generated);
    }
  }, [dam?.name, sire?.name, expectedDate, actualDate, name, setValue]);

  useEffect(() => {
    if (!motherId || !supabase) return;
    if (skipLetterSuggest.current) {
      skipLetterSuggest.current = false;
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await requireSupabase()
        .from('litters')
        .select('id, litter_letter')
        .eq('mother_id', motherId);
      if (cancelled) return;
      const used = (data ?? [])
        .filter((row) => row.id !== litter?.id)
        .map((row) => row.litter_letter);
      setValue('litter_letter', nextLitterLetter(used));
    })();
    return () => {
      cancelled = true;
    };
  }, [motherId, litter?.id, setValue]);

  function applyBreeding(b: ActiveBreeding | null) {
    setSelectedBreedingId(b?.id ?? null);
    if (!b) return;
    setValue('mother_id', b.damId);
    if (b.sireId) setValue('father_id', b.sireId);
    setValue('status', 'born');
    setValue('actual_date', todayIso());
    if (b.expectedWhelpDate) setValue('expected_date', b.expectedWhelpDate);
    const whelp = whelpWindow(null, b.matingDate, b.expectedWhelpDate);
    const goHome = goHomeWindow(whelp.expected);
    setValue('go_home_date', goHome.standard);
  }

  async function onValid(values: LitterFormValues) {
    if (inFlight.current) return;
    const nextProblems = validateLitter({
      name: values.name,
      status: values.status,
      mother_id: values.mother_id,
      father_id: values.father_id,
      expected_date: values.expected_date,
      actual_date: values.actual_date,
      dam,
      sire,
      includeRetiredAndDeceasedDams: includeHistorical,
      existingMotherId: litter?.mother_id ?? null,
      existingFatherId: litter?.father_id ?? null,
    });
    if (nextProblems.length > 0) {
      setSaveError(nextProblems[0].message);
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setSaveError(null);
    try {
      const payload = litterFormPayload(values) as TablesInsert<'litters'>;
      const { error, id } = await saveLitter(payload, litter?.id, {
        includeRetiredAndDeceasedDams: includeHistorical,
      });
      if (error) {
        setSaveError(error);
        return;
      }
      if (isNew && selectedBreedingId && id) {
        const link = await linkBreedingToLitter(
          selectedBreedingId,
          id,
          (payload.actual_date as string | null) ?? null,
        );
        if (link.error) console.error('[LitterForm] linkBreedingToLitter:', link.error);
      }
      onSaved();
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <View>
      {isNew ? (
        <BreedingSelectField
          label="Start from a breeding (optional)"
          value={selectedBreedingId}
          onChange={applyBreeding}
          breedings={breedings}
          loading={breedingsLoading}
          placeholder="No open breedings — enter details manually"
        />
      ) : null}
      <ControlledInput control={control} name="name" label="Litter name" placeholder="Claire × Santini – Jul 2026" />
      <Controller
        control={control}
        name="litter_letter"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <Input
            label="Litter letter"
            value={value ?? ''}
            onChangeText={(t) => onChange(t.toUpperCase().slice(0, 1))}
            onBlur={onBlur}
            error={error?.message}
            placeholder="A"
            autoCapitalize="characters"
            maxLength={1}
          />
        )}
      />
      <OptionGroup
        control={control}
        name="status"
        label="Status"
        options={[
          { value: 'planned', label: 'Planned' },
          { value: 'expected', label: 'Expected' },
          { value: 'born', label: 'Born' },
        ]}
      />
      <Controller
        control={control}
        name="mother_id"
        render={({ field: { value, onChange } }) => (
          <DogSelectField
            label="Dam (mother)"
            value={value.trim() || null}
            onChange={(id) => onChange(id ?? '')}
            dogs={dogsLoading ? [] : damOptions}
            placeholder="Select dam…"
          />
        )}
      />
      <Controller
        control={control}
        name="father_id"
        render={({ field: { value, onChange } }) => (
          <DogSelectField
            label="Sire (father)"
            value={value.trim() || null}
            onChange={(id) => onChange(id ?? '')}
            dogs={dogsLoading ? [] : males}
            placeholder="Select sire…"
          />
        )}
      />
      <Pressable
        onPress={() => setIncludeHistorical((v) => !v)}
        className="mb-4 flex-row items-center justify-between rounded-xl border border-gold/20 bg-surface px-4 py-3"
      >
        <Typography variant="body">Include retired and deceased dams</Typography>
        <View className={`h-6 w-11 rounded-full p-0.5 ${includeHistorical ? 'bg-gold' : 'bg-black-rich'}`}>
          <View className={`h-5 w-5 rounded-full bg-ink ${includeHistorical ? 'ml-auto' : ''}`} />
        </View>
      </Pressable>
      <ControlledInput
        control={control}
        name="expected_date"
        label="Expected date (YYYY-MM-DD)"
        placeholder="2026-08-01"
        autoCapitalize="none"
      />
      <ControlledInput
        control={control}
        name="actual_date"
        label="Actual whelp date (YYYY-MM-DD)"
        placeholder="Leave empty unless born"
        autoCapitalize="none"
      />
      {status === 'born' || status === 'placed' ? (
        <>
          <OptionGroup
            control={control}
            name="whelping_type"
            label="Whelping type"
            options={[
              { value: 'natural', label: 'Natural' },
              { value: 'c_section', label: 'C-Section' },
            ]}
          />
          <ControlledInput
            control={control}
            name="actual_time"
            label="Actual whelp time (HH:MM)"
            placeholder="06:30"
            autoCapitalize="none"
          />
        </>
      ) : null}
      <ControlledInput
        control={control}
        name="go_home_date"
        label="Go home date (YYYY-MM-DD)"
        placeholder="2026-08-14"
        autoCapitalize="none"
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <ControlledInput control={control} name="male_count" label="Male pups" keyboardType="phone-pad" />
        </View>
        <View className="flex-1">
          <ControlledInput control={control} name="female_count" label="Female pups" keyboardType="phone-pad" />
        </View>
      </View>
      <ControlledInput control={control} name="puppy_count" label="Total puppies" keyboardType="phone-pad" />
      <ControlledInput control={control} name="available_count" label="Available count" keyboardType="phone-pad" />
      <ControlledInput control={control} name="description" label="Description" multiline />
      <ToggleRow control={control} name="is_public" label="Publicly visible" />
      {showBornOffer ? (
        <View className="mb-3 rounded-xl border border-gold/30 bg-gold/10 p-3">
          <Typography variant="caption" className="text-text">
            You have set a birth date. A {status} litter cannot also be born.
          </Typography>
          <Pressable onPress={() => setValue('status', 'born')} className="mt-2">
            <Typography variant="caption" className="text-gold">
              Change status to born
            </Typography>
          </Pressable>
        </View>
      ) : null}
      {problems.length > 0
        ? problems.map((p) => (
            <Typography key={`${p.field}:${p.message}`} variant="caption" className="mt-1 text-danger">
              {p.message}
            </Typography>
          ))
        : null}
      {saveError ? (
        <Typography variant="caption" className="mt-2 text-danger">
          {saveError}
        </Typography>
      ) : null}
      <Button
        label={submitting ? 'Saving…' : litter ? 'Save Changes' : 'Create Litter'}
        onPress={handleSubmit(onValid)}
        disabled={submitting || problems.length > 0}
        fullWidth
        className="mt-4"
      />
    </View>
  );
}
