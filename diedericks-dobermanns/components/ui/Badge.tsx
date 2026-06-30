import { Text, View } from 'react-native';

export type BadgeTone = 'gold' | 'neutral' | 'success' | 'danger' | 'muted';

const TONE: Record<BadgeTone, { bg: string; text: string }> = {
  gold: { bg: 'bg-gold/15 border-gold/40', text: 'text-gold' },
  neutral: { bg: 'bg-surface border-silver/30', text: 'text-ink-muted' },
  success: { bg: 'bg-success/15 border-success/40', text: 'text-success' },
  danger: { bg: 'bg-danger/15 border-danger/40', text: 'text-danger' },
  muted: { bg: 'bg-surface border-silver/20', text: 'text-silver' },
};

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ label, tone = 'gold', className }: BadgeProps) {
  const t = TONE[tone];
  return (
    <View
      className={`self-start rounded-full border px-3 py-1 ${t.bg} ${className ?? ''}`}
    >
      <Text className={`font-body-semibold text-[10px] uppercase tracking-widest ${t.text}`}>
        {label}
      </Text>
    </View>
  );
}
