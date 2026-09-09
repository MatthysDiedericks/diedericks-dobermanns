import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, View } from 'react-native';

import { PipelineBoard } from '@/components/waitlist/PipelineBoard';
import { StageSelector } from '@/components/waitlist/StageSelector';
import { WaitlistTable } from '@/components/waitlist/WaitlistTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useFinanceAccess } from '@/hooks/useFinanceAccess';
import { useFollowUps } from '@/hooks/useFollowUps';
import { filterWaitlistEntries, sortWaitlistEntries, useWaitingList, useWaitlistTypes } from '@/hooks/useWaitingList';
import { createWaitlistType } from '@/hooks/useMutations';
import { isWaitingListQueueStage, stageLabel, WAITING_LIST_QUEUE_STAGES } from '@/lib/waitlist/constants';
import { effectiveStage, entryEmail } from '@/lib/waitlist/helpers';
import type { WaitingListEntry } from '@/types/app.types';

type ViewMode = 'pipeline' | 'list';
const CATEGORY_FILTERS = ['any', 'standard', 'elite', 'protection'] as const;

function SummaryStrip({ entries }: { entries: WaitingListEntry[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const active = entries.filter((e) => isWaitingListQueueStage(effectiveStage(e))).length;
  const followUpToday = entries.filter((e) => e.follow_up_date === today).length;
  const chips = [
    { label: 'Active', value: active, tone: 'text-gold' },
    { label: 'Follow-up today', value: followUpToday, tone: 'text-warning' },
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 px-4">
      {chips.map((c) => (
        <View key={c.label} className="mr-2 rounded-lg border border-gold/20 bg-surface px-4 py-2">
          <Typography variant="caption" className="text-silver">{c.label}</Typography>
          <Typography variant="subtitle" className={c.tone}>{c.value}</Typography>
        </View>
      ))}
    </ScrollView>
  );
}

export default function WaitlistHomeScreen() {
  const router = useRouter();
  const hasAccess = useFinanceAccess();
  const { data, loading, refresh } = useWaitingList();
  const { types } = useWaitlistTypes();
  const { overdueCount } = useFollowUps();
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline');
  const [listTypeId, setListTypeId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [unmetOnly, setUnmetOnly] = useState(false);
  const [stagePickerFor, setStagePickerFor] = useState<WaitingListEntry | null>(null);

  const queue = useMemo(
    () => data.filter((e) => isWaitingListQueueStage(effectiveStage(e))),
    [data],
  );

  const filtered = useMemo(
    () =>
      sortWaitlistEntries(
        filterWaitlistEntries(queue, {
          listTypeId,
          search,
          stage: stageFilter,
          category: categoryFilter,
          unmetOnly,
        }),
      ),
    [queue, listTypeId, search, stageFilter, categoryFilter, unmetOnly],
  );

  if (!hasAccess) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center px-6">
        <Typography variant="subtitle">Access restricted to admin and management.</Typography>
      </ScreenContainer>
    );
  }

  async function copyEmails() {
    const emails = filtered.map((e) => entryEmail(e)).filter(Boolean).join(', ');
    if (!emails) {
      Alert.alert('No emails', 'No emails in the current filter.');
      return;
    }
    await Share.share({ message: emails });
  }

  async function addListType() {
    Alert.prompt('New list type', 'Enter a name', async (name) => {
      if (!name?.trim()) return;
      await createWaitlistType(name.trim());
    });
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="CRM" title="Waiting List" />
      <View className="mb-2 flex-row flex-wrap items-center gap-2 px-4">
        <Pressable onPress={() => setViewMode('pipeline')} className={`rounded-lg border px-3 py-1.5 ${viewMode === 'pipeline' ? 'border-gold bg-gold/15' : 'border-gold/20'}`}>
          <Typography variant="caption" className={viewMode === 'pipeline' ? 'text-gold' : ''}>Pipeline</Typography>
        </Pressable>
        <Pressable onPress={() => setViewMode('list')} className={`rounded-lg border px-3 py-1.5 ${viewMode === 'list' ? 'border-gold bg-gold/15' : 'border-gold/20'}`}>
          <Typography variant="caption" className={viewMode === 'list' ? 'text-gold' : ''}>List</Typography>
        </Pressable>
        <Pressable onPress={() => router.push('/(admin)/waitlist/follow-ups')} className="rounded-lg border border-gold/20 px-3 py-1.5">
          <Typography variant="caption">Follow-ups {overdueCount > 0 ? `(${overdueCount})` : ''}</Typography>
        </Pressable>
        <Pressable onPress={() => router.push('/(admin)/waitlist/match')} className="rounded-lg border border-gold/20 px-3 py-1.5">
          <Typography variant="caption" className="text-gold">Match</Typography>
        </Pressable>
        <Pressable onPress={() => router.push('/(admin)/fulfilment')} className="rounded-lg border border-gold/20 px-3 py-1.5">
          <Typography variant="caption" className="text-gold">Fulfilment</Typography>
        </Pressable>
        <Pressable onPress={copyEmails} className="ml-auto flex-row items-center gap-1">
          <Ionicons name="copy-outline" size={16} color={Colors.gold} />
          <Typography variant="caption" className="text-gold">Emails</Typography>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 px-4">
        <Pressable onPress={() => setListTypeId(null)} className={`mr-2 rounded-full border px-3 py-1.5 ${!listTypeId ? 'border-gold bg-gold/15' : 'border-gold/20'}`}>
          <Typography variant="caption">All ({queue.length})</Typography>
        </Pressable>
        {types.filter((t) => t.slug !== 'do-not-sell').map((t) => {
          const count = queue.filter((e) => e.list_type_id === t.id).length;
          return (
            <Pressable key={t.id} onPress={() => setListTypeId(t.id)} className={`mr-2 rounded-full border px-3 py-1.5 ${listTypeId === t.id ? 'border-gold bg-gold/15' : 'border-gold/20'}`}>
              <Typography variant="caption">{t.name} ({count})</Typography>
            </Pressable>
          );
        })}
        <Pressable onPress={addListType} className="rounded-full border border-gold/30 px-3 py-1.5">
          <Typography variant="caption" className="text-gold">+ New List</Typography>
        </Pressable>
      </ScrollView>

      <View className="mb-3 px-4">
        <Input placeholder="Search clients…" value={search} onChangeText={setSearch} autoCapitalize="none" />
        <Typography variant="caption" className="mt-2 text-silver">
          Showing {filtered.length} of {queue.length} paid
        </Typography>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2 px-4">
        <Pressable
          onPress={() => setStageFilter(null)}
          className={`mr-2 rounded-full border px-3 py-1.5 ${!stageFilter ? 'border-gold bg-gold/15' : 'border-gold/20'}`}
        >
          <Typography variant="caption">All paid</Typography>
        </Pressable>
        {WAITING_LIST_QUEUE_STAGES.map((s) => (
          <Pressable
            key={s}
            onPress={() => setStageFilter(s)}
            className={`mr-2 rounded-full border px-3 py-1.5 ${stageFilter === s ? 'border-gold bg-gold/15' : 'border-gold/20'}`}
          >
            <Typography variant="caption">{stageLabel(s)}</Typography>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2 px-4">
        <Pressable
          onPress={() => setCategoryFilter(null)}
          className={`mr-2 rounded-full border px-3 py-1.5 ${!categoryFilter ? 'border-gold bg-gold/15' : 'border-gold/20'}`}
        >
          <Typography variant="caption">All categories</Typography>
        </Pressable>
        {CATEGORY_FILTERS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategoryFilter(c)}
            className={`mr-2 rounded-full border px-3 py-1.5 ${categoryFilter === c ? 'border-gold bg-gold/15' : 'border-gold/20'}`}
          >
            <Typography variant="caption" className="capitalize">
              {c}
            </Typography>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setUnmetOnly((v) => !v)}
          className={`mr-2 rounded-full border px-3 py-1.5 ${unmetOnly ? 'border-gold bg-gold/15' : 'border-gold/20'}`}
        >
          <Typography variant="caption">Unmet prefs</Typography>
        </Pressable>
        {stageFilter || categoryFilter || unmetOnly ? (
          <Pressable
            onPress={() => {
              setStageFilter(null);
              setCategoryFilter(null);
              setUnmetOnly(false);
            }}
            className="rounded-full border border-gold/30 px-3 py-1.5"
          >
            <Typography variant="caption" className="text-gold">
              Clear filters
            </Typography>
          </Pressable>
        ) : null}
      </ScrollView>

      <View className="mb-3 flex-row gap-2 px-4">
        <Button
          label="+ New Lead"
          size="sm"
          onPress={() => router.push({ pathname: '/(admin)/waitlist/new', params: { mode: 'manual' } })}
        />
      </View>

      {!loading ? <SummaryStrip entries={filtered} /> : null}
      {loading ? <CardListSkeleton count={3} /> : null}

      {!loading && filtered.length === 0 ? (
        <EmptyState title="No one waiting" message="Only deposit-paid, matched and reserved clients appear here." />
      ) : loading ? null : viewMode === 'pipeline' ? (
        <PipelineBoard
          entries={filtered}
          onSelect={(e) => router.push({ pathname: '/(admin)/waitlist/[id]', params: { id: e.id } })}
          onLongPress={(e) => setStagePickerFor(e)}
        />
      ) : (
        <WaitlistTable
          entries={filtered}
          onRefresh={refresh}
          onSelect={(e) => router.push({ pathname: '/(admin)/waitlist/[id]', params: { id: e.id } })}
          onMoveStage={setStagePickerFor}
        />
      )}

      <StageSelector visible={!!stagePickerFor} entry={stagePickerFor} onClose={() => setStagePickerFor(null)} onSaved={refresh} />
    </ScreenContainer>
  );
}
