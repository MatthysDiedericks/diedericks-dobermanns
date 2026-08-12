import { View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Typography } from '@/components/ui/Typography';
import { preferenceChipLabel } from '@/lib/waitlist/matching';
import type { WaitingListEntry } from '@/types/app.types';

export function PreferenceBadges({ entry }: { entry: WaitingListEntry }) {
  const label = preferenceChipLabel(entry);
  return (
    <View className="flex-row flex-wrap gap-1">
      <Badge label={label} tone="gold" />
      {entry.priority === 'high' ? <Badge label="High priority" tone="danger" /> : null}
      {entry.internal_flags?.includes('quote_cancelled') ? (
        <Typography variant="caption" className="text-danger">
          Quote cancelled — follow up
        </Typography>
      ) : null}
    </View>
  );
}
