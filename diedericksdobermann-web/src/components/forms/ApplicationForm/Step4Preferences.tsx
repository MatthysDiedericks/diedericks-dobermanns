import { CheckboxField, Grid, OptionGroup, TextInput } from "./FormFields";
import { optionsFor } from "./labels";
import type { StepProps } from "./FormFields";

export function Step4Preferences({ register, errors }: StepProps) {
  return (
    <Grid>
      <OptionGroup
        register={register}
        name="dog_interest"
        label="What are you interested in? *"
        error={errors.dog_interest?.message}
        options={optionsFor("dog_interest")}
      />
      <OptionGroup
        register={register}
        name="purpose"
        label="Primary purpose *"
        error={errors.purpose?.message}
        options={optionsFor("purpose")}
      />
      <OptionGroup
        register={register}
        name="preferred_sex"
        label="Preferred sex *"
        error={errors.preferred_sex?.message}
        options={optionsFor("preferred_sex")}
      />
      <OptionGroup
        register={register}
        name="preferred_colour"
        label="Preferred colour *"
        error={errors.preferred_colour?.message}
        options={optionsFor("preferred_colour")}
      />
      <OptionGroup
        register={register}
        name="tail_preference"
        label="Tail preference * (must be decided before whelping)"
        error={errors.tail_preference?.message}
        options={optionsFor("tail_preference")}
      />
      <p className="text-xs text-muted sm:col-span-2">
        Tail docking is performed at 2–5 days of age. Your preference must be communicated before
        the litter is born.
      </p>
      <OptionGroup
        register={register}
        name="preferred_timeline"
        label="When do you want your dog? *"
        error={errors.preferred_timeline?.message}
        options={optionsFor("preferred_timeline")}
      />
      <OptionGroup
        register={register}
        name="budget_range"
        label="Budget range *"
        error={errors.budget_range?.message}
        options={optionsFor("budget_range")}
      />
      <CheckboxField
        register={register}
        name="training_planned"
        label="I plan to enrol this dog in professional obedience or protection training"
        error={errors.training_planned}
      />
      <TextInput
        register={register}
        name="security_requirements"
        label="Security requirements (optional)"
        full
        rows={2}
      />
      <TextInput
        register={register}
        name="special_requests"
        label="Special requests (optional)"
        full
        rows={2}
      />
      <CheckboxField
        register={register}
        name="delivery_acknowledged"
        label="I acknowledge that collection is from Pretoria or that delivery can be arranged at additional cost"
        error={errors.delivery_acknowledged}
      />
    </Grid>
  );
}
