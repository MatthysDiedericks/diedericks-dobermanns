import { useState } from 'react';
import { FlatList, View } from 'react-native';

import { CycleHistoryRow } from '@/components/heats/CycleHistoryRow';
import { Typography } from '@/components/ui/Typography';
import { personalCycleAverage } from '@/lib/heats/calculations';
import type { HeatCycleRecord } from '@/lib/heats/constants';

interface HeatHistoryTabProps {
  cycles: HeatCycleRecord[];
}

export function HeatHistoryTab({ cycles }: HeatHistoryTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const confirmed = cycles.filter((c) => !c.is_predicted);
  const avg = personalCycleAverage(confirmed);

  return (
    <View className="pb-8">
      {confirmed.length === 0 ? (
        <Typography variant="bodyMuted" className="py-8 text-center">
          No confirmed heat history yet.
        </Typography>
      ) : (
        <FlatList
          data={confirmed}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <CycleHistoryRow
              cycle={item}
              expanded={expandedId === item.id}
              onPress={() => setExpandedId((id) => (id === item.id ? null : item.id))}
            />
          )}
        />
      )}
      <View className="mt-6 rounded-xl border border-gold/20 bg-surface p-4">
        <Typography variant="caption" className="text-muted">
          Personal average cycle: {avg != null ? `${avg} days` : '—'}
        </Typography>
        <Typography variant="caption" className="text-muted">
          Based on {confirmed.filter((c) => c.actual_cycle_length_days != null).length} confirmed
          cycles
        </Typography>
        <Typography variant="caption" className="mt-1 text-muted">
          Breed average: 180 days
        </Typography>
      </View>
    </View>
  );
}
