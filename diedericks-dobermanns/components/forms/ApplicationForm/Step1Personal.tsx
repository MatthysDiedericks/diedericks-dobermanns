import type { Control } from 'react-hook-form';
import { View } from 'react-native';

import { ControlledInput } from '@/components/forms/fields';
import type { ApplicationFormValues } from '@/components/forms/ApplicationForm/schema';

interface StepProps {
  control: Control<ApplicationFormValues>;
}

export function Step1Personal({ control }: StepProps) {
  return (
    <View>
      <ControlledInput control={control} name="full_name" label="Full legal name *" placeholder="Your full name" autoCapitalize="words" />
      <ControlledInput control={control} name="date_of_birth" label="Date of birth *" placeholder="DD/MM/YYYY" />
      <ControlledInput control={control} name="id_number" label="ID / Passport number *" placeholder="ID or passport number" />
      <ControlledInput control={control} name="email" label="Email address *" placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
      <ControlledInput control={control} name="phone" label="Phone number *" placeholder="+27 ..." keyboardType="phone-pad" />
      <ControlledInput control={control} name="occupation" label="Occupation *" placeholder="Your occupation" autoCapitalize="words" />
      <ControlledInput control={control} name="employer" label="Employer (optional)" placeholder="Company or employer" autoCapitalize="words" />
      <ControlledInput control={control} name="country" label="Country *" />
      <ControlledInput control={control} name="province" label="Province / State (optional)" />
      <ControlledInput control={control} name="city" label="City (optional)" />
      <ControlledInput
        control={control}
        name="address"
        label="Physical address *"
        placeholder="Address where the dog will live"
        multiline
      />
    </View>
  );
}
