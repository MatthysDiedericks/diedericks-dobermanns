import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';

export type QuoteSaveState = 'idle' | 'saving' | 'saved' | 'retrying';

const LABELS: Record<QuoteSaveState, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  retrying: 'Not saved — retrying',
};

export function QuoteSaveIndicator({
  state,
  onRetry,
}: {
  state: QuoteSaveState;
  onRetry?: () => void;
}) {
  const label = LABELS[state];
  if (!label) return null;
  return (
    <View className="flex-row items-center gap-2">
      <Typography variant="caption">{label}</Typography>
      {state === 'retrying' && onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button">
          <Typography variant="caption" className="text-gold underline">
            Retry
          </Typography>
        </Pressable>
      ) : null}
    </View>
  );
}
