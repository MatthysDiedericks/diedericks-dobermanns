import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { DocumentList } from '@/components/documents/DocumentList';
import { LitterBulkTierAction } from '@/components/litters/LitterBulkTierAction';
import { LitterCalendarTab } from '@/components/litters/LitterCalendarTab';
import { LitterContractsTab } from '@/components/litters/LitterContractsTab';
import { LitterFinancialsTab } from '@/components/litters/LitterFinancialsTab';
import { LitterHealthTab } from '@/components/litters/LitterHealthTab';
import { LitterNotesTab } from '@/components/litters/LitterNotesTab';
import { LitterPhotosTab } from '@/components/litters/LitterPhotosTab';
import { LitterPuppiesTab } from '@/components/litters/LitterPuppiesTab';
import { LitterQuoteHolders } from '@/components/litters/LitterQuoteHolders';
import { fetchLitterQuoteHolders, type LitterQuoteHolder } from '@/lib/finance/litterQuoteHolders';
import { LitterReportsTab } from '@/components/litters/LitterReportsTab';
import { LitterSharingTab } from '@/components/litters/LitterSharingTab';
import { LitterTodosTab } from '@/components/litters/LitterTodosTab';
import { LitterWeightsTab } from '@/components/litters/LitterWeightsTab';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { formatKennelDate } from '@/lib/kennel/formatters';
import { resolveLitterTab } from '@/lib/litters/tabFromParams';
import { useLitterWeights } from '@/hooks/useLitterWeights';
import { useLitterDetail } from '@/hooks/useDogs';

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
  const { litter, puppies, loading, error } = useLitterDetail(litterId);
  const { puppies: weightPuppies } = useLitterWeights(litterId, litter?.actual_date);
  const tab = resolveLitterTab(TABS, tabParam, 'puppies');
  const [holders, setHolders] = useState<LitterQuoteHolder[]>([]);
  const puppyIds = puppies.map((p) => p.id);

  function selectTab(next: TabId) {
    router.setParams({ tab: next });
  }

  useEffect(() => {
    if (!litterId) return;
    void fetchLitterQuoteHolders(litterId).then(setHolders).catch(() => setHolders([]));
  }, [litterId]);

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
        {tab === 'puppies' ? (
          <>
            <LitterBulkTierAction
              litterId={litterId}
              currentTier={(detail as { default_programme_tier?: string | null }).default_programme_tier}
            />
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
            <LitterPuppiesTab litterId={litterId} puppies={puppies} />
          </>
        ) : null}
        {tab === 'calendar' ? (
          <LitterCalendarTab litterId={litterId} puppyIds={puppyIds} />
        ) : null}
        {tab === 'weights' ? (
          <LitterWeightsTab
            litterId={litterId}
            whelpDate={detail.actual_date}
            puppyCount={detail.puppy_count}
          />
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
