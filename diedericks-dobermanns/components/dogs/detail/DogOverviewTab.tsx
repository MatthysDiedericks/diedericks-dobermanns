import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';

import { DetailRow } from '@/components/dogs/detail/DetailRow';
import { DogMeasurementsPanel } from '@/components/dogs/detail/DogMeasurementsPanel';
import { DogHealthWeightSection } from '@/components/dogs/detail/DogHealthWeightSection';
import { HeatStatusCard } from '@/components/dogs/detail/HeatStatusCard';
import { SectionCard } from '@/components/dogs/detail/SectionCard';
import { CompletenessBar } from '@/components/dogs/profile/CompletenessBar';
import { DogProfileHeaderBlock } from '@/components/dogs/profile/DogProfileHeaderBlock';
import { DogStatCardsBlock } from '@/components/dogs/profile/DogStatCardsBlock';
import { HealthCalendarSection } from '@/components/dogs/profile/HealthCalendarSection';
import { DogOwnerSection } from '@/components/followUps/DogOwnerSection';
import { AdminWorkStrip } from '@/components/dogs/profile/AdminWorkStrip';
import { HandoverPackActions } from '@/components/dogs/profile/HandoverPackActions';
import { ShareDogSection } from '@/components/dogs/profile/ShareDogSection';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useDogHealthCalendar } from '@/hooks/useDogHealthCalendar';
import { useWeightLogs } from '@/hooks/useDogDetail';
import { useGrowthBenchmark } from '@/hooks/useGrowthBenchmark';
import { createDraftContract } from '@/lib/contracts/createDraft';
import { contractStatusLabel } from '@/lib/dogs/contractStatus';
import { formatCoiPercent } from '@/lib/dogs/formatCoi';
import { liveAgeFromDob } from '@/lib/dogs/liveAge';
import { profileCompleteness } from '@/lib/dogs/completeness';
import { profilePhotoUrl } from '@/lib/dogs/profilePhoto';
import { collarLabel } from '@/lib/litters/collarColours';
import { colourLabel } from '@/lib/colours/dogColours';
import { formatKennelDate, formatWeight } from '@/lib/kennel/formatters';
import { getAgeDays } from '@/lib/litters/weighingSchedule';
import type { LineageStripData } from '@/lib/dogs/lineageStrip';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Dog } from '@/types/app.types';

function grams(value: number | null | undefined): string | null {
  if (value == null) return null;
  return `${value} g`;
}

function cm(value: number | null | undefined): string | null {
  if (value == null) return null;
  return `${value} cm`;
}

function yn(value: boolean | null | undefined): string | null {
  if (value == null) return null;
  return value ? 'Yes' : 'No';
}

function sizeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function DogOverviewTab({
  dog,
  onRefresh,
  canEdit,
  lineage = null,
}: {
  dog: Dog;
  onRefresh: () => void;
  canEdit: boolean;
  lineage?: LineageStripData | null;
}) {
  const router = useRouter();
  const actorId = useAuthStore((s) => s.session?.user.id);
  const canGeneratePack = useAuthStore((s) => s.hasRole('admin', 'super_admin', 'management'));
  const [creating, setCreating] = useState(false);
  const photo = profilePhotoUrl(dog.media);
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

  const completeness = profileCompleteness({
    ...dog,
    litter_letter: lineage?.litter?.letter ?? null,
  });
  const progenyCount = lineage?.progeny.reduce((n, p) => n + p.puppyCount, 0) ?? 0;
  const buyerName =
    dog.owner_contact?.full_name?.trim() ||
    dog.new_owner_name?.trim() ||
    dog.reserved_for_name?.trim() ||
    null;
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
      ) : (
        <Typography variant="body" className="mb-4 text-muted">
          —
        </Typography>
      )}

      <DogProfileHeaderBlock dog={dog} goHomeDate={goHomeDate} buyerName={buyerName} />
      <CompletenessBar result={completeness} />

      <SectionCard title="Identity">
        <DetailRow showDash label="Date of birth" value={dog.date_of_birth ? formatKennelDate(dog.date_of_birth) : null} />
        <DetailRow showDash label="Age" value={liveAgeFromDob(dog.date_of_birth)} />
        <DetailRow showDash label="Sex" value={dog.sex} />
        <DetailRow showDash label="Colour" value={dog.colour ? colourLabel(dog.colour) : null} />
        <DetailRow showDash label="Coat type" value={dog.coat_type} />
        <DetailRow showDash label="Size" value={sizeLabel(dog.size_category)} />
        <DetailRow showDash label="Birth weight" value={grams(dog.birth_weight_grams)} />
        <DetailRow showDash label="Birth order" value={dog.birth_order} />
        <DetailRow
          showDash
          label="Collar"
          value={
            dog.collar_colour && dog.collar_colour !== 'none'
              ? collarLabel(dog.collar_colour)
              : null
          }
        />
      </SectionCard>

      <SectionCard title="Identifiers">
        <DetailRow showDash label="Microchip" value={dog.microchip_number} mono />
        <DetailRow showDash label="Tattoo" value={dog.tattoo_number} />
        <DetailRow showDash label="Passport" value={dog.passport_number} />
        <DetailRow showDash label="DNA" value={dog.dna_number} />
        <DetailRow showDash label="Insurance" value={dog.insurance_number} />
        <DetailRow showDash label="Registration number" value={dog.registration_number} mono />
        <DetailRow showDash label="Registration type" value={dog.registration_type} />
        <DetailRow showDash label="Litter letter" value={lineage?.litter?.letter ?? null} />
      </SectionCard>

      <SectionCard title="Measurements">
        <DetailRow showDash label="Height" value={cm(dog.height_cm)} />
        <DetailRow showDash label="Body length" value={cm(dog.body_length_cm)} />
        <DetailRow showDash label="Chest depth" value={cm(dog.chest_depth_cm)} />
        <DetailRow showDash label="Chest girth" value={cm(dog.chest_girth_cm)} />
      </SectionCard>

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

      <SectionCard title="Health">
        <DetailRow showDash label="Hips" value={dog.hip_score} />
        <DetailRow showDash label="Elbows" value={dog.elbow_score} />
        <DetailRow showDash label="Eyes" value={dog.eye_colour} />
        <DetailRow showDash label="DCM1" value={dog.genetics_dcm1_status} />
        <DetailRow showDash label="DCM2" value={dog.genetics_dcm2_status} />
        <DetailRow showDash label="vWD" value={dog.genetics_vwd_status} />
      </SectionCard>

      <SectionCard title="Breeding">
        <DetailRow showDash label="Wright's COI" value={formatCoiPercent(dog.wrights_coi)} />
        <DetailRow showDash label="ALC 5" value={formatCoiPercent(dog.alc_5)} />
        <DetailRow showDash label="ALC 10" value={formatCoiPercent(dog.alc_10)} />
        <DetailRow showDash label="Spayed / neutered" value={yn(dog.is_spayed_neutered ?? null)} />
        <DetailRow
          showDash
          label="Breeding dog"
          value={['keep', 'stud', 'breeding_stock'].includes(dog.status ?? '') ? 'Yes' : 'No'}
        />
        <DetailRow showDash label="Progeny" value={progenyCount ? `${progenyCount}` : 'none yet'} />
      </SectionCard>

      <SectionCard title="Paperwork">
        <DetailRow showDash label="Contract" value={contractLabel} />
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
        <HandoverPackActions
          dogId={dog.id}
          dogName={dog.name}
          canGenerate={canGeneratePack}
          released={dog.handover_status === 'delivered'}
        />
      </SectionCard>

      {canEdit ? <HeatStatusCard dog={dog} onRefresh={onRefresh} /> : null}
      {canEdit ? (
        <DogMeasurementsPanel dog={dog} canEdit={canEdit} onSaved={onRefresh} />
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

      {canEdit ? (
        <SectionCard title="Genetics">
          <DetailRow showDash label="B locus" value={dog.genetics_b_locus} />
          <DetailRow showDash label="D locus" value={dog.genetics_d_locus} />
          <DetailRow showDash label="Notes" value={dog.genetics_notes} />
        </SectionCard>
      ) : null}

      <SectionCard title="Notes">
        <DetailRow showDash label="Temperament" value={dog.temperament_notes} />
        <DetailRow showDash label="Training" value={dog.training_notes} />
      </SectionCard>

      <Typography variant="caption" className="mb-3 text-subtle">
        Print pedigree is website-only.
      </Typography>

      {canEdit ? (
        <>
          <Button
            label="Training journey"
            onPress={() =>
              router.push({ pathname: '/(admin)/training/journey/[dogId]', params: { dogId: dog.id } })
            }
            fullWidth
            variant="outline"
            className="mb-3"
          />
          <Button
            label="Edit Profile"
            onPress={() => router.push(`/(admin)/dogs/${dog.id}/edit` as never)}
            fullWidth
            className="mb-3"
          />
        </>
      ) : null}
    </View>
  );
}
