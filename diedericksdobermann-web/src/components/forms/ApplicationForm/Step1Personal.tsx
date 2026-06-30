import type { FieldErrors, UseFormRegister } from "react-hook-form";

import {
  Grid,
  TextInput,
} from "@/components/forms/ApplicationForm/FormFields";
import type { ApplicationFormValues } from "@/components/forms/ApplicationForm/schema";

interface StepProps {
  register: UseFormRegister<ApplicationFormValues>;
  errors: FieldErrors<ApplicationFormValues>;
}

export function Step1Personal({ register, errors }: StepProps) {
  return (
    <Grid>
      <TextInput
        register={register}
        name="full_name"
        label="Full Name *"
        error={errors.full_name?.message}
      />
      <TextInput
        register={register}
        name="date_of_birth"
        label="Date of Birth *"
        placeholder="DD/MM/YYYY"
        error={errors.date_of_birth?.message}
      />
      <TextInput
        register={register}
        name="id_number"
        label="ID / Passport Number *"
        error={errors.id_number?.message}
      />
      <TextInput
        register={register}
        name="email"
        label="Email *"
        type="email"
        error={errors.email?.message}
      />
      <TextInput
        register={register}
        name="phone"
        label="Phone *"
        error={errors.phone?.message}
      />
      <TextInput
        register={register}
        name="occupation"
        label="Occupation *"
        error={errors.occupation?.message}
      />
      <TextInput register={register} name="employer" label="Employer (optional)" />
      <TextInput
        register={register}
        name="country"
        label="Country *"
        error={errors.country?.message}
      />
      <TextInput register={register} name="province" label="Province / State (optional)" />
      <TextInput register={register} name="city" label="City (optional)" />
      <TextInput
        register={register}
        name="address"
        label="Physical Address *"
        placeholder="Address where the dog will live"
        error={errors.address?.message}
        full
        rows={2}
      />
      <TextInput
        register={register}
        name="instagram_handle"
        label="Instagram Handle (optional)"
        placeholder="@username"
      />
      <TextInput
        register={register}
        name="facebook_profile"
        label="Facebook Profile (optional)"
        placeholder="Profile URL or name"
      />
    </Grid>
  );
}
