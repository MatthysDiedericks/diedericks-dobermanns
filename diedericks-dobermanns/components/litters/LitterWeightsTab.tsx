import { View } from 'react-native';

import { EmptyTabState } from '@/components/dogs/detail/EmptyTabState';
import { PuppyGrowthChart } from '@/components/litters/PuppyGrowthChart';
import { WeightGrid } from '@/components/litters/WeightGrid';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { useLitterWeights } from '@/hooks/useLitterWeights';

interface LitterWeightsTabProps {
  litterId: string;
  whelpDate?: string | null;
}

export function LitterWeightsTab({ litterId, whelpDate }: LitterWeightsTabProps) {
  const {
    puppies,
    weightsByPuppyId,
    uniqueDates,
    loading,
    error,
    logWeightsBatch,
    weighingSummary,
  } = useLitterWeights(litterId, whelpDate);

  if (loading) {
    return (
      <View className="py-4">
        <CardListSkeleton count={3} />
      </View>
    );
  }

  if (error) return <EmptyTabState message={error} />;
  if (puppies.length === 0) {
    return <EmptyTabState message="No puppies recorded in this litter yet." />;
  }

  return (
    <View className="pb-12">
      <View className="mb-4 rounded-xl border border-gold/20 bg-surface p-3">
        <Typography variant="label" className="text-gold">
          {weighingSummary.phase === 'twice-daily'
            ? 'Twice daily'
            : weighingSummary.phase === 'daily'
              ? 'Daily weighing'
              : 'Complete'}
        </Typography>
        <Typography variant="caption" className="text-subtle">
          Day {weighingSummary.ageDays} · {weighingSummary.nextSessionLabel}
          {weighingSummary.isDueNow ? ' · DUE NOW' : weighingSummary.isDueSoon ? ' · Due soon' : ''}
        </Typography>
      </View>
      <WeightGrid
        puppies={puppies}
        weightsByPuppyId={weightsByPuppyId}
        whelpDate={whelpDate ?? null}
        onBatchSave={logWeightsBatch}
      />
      <PuppyGrowthChart
        puppies={puppies}
        weightsByPuppyId={weightsByPuppyId}
        uniqueDates={uniqueDates}
        whelpDate={whelpDate}
      />
    </View>
  );
}
