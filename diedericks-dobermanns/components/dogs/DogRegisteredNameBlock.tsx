import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';

interface DogRegisteredNameBlockProps {
  registeredName?: string | null;
  wrightsCoi?: number | null;
}

/** Full pedigree registered name + COI under the short call/display name. */
export function DogRegisteredNameBlock({
  registeredName,
  wrightsCoi,
}: DogRegisteredNameBlockProps) {
  const reg = registeredName?.trim();
  if (!reg && wrightsCoi == null) return null;
  return (
    <View className="mt-1">
      {reg ? (
        <Typography variant="bodyMuted" className="text-silver">
          {reg}
        </Typography>
      ) : null}
      {wrightsCoi != null ? (
        <Typography variant="caption" className="mt-0.5 text-muted">
          Wright&apos;s COI {wrightsCoi.toFixed(2)}%
        </Typography>
      ) : null}
    </View>
  );
}
