import { Grid, OptionGroup, SelectField, TextInput } from "./FormFields";
import { optionsFor } from "./labels";
import type { StepProps } from "./FormFields";

export function Step2Lifestyle({ register, errors }: StepProps) {
  return (
    <Grid>
      <OptionGroup
        register={register}
        name="home_type"
        label="Home type *"
        error={errors.home_type?.message}
        options={optionsFor("home_type")}
      />
      <OptionGroup
        register={register}
        name="has_secure_yard"
        label="Do you have a secure, fenced yard? *"
        error={errors.has_secure_yard?.message}
        options={optionsFor("has_secure_yard")}
      />
      <OptionGroup
        register={register}
        name="yard_size"
        label="Property / yard size *"
        error={errors.yard_size?.message}
        options={optionsFor("yard_size")}
      />
      <OptionGroup
        register={register}
        name="sleeping_arrangement"
        label="Where will the dog sleep? *"
        error={errors.sleeping_arrangement?.message}
        options={optionsFor("sleeping_arrangement")}
      />
      <OptionGroup
        register={register}
        name="hours_alone_per_day"
        label="Hours alone per day *"
        error={errors.hours_alone_per_day?.message}
        options={optionsFor("hours_alone_per_day")}
      />
      <OptionGroup
        register={register}
        name="exercise_level"
        label="Activity level *"
        error={errors.exercise_level?.message}
        options={optionsFor("exercise_level")}
      />
      <TextInput
        register={register}
        name="current_pets"
        label="Current pets (optional)"
        full
        rows={2}
      />
      <TextInput
        register={register}
        name="children_ages"
        label="Children's ages (optional)"
        placeholder="e.g. 6 and 9, or none"
      />
    </Grid>
  );
}
