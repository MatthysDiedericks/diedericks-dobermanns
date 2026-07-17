import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

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
import { useBreedingDogs } from '@/hooks/useBreedingDogs';
import { goHomeWindow, whelpWindow } from '@/lib/dogs/whelpDates';
import { linkBreedingToLitter, saveLitter, useSubmitting } from '@/hooks/useMutations';
import type { Litter } from '@/types/app.types';
import type { TablesInsert } from '@/types/database.types';

interface LitterFormProps {
  litter?: Litter;
  onSaved: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LitterForm({ litter, onSaved }: LitterFormProps) {
  const { females, males, loading: dogsLoading } = useBreedingDogs();
  const { breedings, loading: breedingsLoading } = useActiveBreedings();
  const { control, handleSubmit, watch, setValue } = useForm<LitterFormValues>({
    resolver: zodResolver(litterSchema),
    defaultValues: litterFormDefaults(litter),
  });
  const { submitting, run } = useSubmitting();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedBreedingId, setSelectedBreedingId] = useState<string | null>(null);

  const status = watch('status');
  const motherId = watch('mother_id');
  const fatherId = watch('father_id');
  const litterLetter = watch('litter_letter');
  const name = watch('name');
  const isBorn = status === 'born' || status === 'placed';
  const isNew = !litter;

  useEffect(() => {
    if (name.trim() || !motherId || !fatherId) return;
    const dam = females.find((d) => d.id === motherId);
    const sire = males.find((d) => d.id === fatherId);
    if (!dam || !sire) return;
    const prefix = litterLetter.trim() ? `${litterLetter.trim().toUpperCase()}-` : '';
    setValue('name', `${prefix}Litter (${sire.name} × ${dam.name})`);
  }, [motherId, fatherId, litterLetter, name, females, males, setValue]);

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
    setSaveError(null);
    const payload = litterFormPayload(values) as TablesInsert<'litters'>;
    const { error, id } = await run(() => saveLitter(payload, litter?.id));
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
      <ControlledInput control={control} name="name" label="Litter name" placeholder="A-Litter (Sire × Dam)" />
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
            dogs={dogsLoading ? [] : females}
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
      {isBorn ? (
        <OptionGroup
          control={control}
          name="whelping_type"
          label="Whelping type"
          options={[
            { value: 'natural', label: 'Natural' },
            { value: 'c_section', label: 'C-Section' },
          ]}
        />
      ) : null}
      {!isBorn ? (
        <ControlledInput
          control={control}
          name="expected_date"
          label="Expected date (YYYY-MM-DD)"
          placeholder="2026-08-01"
          autoCapitalize="none"
        />
      ) : null}
      {isBorn ? (
        <>
          <ControlledInput
            control={control}
            name="actual_date"
            label="Actual whelp date (YYYY-MM-DD)"
            placeholder="2026-06-05"
            autoCapitalize="none"
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
      {saveError ? (
        <Typography variant="caption" className="mt-2 text-danger">
          {saveError}
        </Typography>
      ) : null}
      <Button
        label={litter ? 'Save Changes' : 'Create Litter'}
        onPress={handleSubmit(onValid)}
        loading={submitting}
        fullWidth
        className="mt-4"
      />
    </View>
  );
}
