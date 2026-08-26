import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';

import { DetailRow } from '@/components/dogs/detail/DetailRow';
import { DogMeasurementsPanel } from '@/components/dogs/detail/DogMeasurementsPanel';
import { DogHealthWeightSection } from '@/components/dogs/detail/DogHealthWeightSection';
import { HeatStatusCard } from '@/components/dogs/detail/HeatStatusCard';
import { SectionCard } from '@/components/dogs/detail/SectionCard';
import { DogProfileHeaderBlock } from '@/components/dogs/profile/DogProfileHeaderBlock';
import { DogStatCardsBlock } from '@/components/dogs/profile/DogStatCardsBlock';
import { HealthCalendarSection } from '@/components/dogs/profile/HealthCalendarSection';
import { DogOwnerSection } from '@/components/followUps/DogOwnerSection';
import { AdminWorkStrip } from '@/components/dogs/profile/AdminWorkStrip';
import { ShareDogSection } from '@/components/dogs/profile/ShareDogSection';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useDogHealthCalendar } from '@/hooks/useDogHealthCalendar';
import { useWeightLogs } from '@/hooks/useDogDetail';
import { useGrowthBenchmark } from '@/hooks/useGrowthBenchmark';
import { createDraftContract } from '@/lib/contracts/createDraft';
import { contractStatusLabel } from '@/lib/dogs/contractStatus';
import { formatCoiPercent } from '@/lib/dogs/formatCoi';
import { titleCase } from '@/lib/format';
import { formatWeight } from '@/lib/kennel/formatters';
import { getAgeDays } from '@/lib/litters/weighingSchedule';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Dog } from '@/types/app.types';

