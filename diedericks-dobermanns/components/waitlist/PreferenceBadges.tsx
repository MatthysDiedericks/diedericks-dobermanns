import { View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Typography } from '@/components/ui/Typography';
import { CATEGORY_LABELS } from '@/lib/waitlist/helpers';
import type { WaitingListEntry } from '@/types/app.types';

export function PreferenceBadges({ entry }: { entry: WaitingListEntry }) {
  const cat = CATEGORY_LABELS[entry.preferred_category ?? 'any'] ?? 'Any';
  const sex =
    entry.preferred_sex === 'male' ? '♂ Male' : entry.preferred_sex === 'female' ? '♀ Female' : 'Either';
  return (
    <View className="flex-row flex-wrap gap-1">
      <Badge label={cat} tone="gold" />
      <Typography variant="caption" className="text-silver">
        {sex}
        {entry.preferred_colour ? ` · ${entry.preferred_colour}` : ''}
      </Typography>
    </View>
  );
}
