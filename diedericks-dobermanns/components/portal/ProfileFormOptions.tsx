import { Pressable } from 'react-native';

import { Typography } from '@/components/ui/Typography';

export const EXPERIENCE_OPTIONS = [
  { value: 'first_time', label: 'First-time owner' },
  { value: 'previously_owned', label: 'Previously owned a Dobermann' },
  { value: 'current_owner', label: 'Current / multiple owner' },
  { value: 'professional', label: 'Professional handler / trainer' },
] as const;

export const PROPERTY_OPTIONS = ['House with yard', 'Smallholding', 'Farm', 'Apartment'] as const;

export const PURPOSE_OPTIONS = [
  'Family companion',
  'Personal protection',
  'Sport / PSA / IPO',
  'Show / breeding',
  'Business / security protection',
] as const;

export function ProfileChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mb-2 mr-2 rounded-full border px-3 py-2 ${active ? 'border-gold bg-gold/15' : 'border-gold/25'}`}
    >
      <Typography variant="caption">{label}</Typography>
    </Pressable>
  );
}
