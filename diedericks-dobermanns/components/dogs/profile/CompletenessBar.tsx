import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import {
  completenessSummary,
  type CompletenessResult,
} from '@/lib/dogs/completeness';

export function CompletenessBar({
  result,
  onJump,
}: {
  result: CompletenessResult;
  onJump?: (section: string) => void;
}) {
  const first = result.missing[0];
  return (
    <View className="mb-4">
      <Typography variant="body" className="text-amber-200">
        {completenessSummary(result)}
        {first ? ` · First gap: ${first.label}` : ' · complete'}
      </Typography>
      {first && onJump ? (
        <Pressable onPress={() => onJump(first.section)} className="mt-1">
          <Typography variant="caption" className="text-gold">
            Jump to {first.label}
          </Typography>
        </Pressable>
      ) : null}
    </View>
  );
}
