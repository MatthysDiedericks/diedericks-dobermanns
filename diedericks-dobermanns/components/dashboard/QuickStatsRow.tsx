import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { formatAmount } from '@/lib/finance/formatters';
import { usePhase10Stats } from '@/hooks/usePhase10Stats';

function StatCell({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-1 rounded-xl border border-gold/20 bg-surface p-3">
      <Typography variant="caption" className="text-subtle">{label}</Typography>
      <Typography variant="subtitle" className="mt-1 text-gold">{value}</Typography>
    </Pressable>
  );
}

export function QuickStatsRow() {
  const router = useRouter();
  const { stats } = usePhase10Stats();

  if (!stats) return null;

  return (
    <View className="mb-4 flex-row gap-2">
      <StatCell
        label="Active dogs"
        value={String(stats.totalDogs)}
        onPress={() => router.push('/(tabs)/dogs/index' as never)}
      />
      <StatCell
        label="Puppies avail."
        value={String(stats.puppiesAvailable)}
        onPress={() => router.push('/(tabs)/dogs/litters/index' as never)}
      />
      <StatCell
        label="Applications"
        value={String(stats.pendingApplications)}
        onPress={() => router.push('/(admin)/applications')}
      />
      <StatCell
        label="Outstanding"
        value={formatAmount(stats.invoicesOutstanding)}
        onPress={() => router.push('/(tabs)/finance/index' as never)}
      />
    </View>
  );
}
