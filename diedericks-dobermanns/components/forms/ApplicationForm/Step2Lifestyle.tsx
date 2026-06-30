import type { Control } from 'react-hook-form';
import { View } from 'react-native';

import { ControlledInput, OptionGroup } from '@/components/forms/fields';
import type { ApplicationFormValues } from '@/components/forms/ApplicationForm/schema';

interface StepProps {
  control: Control<ApplicationFormValues>;
}

export function Step2Lifestyle({ control }: StepProps) {
  return (
    <View>
      <OptionGroup
        control={control}
        name="home_type"
        label="Home type *"
        options={[
          { value: 'house', label: 'House' },
          { value: 'apartment', label: 'Apartment' },
          { value: 'smallholding', label: 'Smallholding' },
          { value: 'farm', label: 'Farm' },
        ]}
      />
      <OptionGroup
        control={control}
        name="has_secure_yard"
        label="Do you have a secure, fenced yard? *"
        options={[
          { value: 'yes', label: 'Yes, fully fenced and secure' },
          { value: 'in_progress', label: 'Not yet, but in progress' },
          { value: 'no', label: 'No' },
        ]}
      />
      <OptionGroup
        control={control}
        name="yard_size"
        label="Property / yard size *"
        options={[
          { value: 'small_under_200', label: 'Small (under 200m²)' },
          { value: 'medium_200_500', label: 'Medium (200–500m²)' },
          { value: 'large_500_plus', label: 'Large (500m² and above)' },
          { value: 'open_land', label: 'Open land / farm' },
          { value: 'no_yard', label: 'No yard' },
        ]}
      />
      <OptionGroup
        control={control}
        name="sleeping_arrangement"
        label="Where will the dog sleep? *"
        options={[
          { value: 'inside_bedroom', label: 'Inside — bedroom' },
          { value: 'inside_lounge', label: 'Inside — lounge / living area' },
          { value: 'indoor_kennel', label: 'Inside — dedicated indoor kennel' },
          { value: 'outdoor_kennel', label: 'Outside — secure outdoor kennel' },
          { value: 'mixed_indoor_outdoor', label: 'Mixed — indoor and outdoor access' },
        ]}
      />
      <OptionGroup
        control={control}
        name="hours_alone_per_day"
        label="How many hours per day will the dog be left alone? *"
        options={[
          { value: '0_2', label: '0–2 hours (almost always supervised)' },
          { value: '2_4', label: '2–4 hours' },
          { value: '4_6', label: '4–6 hours' },
          { value: '6_8', label: '6–8 hours' },
          { value: '8_plus', label: 'More than 8 hours' },
        ]}
      />
      <OptionGroup
        control={control}
        name="exercise_level"
        label="How active is your lifestyle? *"
        options={[
          { value: 'very_active', label: 'Very active (daily running, hiking, sport)' },
          { value: 'active', label: 'Active (daily walks, regular outdoor activity)' },
          { value: 'moderate', label: 'Moderate (regular walks, some outdoor activity)' },
          { value: 'light', label: 'Light (short walks, mostly indoor)' },
        ]}
      />
      <ControlledInput
        control={control}
        name="current_pets"
        label="Current pets (optional)"
        placeholder="e.g. 1 Labrador (male, 3 years), 2 cats"
        multiline
      />
      <ControlledInput
        control={control}
        name="children_ages"
        label="Children and ages (optional)"
        placeholder="e.g. 2 children, ages 6 and 9"
      />
    </View>
  );
}
