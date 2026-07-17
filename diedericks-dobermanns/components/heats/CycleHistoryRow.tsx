import { Pressable, View } from 'react-native';

import { HeatStatusBadge } from '@/components/heats/HeatStatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Typography } from '@/components/ui/Typography';
import type { HeatCycleRecord } from '@/lib/heats/constants';
import { formatKennelDate } from '@/lib/kennel/formatters';

interface CycleHistoryRowProps {
  cycle: HeatCycleRecord;
  expanded?: boolean;
  onPress?: () => void;
}

export function CycleHistoryRow({ cycle, expanded, onPress }: CycleHistoryRowProps) {
  return (
    <Pressable onPress={onPress} className="mb-2 rounded-xl border border-gold/15 bg-surface p-3">
      <View className="flex-row items-center justify-between">
        <Typography variant="subtitle">{formatKennelDate(cycle.heat_start_date)}</Typography>
        {cycle.status === 'no_outcome' ? (
          <Badge label="No outcome" tone="muted" />
        ) : (
          <HeatStatusBadge status={cycle.status} />
        )}
      </View>
      <Typography variant="caption" className="mt-1 text-muted">
        Cycle length: {cycle.actual_cycle_length_days != null ? `${cycle.actual_cycle_length_days} days` : '—'}
        {' · '}Mating: {cycle.mating_date ? '✓' : '—'}
        {' · '}Litter: {cycle.resulting_litter_id ? '✓' : '—'}
      </Typography>
      {expanded ? (
        <View className="mt-2 border-t border-gold/10 pt-2">
          {cycle.ovulation_date ? (
            <Typography variant="caption">Ovulation {formatKennelDate(cycle.ovulation_date)}</Typography>
          ) : null}
          {cycle.expected_whelp_date ? (
            <Typography variant="caption">
              Expected whelp {formatKennelDate(cycle.expected_whelp_date)}
            </Typography>
          ) : null}
          {cycle.notes ? (
            <Typography variant="caption" className="text-muted">
              {cycle.notes}
            </Typography>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
