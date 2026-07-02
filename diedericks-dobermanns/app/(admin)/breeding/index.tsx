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
import type { BreedingDog, PairingRecord } from '@/types/breeding';

const GENERATIONS = [1, 2, 3];

function dcSonStatusLabel(dcSon: BreedingDog | undefined): string {
  if (!dcSon) return 'Prospect — Dharkha × Cleo litter not yet born';
  if (dcSon.status === 'prospect') return 'Prospect — not yet born';
  if (dcSon.status === 'keep' || dcSon.status === 'active') return 'Born — health tests in progress';
  return 'Ready';
}

function PairingSection({
  title,
  titleColor,
  pairings,
  onAction,
}: {
  title: string;
  titleColor: string;
  pairings: PairingRecord[];
  onAction: (p: PairingRecord) => void;
}) {
  if (pairings.length === 0) return null;
  return (
    <>
      <Typography variant="label" className="mb-2 mt-2" style={{ color: titleColor }}>
        {title}
      </Typography>
      {pairings.map((p) => (
        <PairingCard
          key={p.id}
          pairing={p}
          actionLabel={
            p.status === 'Completed' ? 'View' : p.status === 'Active' ? 'Record Litter' : 'Plan Mating'
          }
          onAction={() => onAction(p)}
        />
      ))}
    </>
  );
}

export default function BreedingProgrammeScreen() {
  const router = useRouter();
  const [generation, setGeneration] = useState(1);
  const { pairings, breedingDogs, urgentDams, programmeHealth, loading, error, refresh } =
    useBreedingProgramme(generation);

  const activePairings = useMemo(
    () => pairings.filter((p) => p.status !== 'Prohibited' && p.status !== 'Trial'),
    [pairings],
  );
  const bridgePairings = useMemo(
    () => activePairings.filter((p) => p.line === 'Bridge'),
    [activePairings],
  );
  const programmePairings = useMemo(
    () => activePairings.filter((p) => p.line === 'A' || p.line === 'B'),
    [activePairings],
  );
  const salePairings = useMemo(
    () => activePairings.filter((p) => p.line === 'Sale'),
    [activePairings],
  );
  const otherPairings = useMemo(
    () =>
      activePairings.filter(
        (p) => p.line !== 'Bridge' && p.line !== 'A' && p.line !== 'B' && p.line !== 'Sale',
      ),
    [activePairings],
  );
  const prohibitedPairings = useMemo(
    () => pairings.filter((p) => p.status === 'Prohibited'),
    [pairings],
  );

  const dcSon = breedingDogs.find(
    (d) => d.name.toLowerCase().includes('dc son') || d.name.toLowerCase().includes('d/c son'),
  );

  function handlePairingAction(p: PairingRecord) {
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
  }

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

        <View
          className="mx-6 mb-4 rounded-xl border-2 p-4"
          style={{ borderColor: '#006666', backgroundColor: '#001a1a' }}
        >
          <View className="mb-2 flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: '#00cccc' }} />
            <Typography variant="label" style={{ color: '#00cccc' }}>
              BRIDGE SIRE — D/C Son (Dharkha × Cleopatra)
            </Typography>
          </View>
          <Typography variant="caption" className="mb-2" style={{ color: '#66dddd' }}>
            Status: {dcSonStatusLabel(dcSon)}
          </Typography>
          <Typography variant="caption" style={{ color: '#aaffff' }}>
            ✓ CAN breed: Hailey daughters · Cendra daughters · Hunter/Odessa daughters · Hunter/Kim
            daughters · Cyrus pup
          </Typography>
          <Typography variant="caption" className="mt-1" style={{ color: '#ff9999' }}>
            ✗ CANNOT breed: Claire · Kim · Hunter/Cleo daughters
          </Typography>
          <Typography variant="caption" className="mt-2" style={{ color: '#888888' }}>
            Why: D/C Son&apos;s sire is Dharkha (not Hunter) → 0% COI with all Hunter daughters
          </Typography>
        </View>

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
              <>
                <PairingSection
                  title="── BRIDGE PAIRING ──"
                  titleColor="#00cccc"
                  pairings={bridgePairings}
                  onAction={handlePairingAction}
                />
                <PairingSection
                  title="── PROGRAMME PAIRINGS — HUNTER ──"
                  titleColor="#C4A35A"
                  pairings={programmePairings}
                  onAction={handlePairingAction}
                />
                <PairingSection
                  title="── SALE PAIRINGS — SANTINI ──"
                  titleColor="#9B7FD4"
                  pairings={salePairings}
                  onAction={handlePairingAction}
                />
                <PairingSection
                  title="── OTHER ──"
                  titleColor="#9E9880"
                  pairings={otherPairings}
                  onAction={handlePairingAction}
                />
              </>
            )}

            {generation >= 2 ? (
              <>
                <Typography variant="label" className="mb-3 mt-2 text-gold">
                  GEN 2 SUGGESTED PAIRINGS
                </Typography>
                {GEN2_SUGGESTED_PAIRINGS.map((s) => (
                  <View key={s.key} className="mb-3 rounded-xl border border-gold/20 p-3">
                    <Typography variant="body">{s.label}</Typography>
                    <Typography variant="caption" className="text-gold">
                      Line {s.line} · COI {s.coi}
                    </Typography>
                    <Typography variant="caption" className="text-subtle">
                      {s.notes}
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
