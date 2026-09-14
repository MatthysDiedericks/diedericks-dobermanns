import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';

interface DetailRowProps {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
  /** Profile pages keep empty fields visible as a dash. */
  showDash?: boolean;
}

export function DetailRow({ label, value, mono, showDash = false }: DetailRowProps) {
  const empty = value === null || value === undefined || value === '';
  if (empty && !showDash) return null;
  return (
    <View className="flex-row justify-between border-b border-gold/10 py-2">
      <Typography variant="caption" className="text-muted">
        {label}
      </Typography>
      <Typography
        variant="body"
        className={`max-w-[58%] text-right ${mono ? 'font-mono text-sm' : ''}`}
      >
        {empty ? '—' : String(value)}
      </Typography>
    </View>
  );
}