export function DogOverviewTab({
  dog,
  onRefresh,
  canEdit,
}: {
  dog: Dog;
  onRefresh: () => void;
  canEdit: boolean;
}) {
  const router = useRouter();
  const actorId = useAuthStore((s) => s.session?.user.id);
  const [creating, setCreating] = useState(false);
  const photo = dog.media?.find((m) => m.is_primary)?.url ?? dog.media?.[0]?.url ?? null;
  const health = useDogHealthCalendar(dog.id);
  const weights = useWeightLogs(dog.id);
  const latestKg = weights.logs[0] ? Number(weights.logs[0].weight_kg) : null;
  const [goHomeDate, setGoHomeDate] = useState<string | null>(
    (dog as { handover_date?: string | null }).handover_date ?? null,
  );
  const [puppyCount, setPuppyCount] = useState(0);
  const [contract, setContract] = useState<{
    id: string | null;
    signed: boolean;
    exists: boolean;
    status: string | null;
  }>({ id: null, signed: false, exists: false, status: null });
  const [outstanding, setOutstanding] = useState(0);
  const bench = useGrowthBenchmark(puppyCount);

  useEffect(() => {
    if (!dog.litter_id) return;
    void requireSupabase()
      .from('litters')
      .select('go_home_date, puppy_count')
      .eq('id', dog.litter_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!goHomeDate && data?.go_home_date) setGoHomeDate(data.go_home_date);
        if (data?.puppy_count) setPuppyCount(data.puppy_count);
      });
  }, [dog.litter_id, goHomeDate]);

  useEffect(() => {
    void requireSupabase()
      .from('contracts')
      .select('id, signed_by_client, parent_contract_id, status')
      .eq('dog_id', dog.id)
      .then(({ data }) => {
        const rows = (data ?? []).filter((c) => !c.parent_contract_id);
        setContract({
          id: rows[0]?.id ?? null,
          exists: rows.length > 0,
          signed: rows.some((c) => c.signed_by_client),
          status: rows[0]?.status ?? null,
        });
      });
    void requireSupabase()
      .from('invoices')
      .select('amount_outstanding, status')
      .eq('dog_id', dog.id)
      .gt('amount_outstanding', 0)
      .then(({ data }) => {
        const sum = (data ?? [])
          .filter((i) => !['void', 'cancelled', 'draft'].includes(i.status))
          .reduce((s, i) => s + Number(i.amount_outstanding ?? 0), 0);
        setOutstanding(sum);
      });
  }, [dog.id]);

  const ageDays = dog.date_of_birth ? getAgeDays(dog.date_of_birth) : 0;
  const benchmarkLabel = useMemo(() => {
    if (latestKg == null || bench.benchmarkCurve.length === 0) return null;
    let best = bench.benchmarkCurve[0]!;
    let bestDist = Math.abs(best.ageDays - ageDays);
    for (const p of bench.benchmarkCurve) {
      const dist = Math.abs(p.ageDays - ageDays);
      if (dist < bestDist) {
        best = p;
        bestDist = dist;
      }
    }
    return `Litter average at ${ageDays} days: ${formatWeight(best.avgGrams / 1000)}`;
  }, [latestKg, bench.benchmarkCurve, ageDays]);

  const hasIds = Boolean(
    dog.registered_name || dog.call_name || dog.microchip_number || dog.registration_number,
  );
  const hasPhysical = Boolean(
    dog.coat_type || dog.height_cm || dog.ear_type || dog.eye_colour,
  );
  const hasGenetics = Boolean(
    formatCoiPercent(dog.wrights_coi) ||
      dog.genetics_b_locus ||
      dog.genetics_d_locus ||
      dog.genetics_vwd_status ||
      dog.genetics_dcm1_status ||
      dog.genetics_dcm2_status ||
      dog.genetics_notes,
  );
  const hasNotes = Boolean(dog.temperament_notes || dog.training_notes);
  const contractLabel = contractStatusLabel(
    contract.exists ? { status: contract.status, signedByClient: contract.signed } : null,
  );

  return (
    <View className="pb-8">
      {photo ? (
        <Image
          source={{ uri: photo }}
          style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 16 }}
          contentFit="cover"
        />
      ) : null}

      <DogProfileHeaderBlock dog={dog} goHomeDate={goHomeDate} />
      <DogStatCardsBlock
        latestKg={latestKg}
        benchmarkLabel={benchmarkLabel}
        vaccinationsCount={health.vaccinationsCount}
        calendar={health.calendar}
        microchip={dog.microchip_number}
      />
      <HealthCalendarSection
        calendar={health.calendar}
        vaccinationsCount={health.vaccinationsCount}
        dewormingCount={health.dewormingCount}
      />
      <DogHealthWeightSection dogId={dog.id} dog={dog} />

      <SectionCard title="Paperwork">
        <DetailRow label="Contract" value={contractLabel} />
        {canEdit && !contract.exists ? (
          <Button
            label={creating ? 'Creating…' : 'Create contract'}
            variant="secondary"
            className="mt-3"
            disabled={creating}
            onPress={() => {
              if (!actorId) {
                Alert.alert('Not signed in');
                return;
              }
              setCreating(true);
              void createDraftContract({ dogId: dog.id, actorId })
                .then((res) => {
                  if (res.error) {
                    Alert.alert('Could not create', res.error);
                    return;
                  }
                  if (res.contractId) {
                    router.push(`/(admin)/contracts/${res.contractId}` as never);
                  }
                })
                .finally(() => setCreating(false));
            }}
          />
        ) : null}
        {canEdit && contract.exists ? (
          <Button
            label="Open contract"
            variant="ghost"
            className="mt-3"
            onPress={() =>
              router.push(
                (contract.id
                  ? `/(admin)/contracts/${contract.id}`
                  : '/(admin)/contracts') as never,
              )
            }
          />
        ) : null}
      </SectionCard>

      {canEdit ? <HeatStatusCard dog={dog} onRefresh={onRefresh} /> : null}
      {canEdit ? (
        <DogMeasurementsPanel dog={dog} canEdit={canEdit} onSaved={onRefresh} />
      ) : null}

      {hasIds ? (
        <SectionCard title="Identifiers">
          <DetailRow label="Registered name" value={dog.registered_name} />
          <DetailRow label="Call name" value={dog.call_name} />
          <DetailRow label="Microchip" value={dog.microchip_number} mono />
          <DetailRow label="Registration" value={dog.registration_number} mono />
        </SectionCard>
      ) : null}

      {hasPhysical ? (
        <SectionCard title="Physical">
          <DetailRow label="Coat" value={dog.coat_type} />
          <DetailRow label="Height (cm)" value={dog.height_cm} />
          <DetailRow label="Ear type" value={dog.ear_type ? titleCase(dog.ear_type) : null} />
          <DetailRow label="Eye colour" value={dog.eye_colour} />
        </SectionCard>
      ) : null}

      {dog.is_spayed_neutered ? (
        <SectionCard title="Status">
          <DetailRow label="Spayed / neutered" value="Yes" />
        </SectionCard>
      ) : null}

      {canEdit ? <DogOwnerSection dog={dog} contact={dog.owner_contact} onUpdated={onRefresh} /> : null}

      {canEdit ? <ShareDogSection dog={dog} onDone={onRefresh} /> : null}
      {canEdit ? (
        <AdminWorkStrip
          dog={dog}
          hasSignedContract={contract.signed}
          hasAnyContract={contract.exists}
          outstandingBalance={outstanding}
          vaccinationsIncomplete={health.calendar.upcoming.some(
            (u) => u.kind === 'vaccination' && u.daysUntil < 0,
          )}
        />
      ) : null}

      {hasGenetics && canEdit ? (
        <SectionCard title="Genetics">
          <DetailRow label="Wright's COI" value={formatCoiPercent(dog.wrights_coi)} />
          <DetailRow label="B locus" value={dog.genetics_b_locus} />
          <DetailRow label="D locus" value={dog.genetics_d_locus} />
          <DetailRow label="vWD" value={dog.genetics_vwd_status} />
          <DetailRow label="DCM1" value={dog.genetics_dcm1_status} />
          <DetailRow label="DCM2" value={dog.genetics_dcm2_status} />
          <DetailRow label="Notes" value={dog.genetics_notes} />
        </SectionCard>
      ) : null}

      {hasNotes ? (
        <SectionCard title="Notes">
          <DetailRow label="Temperament" value={dog.temperament_notes} />
          <DetailRow label="Training" value={dog.training_notes} />
        </SectionCard>
      ) : null}

      <Typography variant="caption" className="mb-3 text-subtle">
        Print pedigree is website-only.
      </Typography>

      {canEdit ? (
        <Button
          label="Edit Profile"
          onPress={() => router.push(`/(admin)/dogs/${dog.id}/edit` as never)}
          fullWidth
          className="mb-3"
        />
      ) : null}
    </View>
  );
}
