import {
  BEHIND_THIS_DOG_FRAMING,
  summarizeBehindThisDog,
  type BloodlineAncestorInput,
} from '@/lib/pedigree/behindThisDog';
import { Typography } from '@/components/ui/Typography';
import { View } from 'react-native';

export function BehindThisDog({
  ancestors,
}: {
  ancestors: BloodlineAncestorInput[];
}) {
  const block = summarizeBehindThisDog(ancestors);
  if (!block) return null;

  return (
    <View className="mt-4 border-t border-gold/20 pt-4">
      <Typography variant="title" className="text-gold">
        Behind this dog
      </Typography>
      <Typography variant="caption" className="mt-2 leading-5 text-muted">
        {BEHIND_THIS_DOG_FRAMING}
      </Typography>
      <Typography variant="body" className="mt-3">
        {block.summaryLine}
      </Typography>
      {block.standouts.length > 0 ? (
        <View className="mt-4 gap-3">
          {block.standouts.map((s) => (
            <View
              key={`${s.position}-${s.registeredName}`}
              className="rounded-xl border border-gold/20 bg-surface p-4"
            >
              <Typography variant="caption" className="uppercase tracking-widest text-gold">
                {s.positionLabel}
              </Typography>
              <Typography variant="subtitle" className="mt-1">
                {s.registeredName}
              </Typography>
              <Typography variant="caption" className="mt-1 leading-5 text-muted">
                {s.credentials}
              </Typography>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
