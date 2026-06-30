import { View } from 'react-native';

import { PredictionCard } from '@/components/heats/PredictionCard';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useBreedDefaults } from '@/hooks/useHeatCycles';
import { personalCycleAverage, addDays } from '@/lib/heats/calculations';
import type { HeatCycleRecord } from '@/lib/heats/constants';

interface HeatPredictionsTabProps {
  dogId: string;
  cycles: HeatCycleRecord[];
}

export function HeatPredictionsTab({ cycles }: HeatPredictionsTabProps) {
  const { defaults } = useBreedDefaults();
  const confirmed = cycles.filter((c) => !c.is_predicted);
  const personalAvg = personalCycleAverage(confirmed);
  const predicted = cycles
    .filter((c) => c.is_predicted)
    .sort((a, b) => a.heat_start_date.localeCompare(b.heat_start_date))
    .slice(0, 3);

  const sourceLabel =
    confirmed.length >= 2 && personalAvg
      ? `Based on her personal average (${personalAvg} days)`
      : 'Based on Dobermann breed average (180 days)';

  return (
    <View className="pb-8 gap-4">
      {predicted.length === 0 ? (
        <Typography variant="bodyMuted" className="py-8 text-center">
          No predictions yet. Confirm a heat cycle to generate forecasts.
        </Typography>
      ) : (
        predicted.map((p) => (
          <PredictionCard
            key={p.id}
            cycle={p}
            sourceLabel={sourceLabel}
            ovulationDate={p.ovulation_date ?? addDays(p.heat_start_date, defaults.ovulation_offset_days)}
          />
        ))
      )}

      <Card>
        <Typography variant="caption" className="text-muted">
          Predictions update automatically when you confirm each actual heat. The more cycles
          recorded, the more accurate the forecast.
        </Typography>
      </Card>

      <Card>
        <Typography variant="label" className="mb-2 text-gold">
          12-MONTH OUTLOOK
        </Typography>
        {predicted.map((p) => (
          <View key={p.id} className="mb-2 flex-row items-center gap-2">
            <View className="h-3 w-3 rounded-full bg-gold" />
            <Typography variant="caption">
              Predicted heat window starting {p.heat_start_date}
            </Typography>
          </View>
        ))}
      </Card>
    </View>
  );
}
