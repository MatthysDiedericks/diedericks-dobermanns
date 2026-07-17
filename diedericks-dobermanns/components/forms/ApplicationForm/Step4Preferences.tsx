import type { Control } from 'react-hook-form';
import { View } from 'react-native';

import { ControlledAgreement } from '@/components/forms/ApplicationForm/AgreementBox';
import { ControlledInput, OptionGroup, ToggleRow } from '@/components/forms/fields';
import { Typography } from '@/components/ui/Typography';
import type { ApplicationFormValues } from '@/components/forms/ApplicationForm/schema';

interface StepProps {
  control: Control<ApplicationFormValues>;
}

export function Step4Preferences({ control }: StepProps) {
  return (
    <View>
      <OptionGroup
        control={control}
        name="dog_interest"
        label="What are you interested in? *"
        options={[
          { value: 'puppy', label: 'Standard Puppy' },
          { value: 'elite_developed', label: 'Elite Developed Puppy (6 months in-kennel development)' },
          { value: 'protection_dog', label: 'Fully Trained Protection Dog' },
        ]}
      />
      <OptionGroup
        control={control}
        name="purpose"
        label="Primary purpose *"
        options={[
          { value: 'family', label: 'Family Companion' },
          { value: 'protection', label: 'Personal Protection' },
          { value: 'sport', label: 'Sport (PSA / IGP)' },
          { value: 'companion', label: 'Companion' },
        ]}
      />
      <OptionGroup
        control={control}
        name="preferred_sex"
        label="Preferred sex *"
        options={[
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
          { value: 'no_preference', label: 'No preference' },
        ]}
      />
      <OptionGroup
        control={control}
        name="preferred_colour"
        label="Preferred colour *"
        options={[
          { value: 'black_tan', label: 'Black & Tan' },
          { value: 'brown_tan', label: 'Brown & Tan' },
          { value: 'no_preference', label: 'No preference' },
        ]}
      />
      <OptionGroup
        control={control}
        name="tail_preference"
        label="Tail preference * (must be decided before whelping)"
        options={[
          { value: 'docked', label: 'Docked (traditional)' },
          { value: 'natural', label: 'Natural (undocked)' },
          { value: 'no_preference', label: 'No preference' },
        ]}
      />
      <Typography variant="caption" className="mb-4 text-silver">
        Tail docking is performed at 2–5 days of age. Your preference must be communicated to us
        before the litter is born. If no preference is selected, we will apply our standard
        programme practice.
      </Typography>
      <OptionGroup
        control={control}
        name="preferred_timeline"
        label="When do you want your dog? *"
        options={[
          { value: 'asap', label: 'As soon as possible' },
          { value: '3_months', label: 'Within 3 months' },
          { value: '6_months', label: 'Within 6 months' },
          { value: 'next_litter', label: 'Next available litter' },
          { value: 'flexible', label: 'Flexible' },
        ]}
      />
      <OptionGroup
        control={control}
        name="budget_range"
        label="Budget range *"
        options={[
          { value: 'standard', label: 'Standard Puppy (contact us for current pricing)' },
          { value: 'elite', label: 'Elite / Developed (contact us for current pricing)' },
          { value: 'open', label: 'Open — best available dog regardless of price' },
        ]}
      />
      <ToggleRow
        control={control}
        name="training_planned"
        label="I plan to enrol this dog in professional obedience or protection training"
      />
      <ControlledInput
        control={control}
        name="security_requirements"
        label="Security or training requirements (optional)"
        placeholder="Any specific security, sport, or training goals for this dog"
        multiline
      />
      <ControlledAgreement
        control={control}
        name="delivery_acknowledged"
        title="Pretoria collection / delivery"
        description="I understand and acknowledge that all puppies from Diedericks Dobermanns are collected from, or delivered to, Pretoria on the confirmed handover date. I am responsible for arranging transport from Pretoria if I am based elsewhere. Any deviation from this arrangement must be discussed and agreed in writing with Diedericks Dobermanns in advance."
      />
      <ControlledInput
        control={control}
        name="special_requests"
        label="Special requests (optional)"
        placeholder="Any additional requests, preferences, or information you would like us to consider (e.g. ear cropping preference, specific bloodline interest, timing constraints)"
        multiline
      />
    </View>
  );
}
