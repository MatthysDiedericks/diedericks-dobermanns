import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { dueChipStyle, dueStatus, type DueChipStatus } from '@/lib/health/dueStatus';

export function HealthDueChip({ nextDue }: { nextDue: string | null | undefined }) {
  const status = dueStatus(nextDue);
  const style = dueChipStyle(status);
  return (
    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: style.bg }}>
      <Typography variant="caption" style={{ color: style.text, fontSize: 10 }}>
        {style.label}
      </Typography>
    </View>
  );
}

export function HealthDueChipByStatus({ status }: { status: DueChipStatus }) {
  const style = dueChipStyle(status);
  return (
    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: style.bg }}>
      <Typography variant="caption" style={{ color: style.text, fontSize: 10 }}>
        {style.label}
      </Typography>
    </View>
  );
}
