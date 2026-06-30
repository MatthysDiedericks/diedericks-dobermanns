import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import type { TemperamentDimensionKey } from '@/lib/dogs/temperamentDimensions';
import { TEMPERAMENT_DIMENSIONS } from '@/lib/dogs/temperamentDimensions';

export function TemperamentDimensionRow({
  dimensionKey,
  score,
  standard,
  compact,
}: {
  dimensionKey: TemperamentDimensionKey;
  score: number | null;
  standard: 'fci_ztp' | 'akc_dpca';
  compact?: boolean;
}) {
  const dim = TEMPERAMENT_DIMENSIONS[dimensionKey];
  const pct = score != null ? (score / 10) * 100 : 0;

  return (
    <View className={`${compact ? 'mb-2' : 'mb-4'}`}>
      <View className="mb-1 flex-row items-center justify-between">
        <Typography variant="caption" className="text-gold">
          {dim.label.toUpperCase()}
        </Typography>
        {standard === 'fci_ztp' ? (
          <Typography variant="caption" className="text-subtle">
            {dim.labelDE}
          </Typography>
        ) : null}
      </View>
      <View className="mb-1 h-2 overflow-hidden rounded-full bg-surface">
        <View className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
      </View>
      <Typography variant="caption" className="text-subtle">
        {score ?? '—'} / 10
      </Typography>
      {!compact ? (
        <Typography variant="caption" className="mt-1 text-subtle">
          {dim.description}
        </Typography>
      ) : null}
    </View>
  );
}

export function ScorePicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <View className="mb-3 flex-row flex-wrap gap-1">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n)}
          className={`h-8 w-8 items-center justify-center rounded-lg border ${value === n ? 'border-gold bg-gold/20' : 'border-gold/20'}`}
        >
          <Typography variant="caption" className={value === n ? 'text-gold' : 'text-ink-muted'}>
            {n}
          </Typography>
        </Pressable>
      ))}
    </View>
  );
}
