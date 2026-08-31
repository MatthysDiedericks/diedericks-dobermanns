import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { pedigreeDepthOptions, type PedigreeSurface } from '@/lib/pedigree/generation';

export function GenerationSelector({
  maxGen,
  depth,
  onChange,
  surface,
}: {
  maxGen: number;
  depth: number;
  onChange: (depth: number) => void;
  surface: PedigreeSurface;
}) {
  const options = pedigreeDepthOptions(maxGen, surface);
  if (options.length <= 1) return null;

  return (
    <View className="mb-3 flex-row flex-wrap items-center gap-2">
      <Typography variant="caption" className="text-[#C4A35A]">
        Generations
      </Typography>
      {options.map((n) => {
        const active = n === depth;
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            className={`rounded-full border px-3 py-1.5 ${
              active ? 'border-gold bg-gold' : 'border-gold/40'
            }`}
          >
            <Typography variant="caption" className={active ? 'text-[#111008]' : 'text-gold'}>
              {n}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}
