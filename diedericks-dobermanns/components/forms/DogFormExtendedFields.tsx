import type { Control } from 'react-hook-form';

import { ControlledInput, OptionGroup, ToggleRow } from '@/components/forms/fields';
import type { DogFormValues } from '@/components/forms/DogForm';
import { Typography } from '@/components/ui/Typography';

interface DogFormExtendedFieldsProps {
  control: Control<DogFormValues>;
}

export function DogFormExtendedFields({ control }: DogFormExtendedFieldsProps) {
  return (
    <>
      <ControlledInput control={control} name="call_name" label="Call Name" autoCapitalize="words" />
      <ControlledInput control={control} name="location" label="Location / Country" autoCapitalize="words" />

      <Typography variant="label" className="mb-2 mt-2">
        Identifiers
      </Typography>
      <ControlledInput control={control} name="tattoo_number" label="Tattoo number" autoCapitalize="none" />
      <ControlledInput control={control} name="passport_number" label="Passport number" autoCapitalize="none" />
      <ControlledInput control={control} name="dna_number" label="DNA Number" autoCapitalize="none" />
      <ControlledInput control={control} name="insurance_number" label="Insurance number" autoCapitalize="none" />
      <ControlledInput
        control={control}
        name="registration_type"
        label="Registration Type (e.g. KUSA)"
        autoCapitalize="words"
      />

      <Typography variant="label" className="mb-2 mt-2">
        Physical
      </Typography>
      <ControlledInput control={control} name="coat_type" label="Coat type" placeholder="Short, Black & Rust" />
      <ControlledInput
        control={control}
        name="height_cm"
        label="Height (cm)"
        keyboardType="phone-pad"
        autoCapitalize="none"
      />
      <OptionGroup
        control={control}
        name="ear_type"
        label="Ear type"
        options={[
          { value: 'natural', label: 'Natural' },
          { value: 'cropped', label: 'Cropped' },
          { value: 'unknown', label: 'Unknown' },
        ]}
      />
      <ControlledInput control={control} name="eye_colour" label="Eye colour" autoCapitalize="words" />

      <Typography variant="label" className="mb-2 mt-2">
        Breeding status
      </Typography>
      <ToggleRow control={control} name="is_spayed_neutered" label="Spayed / Neutered" />
      <ControlledInput
        control={control}
        name="wrights_coi"
        label="Wright's COI (%)"
        keyboardType="phone-pad"
        autoCapitalize="none"
      />
    </>
  );
}
