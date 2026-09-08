import type { ApplicationFormValues } from '@/components/forms/ApplicationForm/schema';
import { PREFERENCE_COLOUR_OPTIONS } from '@/lib/colours/dogColours';
import { ControlledAgreement } from '@/components/forms/ApplicationForm/AgreementBox';
import { ControlledInput, OptionGroup, ToggleRow } from '@/components/forms/fields';
import { Typography } from '@/components/ui/Typography';
import type { Control, UseFormSetValue } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { EMPTY_DOG_REQUEST } from '@/lib/applications/dogRequests';

interface StepProps {
  control: Control<ApplicationFormValues>;
  setValue?: UseFormSetValue<ApplicationFormValues>;
}

export function Step4Preferences({ control, setValue }: StepProps) {
  const router = useRouter();
  const dogsRequested = useWatch({ control, name: 'dogs_requested' }) ?? 1;
  const extra = useWatch({ control, name: 'extra_dog_requests' }) ?? [];

  function setCount(n: number) {
    if (!setValue) return;
    const count = Math.min(4, Math.max(1, n));
    setValue('dogs_requested', count, { shouldValidate: true });
    const next = [...extra];
    while (next.length < count - 1) next.push({ ...EMPTY_DOG_REQUEST });
    setValue('extra_dog_requests', next.slice(0, Math.max(0, count - 1)), { shouldValidate: true });
  }

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
      <Pressable onPress={() => router.push('/(public)/elite-developed' as Href)} className="mb-4">
        <Typography variant="caption" className="text-gold">
          Elite Developed — what six months includes →
        </Typography>
      </Pressable>
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
        options={PREFERENCE_COLOUR_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
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
      <Typography variant="label" className="mb-2 mt-2">
        How many dogs are you applying for?
      </Typography>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {([1, 2, 3, 4] as const).map((n) => (
          <Pressable
            key={n}
            onPress={() => setCount(n)}
            className={`rounded-lg border px-4 py-2 ${dogsRequested === n ? 'border-gold bg-gold/15' : 'border-gold/20'}`}
          >
            <Typography variant="caption" className={dogsRequested === n ? 'text-gold' : ''}>
              {n}
            </Typography>
          </Pressable>
        ))}
      </View>
      {dogsRequested > 1 ? (
        <Typography variant="caption" className="mb-4 text-silver">
          Household details stay the same. Set preferences for each extra dog below.
        </Typography>
      ) : null}
      {extra.slice(0, Math.max(0, dogsRequested - 1)).map((_, i) => (
        <View key={i} className="mb-4 rounded-xl border border-gold/20 p-3">
          <Typography variant="subtitle" className="mb-3 text-gold">
            Dog {i + 2} of {dogsRequested}
          </Typography>
          <OptionGroup
            control={control}
            name={`extra_dog_requests.${i}.preferred_sex`}
            label="Preferred sex *"
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'no_preference', label: 'No preference' },
            ]}
          />
          <OptionGroup
            control={control}
            name={`extra_dog_requests.${i}.preferred_colour`}
            label="Preferred colour *"
            options={PREFERENCE_COLOUR_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          <OptionGroup
            control={control}
            name={`extra_dog_requests.${i}.tail_preference`}
            label="Tail preference *"
            options={[
              { value: 'docked', label: 'Docked (traditional)' },
              { value: 'natural', label: 'Natural (undocked)' },
              { value: 'no_preference', label: 'No preference' },
            ]}
          />
          <OptionGroup
            control={control}
            name={`extra_dog_requests.${i}.preferred_timeline`}
            label="When do you want this dog? *"
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
            name={`extra_dog_requests.${i}.budget_range`}
            label="Budget range *"
            options={[
              { value: 'standard', label: 'Standard Puppy (contact us for current pricing)' },
              { value: 'elite', label: 'Elite / Developed (contact us for current pricing)' },
              { value: 'open', label: 'Open — best available dog regardless of price' },
            ]}
          />
          <ControlledInput
            control={control}
            name={`extra_dog_requests.${i}.notes`}
            label="Notes for this dog (optional)"
            placeholder="Anything specific to this second (or later) dog"
            multiline
          />
        </View>
      ))}
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
