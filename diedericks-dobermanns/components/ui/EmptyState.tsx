import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';

interface EmptyStateProps {
  title: string;
  message?: string;
  className?: string;
}

export function EmptyState({ title, message, className }: EmptyStateProps) {
  return (
    <View
      className={`items-center justify-center rounded-2xl border border-gold/10 bg-black-rich px-6 py-12 ${className ?? ''}`}
    >
      <Typography variant="subtitle" className="text-center">
        {title}
      </Typography>
      {message ? (
        <Typography variant="bodyMuted" className="mt-2 text-center">
          {message}
        </Typography>
      ) : null}
    </View>
  );
}
