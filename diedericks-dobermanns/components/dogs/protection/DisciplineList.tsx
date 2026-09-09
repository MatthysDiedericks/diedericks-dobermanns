import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { disciplineLabel } from '@/lib/protection/constants';

export function DisciplineList({
  disciplines,
  counts,
  selected,
  onSelect,
}: {
  disciplines: string[];
  counts: Record<string, number>;
  selected: string;
  onSelect: (discipline: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {disciplines.map((d) => (
        <Pressable
          key={d}
          onPress={() => onSelect(d)}
          className={`rounded-full border px-3 py-1.5 ${
            selected === d ? 'border-gold bg-gold/15' : 'border-gold/25'
          }`}
        >
          <Typography variant="caption">
            {disciplineLabel(d)} ({counts[d] ?? 0})
          </Typography>
        </Pressable>
      ))}
    </View>
  );
}
