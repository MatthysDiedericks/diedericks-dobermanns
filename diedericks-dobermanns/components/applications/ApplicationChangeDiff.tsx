import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import type { FieldChange } from '@/lib/applications/versionDiff';

export function ApplicationChangeDiff({ changes }: { changes: FieldChange[] }) {
  if (changes.length === 0) {
    return <Typography variant="caption">No field differences recorded.</Typography>;
  }
  return (
    <View className="gap-2">
      {changes.map((c) => (
        <View key={c.field}>
          <Typography variant="caption">{c.label}</Typography>
          <Typography variant="body">
            {c.from} → {c.to}
          </Typography>
        </View>
      ))}
    </View>
  );
}
