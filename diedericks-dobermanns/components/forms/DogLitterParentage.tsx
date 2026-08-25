import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Controller, type Control, type UseFormSetValue, useWatch } from 'react-hook-form';

import type { DogFormValues } from '@/components/forms/DogForm';
import { ToggleRow } from '@/components/forms/fields';
import { Typography } from '@/components/ui/Typography';
import { supabase } from '@/lib/supabase';
import {
  inheritedParentageText,
  parentageDiffersFromLitter,
  type LitterParentageOption,
} from '@/lib/dogs/litterParentage';
import {
  fetchLitterParentageOptions,
  fetchParentDogOptions,
} from '@/lib/dogs/litterParentageOptions';
import type { Dog } from '@/types/app.types';

function PickerList({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <ScrollView
      nestedScrollEnabled
      className="mb-4 max-h-48 rounded-xl border border-gold/20 bg-surface"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value || 'none'}
            onPress={() => onChange(opt.value)}
            className={`border-b border-gold/10 px-4 py-2.5 ${active ? 'bg-gold/15' : ''}`}
          >
            <Typography variant="body" className={active ? 'text-gold' : 'text-text'}>
              {opt.label}
            </Typography>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function DogLitterParentage({
  control,
  setValue,
  dog,
}: {
  control: Control<DogFormValues>;
  setValue: UseFormSetValue<DogFormValues>;
  dog?: Dog;
}) {
  const litterId = (useWatch({ control, name: 'litter_id' }) as string) ?? '';
  const override = Boolean(useWatch({ control, name: 'override_parentage' }));
  const [litters, setLitters] = useState<LitterParentageOption[]>([]);
  const [parents, setParents] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async () => {
    if (!supabase) return;
    try {
      const [litterRows, parentRows] = await Promise.all([
        fetchLitterParentageOptions(),
        fetchParentDogOptions(),
      ]);
      setLitters(litterRows);
      setParents(parentRows.filter((p) => p.id !== dog?.id));
      const current = litterRows.find((l) => l.id === (dog?.litter_id ?? ''));
      setValue(
        'override_parentage',
        parentageDiffersFromLitter(current, dog?.father_id, dog?.mother_id),
      );
    } catch {
      setLitters([]);
      setParents([]);
    }
  }, [dog?.id, dog?.litter_id, dog?.father_id, dog?.mother_id, setValue]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = litters.find((l) => l.id === litterId);
  const inherited = inheritedParentageText(selected);
  const emptyLitter = Boolean(litterId && selected && !selected.sireName && !selected.damName);
  const showSelects = !litterId || override;

  return (
    <View className="mb-2">
      <Typography variant="label" className="mb-2 mt-2">
        Litter
      </Typography>
      <Controller
        control={control}
        name="litter_id"
        render={({ field: { value, onChange } }) => (
          <PickerList
            value={(value as string) ?? ''}
            onChange={onChange}
            options={[
              { value: '', label: '— None —' },
              ...litters.map((l) => ({ value: l.id, label: l.label })),
            ]}
          />
        )}
      />

      {inherited ? (
        <Typography
          variant="body"
          className={`mb-3 ${emptyLitter ? 'text-amber-200' : 'text-text'}`}
        >
          {inherited}
        </Typography>
      ) : null}

      {litterId ? (
        <ToggleRow
          control={control}
          name="override_parentage"
          label="Override parentage — this puppy's sire or dam differs from the litter"
        />
      ) : null}

      {showSelects ? (
        <>
          <Typography variant="caption" className="mb-2 text-silver">
            {override ? 'Sire (override)' : 'Sire (Father)'}
          </Typography>
          <Controller
            control={control}
            name="father_id"
            render={({ field: { value, onChange } }) => (
              <PickerList
                value={(value as string) ?? ''}
                onChange={onChange}
                options={[
                  { value: '', label: '—' },
                  ...parents.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            )}
          />
          <Typography variant="caption" className="mb-2 text-silver">
            {override ? 'Dam (override)' : 'Dam (Mother)'}
          </Typography>
          <Controller
            control={control}
            name="mother_id"
            render={({ field: { value, onChange } }) => (
              <PickerList
                value={(value as string) ?? ''}
                onChange={onChange}
                options={[
                  { value: '', label: '—' },
                  ...parents.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            )}
          />
        </>
      ) : null}
    </View>
  );
}
