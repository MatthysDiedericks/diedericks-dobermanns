import { View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { titleCase } from '@/lib/format';

const STATUS_TONE: Record<string, 'gold' | 'neutral' | 'muted' | 'danger'> = {
  active: 'danger',
  in_heat: 'danger',
  completed: 'neutral',
  skipped: 'muted',
  anovulatory: 'muted',
  mated: 'gold',
  confirmed_pregnant: 'gold',
  whelped: 'neutral',
  no_outcome: 'muted',
};

interface HeatStatusBadgeProps {
  status: string;
  predicted?: boolean;
}

export function HeatStatusBadge({ status, predicted }: HeatStatusBadgeProps) {
  const label = predicted ? 'Predicted' : titleCase(status.replace(/_/g, ' '));
  const tone = predicted ? 'gold' : (STATUS_TONE[status] ?? 'neutral');
  return (
    <View className={predicted ? 'rounded-full border border-dashed border-gold/50 px-1' : undefined}>
      <Badge label={label} tone={tone} />
    </View>
  );
}
