import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';

interface EmptyTabStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyTabState({ message, actionLabel, onAction }: EmptyTabStateProps) {
  return (
    <View className="items-center py-12">
      <Typography variant="bodyMuted" className="text-center">
        {message}
      </Typography>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} className="mt-4" variant="outline" />
      ) : null}
    </View>
  );
}
