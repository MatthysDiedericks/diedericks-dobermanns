import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { DocumentList } from '@/components/documents/DocumentList';
import { LitterCalendarTab } from '@/components/litters/LitterCalendarTab';
import { LitterContractsTab } from '@/components/litters/LitterContractsTab';
import { LitterFinancialsTab } from '@/components/litters/LitterFinancialsTab';
import { LitterGuideLead } from '@/components/litters/LitterGuideLead';
import { LitterHealthTab } from '@/components/litters/LitterHealthTab';
import { LitterNotesTab } from '@/components/litters/LitterNotesTab';
import { LitterPhotosTab } from '@/components/litters/LitterPhotosTab';
import { LitterPuppiesTab } from '@/components/litters/LitterPuppiesTab';
import { LitterQueuePanels, type AppLitterQueueRow } from '@/components/litters/LitterQueuePanels';
import { LitterRoundsGrid } from '@/components/litters/LitterRoundsGrid';
import { PuppyGrowthChart } from '@/components/litters/PuppyGrowthChart';
import { LitterQuoteHolders } from '@/components/litters/LitterQuoteHolders';
import { fetchLitterQuoteHolders, type LitterQuoteHolder } from '@/lib/finance/litterQuoteHolders';
import { LitterReportsTab } from '@/components/litters/LitterReportsTab';
import { LitterSharingTab } from '@/components/litters/LitterSharingTab';
import { LitterTodosTab } from '@/components/litters/LitterTodosTab';
import { LitterWeightsTab } from '@/components/litters/LitterWeightsTab';
import { WeighInBoard } from '@/components/litters/WeighInBoard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { formatKennelDate } from '@/lib/kennel/formatters';
import { showError } from '@/lib/dogDetail/feedback';
import type { PuppyWeightLog } from '@/hooks/useLitterWeights';
import { resolveLitterTab } from '@/lib/litters/tabFromParams';
import { litterGuidePhase } from '@/lib/litters/guide';
import { useLitterWeights } from '@/hooks/useLitterWeights';
import { useLitterDetail } from '@/hooks/useDogs';
import { useGrowthBenchmark } from '@/hooks/useGrowthBenchmark';
import { supabase } from '@/lib/supabase';
import { buildForwardStagePatch } from '@/lib/waitlist/pipeline';
import { useAuthStore } from '@/stores/authStore';
import {
  WEIGHING_SCHEDULES,
  weighingDue,
  weightsLeadTheLitter,
  type WeighingSchedule,
} from '@/lib/litters/weightRounds';

const TABS = [
  'puppies',
  'calendar',
  'weights',
  'notes',
  'health',
  'photos',
  'reports',
  'contracts',
  'sharing',
  'documents',
  'todos',
  'financials',
] as const;

type TabId = (typeof TABS)[number];

function latestWeighIn(weightsByPuppyId: Map<string, PuppyWeightLog[]>): Date | null {
  let latest: Date | null = null;
  weightsByPuppyId.forEach((logs) =>
    logs.forEach((log) => {
      const at = log.recorded_at ? new Date(log.recorded_at) : new Date(`${log.recorded_date}T12:00:00`);
      if (!latest || at > latest) latest = at;
    }),
  );
  return latest;
}

const TAB_LABELS: Record<TabId, string> = {
  puppies: 'Puppies',
  calendar: 'Calendar',
  weights: 'Weights',
  notes: 'Notes',
  health: 'Health',
  photos: 'Photos',
  reports: 'Reports',
  contracts: 'Contracts',
  sharing: 'Sharing',
  documents: 'Documents',
  todos: 'To-dos',
  financials: 'Financials',
};

