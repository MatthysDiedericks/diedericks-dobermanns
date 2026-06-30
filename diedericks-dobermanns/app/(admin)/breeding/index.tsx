import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { BreedingActionCard } from '@/components/breeding/BreedingActionCard';
import { PairingCard } from '@/components/breeding/PairingCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useBreedingProgramme } from '@/hooks/useBreedingProgramme';
import { GEN2_SUGGESTED_PAIRINGS } from '@/lib/breeding/constants';
import { programmeStatusEmoji } from '@/lib/breeding/programme-health';

const GENERATIONS = [1, 2, 3];

export default function BreedingProgrammeScreen() {
  const router = useRouter();
  const [generation, setGeneration] = useState(1);
  const { pairings, urgentDams, programmeHealth, loading, error, refresh } =
    useBreedingProgramme(generation);

  const activePairings = useMemo(
    () => pairings.filter((p) => p.status !== 'Prohibited' && p.status !== 'Trial'),
    [pairings],
  );
  const prohibitedPairings = useMemo(
    () => pairings.filter((p) => p.status === 'Prohibited'),
    [pairings],
  );

  return (
    <ScreenContainer scroll={false}>
      <View className="flex-none">
        <PageHeader eyebrow="Born With Purpose. Built With Discipline." title="Breeding Programme" back={false} />
        <View className="mx-6 mb-2 h-0.5 bg-gold" />

        <View className="mx-6 mb-4 flex-row items-center gap-2">
          <Typography variant="caption">
            {programmeStatusEmoji(programmeHealth.status)} {programmeHealth.label}
          </Typography>
        </View>

        {programmeHealth.alerts.length > 0 ? (
          <View className="mx-6 mb-4 rounded-xl border border-gold/30 bg-gold/10 p-3">
            {programmeHealth.alerts.map((a) => (
              <Typography key={a} variant="caption" className="text-gold">
                • {a}
              </Typography>
            ))}
          </View>
        ) : null}

        {urgentDams.map((d) => (
          <View key={d.id} className="mx-6 mb-3 rounded-xl border border-danger/50 bg-danger/10 p-3">
            <Typography variant="label" className="text-danger">
              ⚠ {d.name.toUpperCase()} — Act on next heat
            </Typography>
          </View>
        ))}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 max-h-12 px-4">
          <View className="flex-row gap-2">
            {GENERATIONS.map((g) => (
              <Pressable
                key={g}
                onPress={() => setGeneration(g)}
                className={`rounded-full border px-4 py-2 ${
                  generation === g ? 'border-gold bg-gold/15' : 'border-gold/25'
                }`}
              >
                <Typography variant="caption">Gen {g}</Typography>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View className="mb-4 px-6">
          <BreedingActionCard
            icon="git-network-outline"
            label="VISUAL PLANNER"
            subtitle="Lines, pairings & COI map"
            onPress={() => router.push('/(admin)/breeding/planner' as never)}
          />
          <View className="flex-row flex-wrap gap-2">
            <Button
              label="Pairing Builder"
              variant="outline"
              size="sm"
              onPress={() => router.push('/(admin)/breeding/pairing-builder' as never)}
            />
            <Button
              label="Trial Mating"
              variant="outline"
              size="sm"
              onPress={() => router.push('/(admin)/breeding/trial-planner' as never)}
            />
            <Button
              label="Record Litter"
              variant="outline"
              size="sm"
              onPress={() => router.push('/(admin)/breeding/litter-recorder' as never)}
            />
            <Button
              label="Organogram"
              variant="outline"
              size="sm"
              onPress={() => router.push('/(admin)/breeding/organogram' as never)}
            />
          </View>
        </View>

        {error ? (
          <Typography variant="body" className="px-6 text-danger">
            {error}
          </Typography>
        ) : null}
      </View>

      <View className="flex-1">
        {loading ? (
          <View className="px-6">
            <CardListSkeleton count={4} />
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-6"
            contentContainerStyle={{ paddingBottom: 48 }}
            showsVerticalScrollIndicator={false}
          >
            <Typography variant="label" className="mb-3 text-gold">
              ACTIVE PAIRINGS
            </Typography>
            {activePairings.length === 0 ? (
              <Typography variant="caption" className="mb-4 text-subtle">
                No pairings for Gen {generation} yet.
              </Typography>
            ) : (
              activePairings.map((p) => (
                <PairingCard
                  key={p.id}
                  pairing={p}
                  actionLabel={
                    p.status === 'Completed'
                      ? 'View'
                      : p.status === 'Active'
                        ? 'Record Litter'
                        : 'Plan Mating'
                  }
                  onAction={() => {
                    if (p.status === 'Completed') {
                      router.push(`/(admin)/dogs/${p.sire_id}` as never);
                    } else if (p.status === 'Active') {
                      router.push({
                        pathname: '/(admin)/breeding/litter-recorder',
                        params: { pairingId: p.id },
                      } as never);
                    } else {
                      router.push('/(admin)/breeding/pairing-builder' as never);
                    }
                  }}
                />
              ))
            )}

            {generation >= 2 ? (
              <>
                <Typography variant="label" className="mb-3 mt-2 text-gold">
                  GEN 2 SUGGESTED PAIRINGS
                </Typography>
                {GEN2_SUGGESTED_PAIRINGS.map((s) => (
                  <View key={s.key} className="mb-3 rounded-xl border border-gold/20 p-3">
                    <Typography variant="body">{s.label}</Typography>
                    <Typography variant="caption" className="text-subtle">
                      Line {s.line} · {s.notes}
                    </Typography>
                  </View>
                ))}
              </>
            ) : null}

            {prohibitedPairings.length > 0 ? (
              <>
                <Typography variant="label" className="mb-3 mt-4 text-danger">
                  PROHIBITED
                </Typography>
                {prohibitedPairings.map((p) => (
                  <PairingCard key={p.id} pairing={p} />
                ))}
              </>
            ) : null}

            <Button label="Refresh" variant="ghost" onPress={() => void refresh()} className="mt-4" />
          </ScrollView>
        )}
      </View>
    </ScreenContainer>
  );
}
