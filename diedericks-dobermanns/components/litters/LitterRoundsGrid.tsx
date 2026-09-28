import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import type { LitterPuppy, PuppyWeightLog } from '@/hooks/useLitterWeights';
import { CollarDot, collarLabel } from '@/lib/litters/collarColours';
import {
  belowBirthWeightAfter48h,
  hasNotGained,
  roundKey,
  roundLabel,
} from '@/lib/litters/weightRounds';

/**
 * Puppies down the side, weigh-in rounds across. A cell with no row for
 * that round says missed. A flat or falling puppy is named on the row.
 */
export function LitterRoundsGrid({
  puppies,
  weightsByPuppyId,
  actualDate,
}: {
  puppies: LitterPuppy[];
  weightsByPuppyId: Map<string, PuppyWeightLog[]>;
  actualDate?: string | null;
}) {
  const router = useRouter();
  const rounds = useMemo(() => {
    const keys = new Set<string>();
    weightsByPuppyId.forEach((logs) => logs.forEach((log) => keys.add(roundKey(log))));
    return [...keys].sort();
  }, [weightsByPuppyId]);

  if (!puppies.length || !rounds.length) return null;

  return (
    <View className="mb-4">
      <Typography variant="label" className="mb-2">
        Rounds
      </Typography>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View className="flex-row">
            <View className="w-28" />
            {rounds.map((key) => (
              <View key={key} className="w-16 items-center px-1">
                <Typography variant="caption" className="text-center text-subtle">
                  {roundLabel(key)}
                </Typography>
              </View>
            ))}
          </View>
          {puppies.map((pup) => {
            const logs = weightsByPuppyId.get(pup.id) ?? [];
            const byRound = new Map(logs.map((log) => [roundKey(log), log]));
            const latest = logs.length
              ? [...logs].sort((a, b) =>
                  (a.recorded_at ?? a.recorded_date).localeCompare(b.recorded_at ?? b.recorded_date),
                )
              : [];
            const latestKg = latest.length ? latest[latest.length - 1].weight_kg : null;
            const stalled = hasNotGained(logs);
            const underBirth = belowBirthWeightAfter48h({
              birthWeightGrams: pup.birth_weight_grams,
              actualDate,
              birthTime: pup.birth_time,
              latestKg,
            });
            return (
              <View key={pup.id} className="mt-1 flex-row items-center">
                <Pressable
                  onPress={() => router.push(`/(admin)/dogs/${pup.id}` as never)}
                  className="w-28 flex-row items-center pr-2"
                >
                  <CollarDot colour={pup.collar_colour} size={10} />
                  <Typography variant="caption" numberOfLines={2} className="ml-1 flex-1">
                    {pup.name}
                    {pup.collar_colour ? ` ${collarLabel(pup.collar_colour)}` : ''}
                  </Typography>
                </Pressable>
                {rounds.map((key) => {
                  const log = byRound.get(key);
                  return (
                    <View
                      key={key}
                      className={`mx-0.5 h-8 w-16 items-center justify-center rounded ${
                        log ? 'bg-gold/10' : 'bg-amber-500/15'
                      }`}
                    >
                      <Typography variant="caption">
                        {log ? `${Math.round(log.weight_kg * 1000)}` : 'missed'}
                      </Typography>
                    </View>
                  );
                })}
                {stalled || underBirth ? (
                  <Typography variant="caption" className="ml-2 text-amber-200">
                    {stalled ? 'not gained' : ''}
                    {stalled && underBirth ? ' · ' : ''}
                    {underBirth ? 'under birth weight' : ''}
                  </Typography>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
