import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import type { BreedHeatDefaults } from '@/lib/heats/constants';
import { daysSince } from '@/lib/heats/calculations';

interface PhaseTimelineProps {
  heatStart: string;
  defaults: Pick<BreedHeatDefaults, 'proestrus_days' | 'estrus_days' | 'diestrus_days' | 'anestrus_days'>;
}

const PHASES = [
  { key: 'proestrus', label: 'Proestrus', dayKey: 'proestrus_days' as const },
  { key: 'estrus', label: 'Estrus', dayKey: 'estrus_days' as const },
  { key: 'diestrus', label: 'Diestrus', dayKey: 'diestrus_days' as const },
  { key: 'anestrus', label: 'Anestrus', dayKey: 'anestrus_days' as const },
];

export function PhaseTimeline({ heatStart, defaults }: PhaseTimelineProps) {
  const day = daysSince(heatStart) ?? 0;
  let offset = 0;
  let currentIdx = 0;
  const segments = PHASES.map((p, i) => {
    const len = defaults[p.dayKey] ?? 0;
    const start = offset;
    offset += len;
    if (day >= start && day < offset) currentIdx = i;
    return { ...p, len, start };
  });
  if (day >= offset) currentIdx = segments.length - 1;

  return (
    <View className="my-4">
      <View className="flex-row overflow-hidden rounded-lg border border-gold/20">
        {segments.map((seg, i) => (
          <View
            key={seg.key}
            className={`flex-1 px-1 py-2 ${i === currentIdx ? 'bg-gold/20' : 'bg-surface'}`}
          >
            <Typography variant="caption" className={`text-center text-[10px] ${i === currentIdx ? 'text-gold' : 'text-muted'}`}>
              {seg.label}
            </Typography>
            <Typography variant="caption" className="text-center text-[9px] text-muted">
              {seg.len}d
            </Typography>
          </View>
        ))}
      </View>
      <Typography variant="caption" className="mt-2 text-center text-muted">
        Day {Math.max(0, day + 1)} of cycle
      </Typography>
    </View>
  );
}
