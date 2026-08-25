import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';

interface DetailRowProps {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}

/** Omit empty values — never render a dash. */
export function DetailRow({ label, value, mono }: DetailRowProps) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View className="flex-row justify-between border-b border-gold/10 py-2">
      <Typography variant="caption" className="text-muted">
        {label}
      </Typography>
      <Typography
        variant="body"
        className={`max-w-[58%] text-right ${mono ? 'font-mono text-sm' : ''}`}
      >
        {String(value)}
      </Typography>
    </View>
  );
}
