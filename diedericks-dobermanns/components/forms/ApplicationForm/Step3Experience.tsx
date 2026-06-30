import type { Control } from 'react-hook-form';
import { View } from 'react-native';

import { DueDiligenceGroup } from '@/components/forms/ApplicationForm/AgreementBox';
import { ControlledInput, OptionGroup } from '@/components/forms/fields';
import { Typography } from '@/components/ui/Typography';
import type { ApplicationFormValues } from '@/components/forms/ApplicationForm/schema';

interface StepProps {
  control: Control<ApplicationFormValues>;
}

export function Step3Experience({ control }: StepProps) {
  return (
    <View>
      <View className="mb-6 rounded-xl border border-gold/40 bg-gold/5 p-4">
        <Typography variant="bodyMuted" className="leading-6">
          As responsible breeders, we need to ensure every Diedericks Dobermann goes to a home
          that is genuinely prepared for the breed. Please answer each question honestly.
        </Typography>
      </View>

      <ControlledInput
        control={control}
        name="why_dobermann"
        label="Why do you specifically want a Dobermann? *"
        placeholder="Tell us what drew you to the breed and why a Dobermann is right for your lifestyle"
        multiline
      />

      <OptionGroup
        control={control}
        name="dobermann_experience_level"
        label="Your experience with Dobermanns *"
        options={[
          { value: 'researched_only', label: 'I have never owned one but I have researched the breed' },
          { value: 'previous_owner', label: 'I have owned a Dobermann previously' },
          { value: 'experienced_handler', label: 'I am an experienced handler or trainer' },
          { value: 'breeder_trainer', label: 'I am a breeder or have professional experience with the breed' },
        ]}
      />

      <DueDiligenceGroup
        control={control}
        name="aware_of_dcm"
        title="Are you aware that Dobermanns are genetically prone to DCM (Dilated Cardiomyopathy)? *"
        options={[
          { value: 'yes_fully_aware', label: 'Yes, I am fully aware and prepared for this' },
          { value: 'aware_learning_more', label: 'I am aware and am still learning about it' },
          { value: 'not_aware', label: 'I was not aware — please tell me more' },
        ]}
        helperNote="DCM is one of the leading causes of death in the breed. Our breeding stock is tested for DCM1–DCM5 genetic panels to reduce risk, but all buyers should be aware of the breed's cardiac predisposition."
      />

      <DueDiligenceGroup
        control={control}
        name="aware_of_commitment"
        title="Do you understand that this is a 10–14 year commitment? *"
        options={[
          { value: 'yes_fully_prepared', label: 'Yes, I am fully prepared for a lifetime commitment' },
          { value: 'mostly_prepared', label: 'Mostly prepared — I understand the timeframe' },
          { value: 'need_more_info', label: 'I need more information before committing' },
        ]}
      />

      <DueDiligenceGroup
        control={control}
        name="aware_of_costs"
        title="Are you financially prepared for the ongoing costs of owning a Dobermann? *"
        options={[
          { value: 'yes_fully_budgeted', label: 'Yes, I have budgeted for all costs' },
          { value: 'mostly_prepared', label: 'Mostly — I am prepared for standard costs' },
          { value: 'need_cost_breakdown', label: 'I would like a cost breakdown before deciding' },
        ]}
      />

      <ControlledInput
        control={control}
        name="previous_dog_fate"
        label="What happened to your previous dog(s)? (optional)"
        placeholder="e.g. Passed away at age 12, still alive, had to rehome due to relocation..."
        multiline
      />
      <ControlledInput
        control={control}
        name="experience_with_dobermanns"
        label="Any additional notes on your experience or background (optional)"
        multiline
      />
      <ControlledInput control={control} name="vet_name" label="Veterinarian name (optional)" autoCapitalize="words" />
      <ControlledInput control={control} name="vet_phone" label="Veterinarian phone (optional)" keyboardType="phone-pad" />
      <ControlledInput control={control} name="personal_reference_name" label="Personal reference name (optional)" autoCapitalize="words" />
      <ControlledInput control={control} name="personal_reference_phone" label="Personal reference phone (optional)" keyboardType="phone-pad" />
    </View>
  );
}
