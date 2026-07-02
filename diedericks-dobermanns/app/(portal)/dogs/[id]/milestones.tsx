import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Dimensions, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useDogWeightLogs, useTrainingLogs } from '@/hooks/useRecords';
import { formatKennelDate } from '@/lib/kennel/formatters';

export default function DogMilestonesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dogId = id ?? '';
  const { data: logs, loading: logsLoading } = useTrainingLogs(dogId);
  const { weights, loading: weightsLoading, error } = useDogWeightLogs(dogId);

  const chart = useMemo(() => {
    if (weights.length === 0) return null;
    const labels = weights.map((w) => w.recorded_date.slice(5));
    const values = weights.map((w) => Number(w.weight_kg));
    return {
      labels: labels.length > 6 ? labels.filter((_, i) => i % Math.ceil(labels.length / 6) === 0) : labels,
      datasets: [{ data: values, color: () => Colors.gold, strokeWidth: 2 }],
    };
  }, [weights]);

  const milestones = logs.filter((l) => l.milestone);
  const loading = logsLoading || weightsLoading;

  if (loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Growth" title="Weight & Milestones" />
      <View className="px-6 pb-10">
        {error ? <Typography variant="body" className="mb-4 text-danger">{error}</Typography> : null}
        {chart ? (
          <Card className="mb-6 overflow-hidden p-2">
            <Typography variant="label" className="mb-2 px-2 text-gold">
              WEIGHT (KG)
            </Typography>
            <LineChart
              data={chart}
              width={Dimensions.get('window').width - 56}
              height={200}
              chartConfig={{
                backgroundColor: Colors.surface,
                backgroundGradientFrom: Colors.surface,
                backgroundGradientTo: Colors.surfaceElevated,
                decimalPlaces: 1,
                color: () => Colors.gold,
                labelColor: () => Colors.textMuted,
                propsForDots: { r: '4', strokeWidth: '2', stroke: Colors.goldLight },
              }}
              bezier
              style={{ borderRadius: 12 }}
            />
          </Card>
        ) : (
          <EmptyState title="No weight data yet" message="Your breeder will log weights as your puppy grows." />
        )}

        <Typography variant="label" className="mb-3 text-gold">
          MILESTONES
        </Typography>
        {milestones.length === 0 ? (
          <Typography variant="bodyMuted">No milestones recorded yet.</Typography>
        ) : (
          milestones.map((m) => (
            <Card key={m.id} className="mb-3">
              <Typography variant="subtitle">{m.milestone}</Typography>
              <Typography variant="caption" className="mt-1 text-silver">
                {formatKennelDate(m.session_date)}
              </Typography>
              {m.notes ? (
                <Typography variant="bodyMuted" className="mt-2">
                  {m.notes}
                </Typography>
              ) : null}
            </Card>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