export default function LitterDetailScreen() {
  const { id, tab: tabParam } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();
  const litterId = id ?? '';
  const { litter, puppies, loading, error, refresh } = useLitterDetail(litterId);
  const {
    puppies: weightPuppies,
    weightsByPuppyId,
    uniqueDates,
    logWeightsBatch,
  } = useLitterWeights(litterId, litter?.actual_date);
  const profileId = useAuthStore((s) => s.profile?.id ?? null);
  const [schedule, setSchedule] = useState<WeighingSchedule>('am_pm');
  const [queueRows, setQueueRows] = useState<AppLitterQueueRow[]>([]);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queueTick, setQueueTick] = useState(0);
  const weightsLead = weightsLeadTheLitter(litter?.actual_date);
  const { benchmarkCurve, loading: benchmarkLoading, error: benchmarkError } = useGrowthBenchmark(
    weightPuppies.length,
  );
  const phase = litterGuidePhase({
    status: litter?.status,
    puppyCount: puppies.length,
  });
  const tab = resolveLitterTab(
    TABS,
    tabParam,
    phase === 'rearing' ? 'weights' : 'puppies',
  );
  const [holders, setHolders] = useState<LitterQuoteHolder[]>([]);
  const puppyIds = puppies.map((p) => p.id);

  function selectTab(next: TabId) {
    router.setParams({ tab: next });
  }

  useEffect(() => {
    if (!litterId) return;
    void fetchLitterQuoteHolders(litterId).then(setHolders).catch(() => setHolders([]));
  }, [litterId]);

  useEffect(() => {
    const raw = (litter as { weighing_schedule?: string } | null)?.weighing_schedule;
    if (
      raw === 'am_pm' ||
      raw === 'every_1h' ||
      raw === 'every_2h' ||
      raw === 'every_4h' ||
      raw === 'every_6h' ||
      raw === 'every_12h' ||
      raw === 'daily'
    ) {
      setSchedule(raw);
    }
  }, [litter]);

  useEffect(() => {
    if (!litterId || !supabase) return;
    void supabase
      .from('waiting_list')
      .select(
        'id, enquirer_name, pipeline_stage, payment_status, preferred_sex, preferred_colour, ear_preference, tail_preference, assigned_dog_id, assigned_litter_id, queue_anchor_at, date_added, client:users!waiting_list_client_id_fkey(full_name)',
      )
      .or(`assigned_litter_id.eq.${litterId},assigned_litter_id.is.null`)
      .then(({ data, error: qErr }) => {
        if (qErr) {
          setQueueError(qErr.message);
          setQueueRows([]);
          return;
        }
        setQueueError(null);
        setQueueRows(
          (data ?? []).map((row) => {
            const client = row.client as { full_name?: string | null } | { full_name?: string | null }[] | null;
            const fullName = Array.isArray(client) ? client[0]?.full_name : client?.full_name;
            return {
              id: row.id,
              name: row.enquirer_name?.trim() || fullName?.trim() || 'Unnamed',
              pipeline_stage: row.pipeline_stage,
              payment_status: row.payment_status,
              preferred_sex: row.preferred_sex,
              preferred_colour: row.preferred_colour,
              ear_preference: row.ear_preference,
              tail_preference: row.tail_preference,
              assigned_dog_id: row.assigned_dog_id,
              assigned_litter_id: row.assigned_litter_id,
              queue_anchor_at: row.queue_anchor_at,
              date_added: row.date_added,
            };
          }),
        );
      });
  }, [litterId, queueTick]);

  const detail = litter as typeof litter & {
    litter_letter?: string | null;
    whelping_notes?: string | null;
    notes?: string | null;
    updated_at?: string;
    puppy_count?: number | null;
  };

  if (loading) {
    return (
      <ScreenContainer>
        <PageHeader title="Litter" />
        <Typography variant="body" className="px-6">Loading…</Typography>
      </ScreenContainer>
    );
  }

  if (error || !detail) {
    return (
      <ScreenContainer>
        <PageHeader title="Litter" />
        <Typography variant="body" className="px-6 text-danger">{error ?? 'Litter not found'}</Typography>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <PageHeader
        eyebrow="Litter"
        title={detail.litter_letter ? `Litter ${detail.litter_letter}` : detail.name ?? 'Detail'}
      />
      {detail.go_home_date || detail.go_home_weeks != null ? (
        <Typography variant="caption" className="mb-3 px-6 text-gold">
          {[
            detail.go_home_date ? formatKennelDate(detail.go_home_date) : null,
            detail.go_home_weeks != null
              ? `go home at ${detail.go_home_weeks} weeks`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Typography>
      ) : null}
      <View className="px-6">
        <LitterGuideLead
          litterId={litterId}
          status={detail.status}
          puppyCount={puppies.length}
          expectedDate={detail.expected_date}
          litterLetter={detail.litter_letter ?? null}
          actualDate={detail.actual_date}
          weighedToday={[...weightsByPuppyId.values()].some((logs) =>
            logs.some(
              (l) =>
                l.recorded_date === new Date().toISOString().slice(0, 10) &&
                l.notes !== 'Birth weight',
            ),
          )}
        />
        {weightsLead ? (
          <View className="mb-4">
            <View className="mb-3 flex-row flex-wrap gap-2">
              {WEIGHING_SCHEDULES.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => {
                    const next = option.id;
                    setSchedule(next);
                    if (!supabase) return;
                    void supabase
                      .from('litters')
                      .update({ weighing_schedule: next })
                      .eq('id', litterId)
                      .then(({ error: schedErr }) => {
                        if (schedErr) showError(schedErr.message);
                      });
                  }}
                  className={`rounded-full border px-3 py-2 ${
                    schedule === option.id ? 'border-gold bg-gold/15' : 'border-gold/25'
                  }`}
                >
                  <Typography variant="caption">{option.label}</Typography>
                </Pressable>
              ))}
            </View>
            <Typography variant="caption" className="mb-3 text-subtle">
              {weighingDue({
                schedule,
                lastWeighedAt: latestWeighIn(weightsByPuppyId),
              }).label}
              {schedule !== 'am_pm' ? ' · AM / PM returns to morning and evening' : ''}
            </Typography>
            <PuppyGrowthChart
              puppies={weightPuppies}
              weightsByPuppyId={weightsByPuppyId}
              uniqueDates={uniqueDates}
              whelpDate={detail.actual_date}
              benchmarkCurve={!benchmarkLoading && !benchmarkError ? benchmarkCurve : undefined}
            />
            <LitterRoundsGrid
              puppies={weightPuppies}
              weightsByPuppyId={weightsByPuppyId}
              actualDate={detail.actual_date}
            />
            <WeighInBoard
              puppies={weightPuppies}
              weightsByPuppyId={weightsByPuppyId}
              onBatchSave={logWeightsBatch}
              schedule={schedule}
            />
          </View>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-4 max-h-12 px-4"
        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
      >
        {TABS.map((t) => (
          <Pressable
            key={t}
            onPress={() => selectTab(t)}
            className={`rounded-full border px-4 py-2 ${tab === t ? 'border-gold bg-gold/15' : 'border-gold/25'}`}
          >
            <Typography variant="caption">{TAB_LABELS[t].toUpperCase()}</Typography>
          </Pressable>
        ))}
        <Button label="Edit" size="sm" variant="secondary" onPress={() => router.push(`/(admin)/litters/${id}/edit`)} />
      </ScrollView>

      <ScrollView className="px-6 pb-12">
        {queueError ? (
          <Typography variant="caption" className="mb-2 text-red-300">{queueError}</Typography>
        ) : null}
        <LitterQueuePanels
          allocated={queueRows.filter((row) => row.assigned_litter_id === litterId)}
          general={queueRows.filter((row) => !row.assigned_litter_id)}
          puppies={puppies.map((p) => ({ id: p.id, name: p.name }))}
          now={new Date()}
          onAllocate={async (waitlistId, dogId) => {
            if (!supabase) return 'Not signed in.';
            const entry = queueRows.find((row) => row.id === waitlistId);
            const forward = buildForwardStagePatch(entry?.pipeline_stage, 'matched', profileId, {
              assigned_dog_id: dogId,
              assigned_litter_id: litterId,
            });
            const patch = forward ?? {
              assigned_dog_id: dogId,
              assigned_litter_id: litterId,
            };
            const { error: assignError } = await supabase
              .from('waiting_list')
              .update(patch)
              .eq('id', waitlistId);
            if (assignError) return assignError.message;
            setQueueTick((n) => n + 1);
            return null;
          }}
        />
        {tab === 'puppies' ? (
          <>
            <LitterQuoteHolders
              holders={holders}
              puppies={puppies.map((p) => ({
                id: p.id,
                name: p.name,
                status: p.status,
                collar_colour: (p as { collar_colour?: string | null }).collar_colour ?? null,
              }))}
              onAllocated={() => {
                void fetchLitterQuoteHolders(litterId).then(setHolders).catch(() => setHolders([]));
              }}
            />
            <LitterPuppiesTab litterId={litterId} puppies={puppies} onChanged={refresh} />
          </>
        ) : null}
        {tab === 'calendar' ? (
          <LitterCalendarTab litterId={litterId} puppyIds={puppyIds} />
        ) : null}
        {tab === 'weights' ? (
          weightsLead ? (
            <Typography variant="body" className="text-subtle">
              For the first 21 days the weight chart is at the top of this page.
            </Typography>
          ) : (
            <LitterWeightsTab
              litterId={litterId}
              whelpDate={detail.actual_date}
              puppyCount={detail.puppy_count}
            />
          )
        ) : null}
        {tab === 'notes' ? (
          <LitterNotesTab
            litterId={litterId}
            whelpingNotes={detail.whelping_notes}
            generalNotes={detail.notes}
            updatedAt={detail.updated_at}
          />
        ) : null}
        {tab === 'health' ? <LitterHealthTab litterId={litterId} puppies={weightPuppies} /> : null}
        {tab === 'photos' ? <LitterPhotosTab litterId={litterId} puppies={weightPuppies} /> : null}
        {tab === 'reports' ? <LitterReportsTab litterId={litterId} puppies={weightPuppies} /> : null}
        {tab === 'contracts' ? (
          <LitterContractsTab litterId={litterId} puppies={puppies} />
        ) : null}
        {tab === 'sharing' ? <LitterSharingTab litterId={litterId} puppies={weightPuppies} /> : null}
        {tab === 'documents' ? <DocumentList entityType="litter" entityId={litterId} /> : null}
        {tab === 'todos' ? <LitterTodosTab litterId={litterId} /> : null}
        {tab === 'financials' ? (
          <LitterFinancialsTab
            litterId={litterId}
            litterName={detail.litter_letter ? `Litter ${detail.litter_letter}` : detail.name ?? 'This litter'}
          />
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}
