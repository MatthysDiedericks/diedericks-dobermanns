import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';

export function MatchScoreBar({ score }: { score: number }) {
  const pct = Math.min(Math.max(score, 0), 100);
  return (
    <View className="mt-2">
      <View className="h-2 overflow-hidden rounded-full bg-surface">
        <View className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
      </View>
      <Typography variant="caption" className="mt-1 text-gold">
        {pct}% match
      </Typography>
    </View>
  );
}
