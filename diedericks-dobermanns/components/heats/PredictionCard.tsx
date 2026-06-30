import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import type { HeatCycleRecord } from '@/lib/heats/constants';
import { daysUntil } from '@/lib/heats/calculations';
import { formatKennelDate } from '@/lib/kennel/formatters';

interface PredictionCardProps {
  cycle: HeatCycleRecord;
  sourceLabel: string;
  ovulationDate?: string | null;
}

export function PredictionCard({ cycle, sourceLabel, ovulationDate }: PredictionCardProps) {
  const days = daysUntil(cycle.heat_start_date);
  return (
    <View className="rounded-xl border border-dashed border-gold/40 bg-gold/5 p-4">
      <Typography variant="label" className="text-gold">
        NEXT PREDICTED HEAT
      </Typography>
      <Typography variant="display" className="mt-2 text-gold">
        {formatKennelDate(cycle.heat_start_date)}
      </Typography>
      <Typography variant="body" className="mt-1">
        {days != null && days >= 0 ? `In ${days} days` : `${Math.abs(days ?? 0)} days ago`}
      </Typography>
      {ovulationDate ? (
        <Typography variant="caption" className="mt-2">
          Predicted ovulation: {formatKennelDate(ovulationDate)}
        </Typography>
      ) : null}
      {cycle.expected_whelp_date ? (
        <Typography variant="caption" className="text-muted">
          If bred — whelp ~{formatKennelDate(cycle.expected_whelp_date)}
        </Typography>
      ) : null}
      <Typography variant="caption" className="mt-3 text-muted">
        {sourceLabel}
      </Typography>
    </View>
  );
}
