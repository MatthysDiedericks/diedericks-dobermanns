import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import type { Milestone } from '@/lib/litters/milestones';

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

/** Age-based puppy milestone chips (eyes open, weaning, vaccination, go-home). */
export function MilestonesStrip({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) return null;

  return (
    <View className="flex-row flex-wrap gap-2">
      {milestones.map((m) => (
        <View
          key={m.key}
          className={`rounded-full border px-3 py-1.5 ${
            m.reached ? 'border-gold/40 bg-gold/10' : 'border-gold/10 bg-black-rich'
          }`}
        >
          <Typography variant="caption" className={m.reached ? 'text-gold' : 'text-subtle'}>
            {m.label} · {m.date ? formatShortDate(m.date) : 'TBC'}
          </Typography>
        </View>
      ))}
    </View>
  );
}
