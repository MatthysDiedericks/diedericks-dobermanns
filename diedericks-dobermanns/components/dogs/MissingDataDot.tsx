import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';

export function MissingDataDot({ gaps }: { gaps: string[] }) {
  if (!gaps.length) return null;
  const label = gaps.join(', ');
  return (
    <View className="flex-row items-center gap-1">
      <View className="h-2 w-2 rounded-full bg-amber-400" />
      <Typography variant="caption" className="text-amber-200">
        {label}
      </Typography>
    </View>
  );
}
