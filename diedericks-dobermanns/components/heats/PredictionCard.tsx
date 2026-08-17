import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { daysUntil } from '@/lib/heats/calculations';

interface PredictionCardProps {
  rangeLabel: string;
  sourceLabel: string;
  expectedStart?: string | null;
}

export function PredictionCard({ rangeLabel, sourceLabel, expectedStart }: PredictionCardProps) {
  const days = daysUntil(expectedStart ?? null);
  return (
    <View className="rounded-xl border border-dashed border-gold/40 bg-gold/5 p-4">
      <Typography variant="label" className="text-gold">
        NEXT PREDICTED HEAT
      </Typography>
      <Typography variant="display" className="mt-2 text-gold">
        {rangeLabel.replace('Expected ', '')}
      </Typography>
      <Typography variant="body" className="mt-1">
        {days != null && days >= 0 ? `In ${days} days` : `${Math.abs(days ?? 0)} days ago`}
      </Typography>
      <Typography variant="caption" className="mt-3 text-muted">
        {sourceLabel}
      </Typography>
    </View>
  );
}
