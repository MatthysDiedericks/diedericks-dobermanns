import { View } from 'react-native';

import { PredictionCard } from '@/components/heats/PredictionCard';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useBreedDefaults } from '@/hooks/useHeatCycles';
import { forecastFromHistory } from '@/lib/heats/forecast';
import type { HeatCycleRecord } from '@/lib/heats/constants';

interface HeatPredictionsTabProps {
  cycles: HeatCycleRecord[];
  dateOfBirth?: string | null;
}

export function HeatPredictionsTab({ cycles, dateOfBirth }: HeatPredictionsTabProps) {
  const { defaults } = useBreedDefaults();
  const forecast = forecastFromHistory(cycles, defaults, dateOfBirth);

  return (
    <View className="gap-4 pb-8">
      {forecast ? (
        <PredictionCard
          rangeLabel={forecast.rangeLabel}
          sourceLabel={forecast.basisLabel}
          expectedStart={forecast.expectedStart}
        />
      ) : (
        <Typography variant="bodyMuted" className="py-8 text-center">
          No predictions yet. Record a heat cycle to generate forecasts.
        </Typography>
      )}

      <Card>
        <Typography variant="caption" className="text-muted">
          Predictions update when you record each actual heat. A range is shown, never a single day.
        </Typography>
      </Card>
    </View>
  );
}
