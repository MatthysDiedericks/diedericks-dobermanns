import { Grid, OptionGroup, TextInput } from "./FormFields";
import { optionsFor } from "./labels";
import type { StepProps } from "./FormFields";

export function Step3Experience({ register, errors }: StepProps) {
  return (
    <Grid>
      <div className="mb-2 rounded-sm border border-gold/30 bg-gold/5 p-4 sm:col-span-2">
        <p className="text-sm leading-relaxed text-muted">
          As responsible breeders, we need to ensure every Diedericks Dobermann goes to a home
          that is genuinely prepared for the breed. Please answer each question honestly.
        </p>
      </div>
      <TextInput
        register={register}
        name="why_dobermann"
        label="Why do you specifically want a Dobermann? *"
        error={errors.why_dobermann?.message}
        full
        rows={4}
      />
      <OptionGroup
        register={register}
        name="dobermann_experience_level"
        label="Your experience with Dobermanns *"
        error={errors.dobermann_experience_level?.message}
        options={optionsFor("dobermann_experience_level")}
      />
      <OptionGroup
        register={register}
        name="aware_of_dcm"
        label="Awareness of DCM (Dilated Cardiomyopathy) *"
        error={errors.aware_of_dcm?.message}
        options={optionsFor("aware_of_dcm")}
      />
      <OptionGroup
        register={register}
        name="aware_of_commitment"
        label="10–14 year commitment *"
        error={errors.aware_of_commitment?.message}
        options={optionsFor("aware_of_commitment")}
      />
      <OptionGroup
        register={register}
        name="aware_of_costs"
        label="Financial readiness *"
        error={errors.aware_of_costs?.message}
        options={optionsFor("aware_of_costs")}
      />
      <TextInput
        register={register}
        name="previous_dog_fate"
        label="What happened to your previous dog(s)? (optional)"
        full
        rows={2}
      />
      <TextInput
        register={register}
        name="experience_with_dobermanns"
        label="Additional experience notes (optional)"
        full
        rows={2}
      />
      <TextInput register={register} name="vet_name" label="Veterinarian name (optional)" />
      <TextInput register={register} name="vet_phone" label="Veterinarian phone (optional)" />
      <TextInput
        register={register}
        name="personal_reference_name"
        label="Personal reference name (optional)"
      />
      <TextInput
        register={register}
        name="personal_reference_phone"
        label="Personal reference phone (optional)"
      />
    </Grid>
  );
}
