import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  View,
} from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useWaitingList } from '@/hooks/useAdmin';
import { updateWaitlistEntry, useSubmitting } from '@/hooks/useMutations';
import { titleCase } from '@/lib/format';
import {
  daysWaiting,
  isFollowUpOverdue,
  KANBAN_STAGES,
  PIPELINE_STAGES,
  stageLabel,
  TERMINAL_STAGES,
} from '@/lib/waitlist/constants';
import type { WaitingListEntry } from '@/types/app.types';

type ViewMode = 'pipeline' | 'list';

function effectiveStage(entry: WaitingListEntry): string {
  return entry.pipeline_stage ?? 'enquiry';
}

function SummaryStrip({ entries }: { entries: WaitingListEntry[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();

  const active = entries.filter((e) =>
    ['deposit_paid', 'matched', 'reserved'].includes(effectiveStage(e)),
  ).length;
  const followUpToday = entries.filter((e) => e.follow_up_date === today).length;
  const awaitingDeposit = entries.filter((e) => effectiveStage(e) === 'quote_sent').length;
  const completed = entries.filter((e) => {
    if (effectiveStage(e) !== 'handover_complete') return false;
    return new Date(e.created_at).getFullYear() === year;
  }).length;

  const chips = [
    { label: 'Active', value: active, tone: 'text-gold' },
    { label: 'Follow-up today', value: followUpToday, tone: 'text-warning' },
    { label: 'Awaiting deposit', value: awaitingDeposit, tone: 'text-info' },
    { label: 'Completed YTD', value: completed, tone: 'text-success' },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 px-6">
      {chips.map((c) => (
        <View key={c.label} className="mr-2 rounded-lg border border-gold/20 bg-surface px-4 py-2">
          <Typography variant="caption" className="text-silver">
            {c.label}
          </Typography>
          <Typography variant="subtitle" className={c.tone}>
            {c.value}
          </Typography>
        </View>
      ))}
    </ScrollView>
  );
}

function WaitlistCard({
  entry,
  onPress,
}: {
  entry: WaitingListEntry;
  onPress: () => void;
}) {
  const stage = effectiveStage(entry);
  const overdue = isFollowUpOverdue(entry.follow_up_date);

  return (
    <Pressable onPress={onPress} className="mb-2">
      <Card className="border-gold/15 p-3">
        <Typography variant="subtitle" numberOfLines={1}>
          {entry.client?.full_name ?? 'Client'}
        </Typography>
        <Typography variant="caption" className="mt-1 text-silver" numberOfLines={2}>
          {entry.preference_notes ?? 'No preferences noted'}
        </Typography>
        <View className="mt-2 flex-row flex-wrap items-center gap-2">
          <Badge label={titleCase(entry.status)} tone="gold" />
          {entry.follow_up_date ? (
            <Typography variant="caption" className={overdue ? 'text-danger' : 'text-silver'}>
              Follow-up {entry.follow_up_date}
            </Typography>
          ) : null}
          <Typography variant="caption" className="text-silver">
            {daysWaiting(entry.created_at)}d
          </Typography>
        </View>
        {stage === 'do_not_sell' ? (
          <Typography variant="caption" className="mt-1 text-danger">
            Do Not Sell
          </Typography>
        ) : null}
      </Card>
    </Pressable>
  );
}

function StagePickerModal({
  visible,
  entry,
  onClose,
  onSaved,
}: {
  visible: boolean;
  entry: WaitingListEntry | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { submitting, run } = useSubmitting();
  const allStages = [...PIPELINE_STAGES, ...TERMINAL_STAGES];

  async function moveTo(stage: string) {
    if (!entry) return;
    const { error } = await run(() =>
      updateWaitlistEntry(entry.id, {
        pipeline_stage: stage,
        status: stage === 'withdrawn' || stage === 'do_not_sell' ? 'removed' : 'active',
      }),
    );
    if (!error) {
      onSaved();
      onClose();
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/60" onPress={onClose}>
        <Pressable className="max-h-[70%] rounded-t-2xl bg-surface p-6" onPress={() => undefined}>
          <Typography variant="subtitle" className="mb-4 text-gold">
            Move {entry?.client?.full_name ?? 'client'}
          </Typography>
          <ScrollView>
            {allStages.map((stage) => (
              <Pressable
                key={stage}
                disabled={submitting}
                onPress={() => moveTo(stage)}
                className="mb-2 rounded-lg border border-gold/20 px-4 py-3"
              >
                <Typography variant="body">{stageLabel(stage)}</Typography>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DetailSheet({
  entry,
  onClose,
  onSaved,
  onMoveStage,
}: {
  entry: WaitingListEntry | null;
  onClose: () => void;
  onSaved: () => void;
  onMoveStage: () => void;
}) {
  const { submitting, run } = useSubmitting();
  const [feedback, setFeedback] = useState(entry?.feedback ?? '');
  const [delivery, setDelivery] = useState(entry?.expected_delivery_date ?? '');
  const [followUp, setFollowUp] = useState(entry?.follow_up_date ?? '');
  const [notes, setNotes] = useState(entry?.preference_notes ?? '');

  if (!entry) return null;

  async function save() {
    const { error } = await run(() =>
      updateWaitlistEntry(entry!.id, {
        feedback: feedback.trim() || null,
        expected_delivery_date: delivery.trim() || null,
        follow_up_date: followUp.trim() || null,
        preference_notes: notes.trim() || null,
      }),
    );
    if (!error) onSaved();
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ScreenContainer>
        <View className="px-6 pt-4">
          <Pressable onPress={onClose} className="mb-4 h-9 w-9 items-center justify-center rounded-full border border-gold/30">
            <Ionicons name="close" size={18} color={Colors.gold} />
          </Pressable>
        </View>
        <PageHeader eyebrow="Waiting List" title={entry.client?.full_name ?? 'Client'} back={false} />
        <ScrollView className="px-6 pb-12">
          <Typography variant="caption" className="text-silver">
            Stage: {stageLabel(effectiveStage(entry))}
          </Typography>
          {entry.client?.phone ? (
            <Pressable
              onPress={() => Linking.openURL(`tel:${entry.client!.phone}`)}
              className="mt-3"
            >
              <Typography variant="body" className="text-gold">
                {entry.client.phone}
              </Typography>
            </Pressable>
          ) : null}
          {entry.client?.email ? (
            <Pressable
              onPress={() => Linking.openURL(`mailto:${entry.client!.email}`)}
              className="mt-1"
            >
              <Typography variant="caption" className="text-gold underline">
                {entry.client.email}
              </Typography>
            </Pressable>
          ) : null}

          <Input
            label="Preference notes"
            value={notes}
            onChangeText={setNotes}
            multiline
            className="mt-4 h-20"
          />
          <Input
            label="Follow-up date (YYYY-MM-DD)"
            value={followUp}
            onChangeText={setFollowUp}
            autoCapitalize="none"
            className="mt-3"
          />
          <Input
            label="Expected delivery (YYYY-MM-DD)"
            value={delivery}
            onChangeText={setDelivery}
            autoCapitalize="none"
            className="mt-3"
          />
          <Input
            label="Feedback / notes"
            value={feedback}
            onChangeText={setFeedback}
            multiline
            className="mt-3 h-24"
          />

          <View className="mt-6 gap-2">
            <Button label="Move stage" onPress={onMoveStage} variant="outline" fullWidth />
            <Button label="Save" onPress={save} loading={submitting} fullWidth />
          </View>
        </ScrollView>
      </ScreenContainer>
    </Modal>
  );
}

function ListView({
  entries,
  onSelect,
}: {
  entries: WaitingListEntry[];
  onSelect: (e: WaitingListEntry) => void;
}) {
  return (
    <View className="px-6">
      {entries.map((entry, idx) => (
        <Pressable key={entry.id} onPress={() => onSelect(entry)}>
          <Card className="mb-3">
            <View className="flex-row items-start">
              <Typography variant="caption" className="mr-3 w-6 text-gold">
                {entry.position ?? idx + 1}
              </Typography>
              <View className="flex-1">
                <Typography variant="subtitle">{entry.client?.full_name ?? 'Client'}</Typography>
                <Typography variant="caption" className="text-silver">
                  {stageLabel(effectiveStage(entry))} · {daysWaiting(entry.created_at)} days
                </Typography>
                <Typography variant="bodyMuted" className="mt-1" numberOfLines={2}>
                  {entry.preference_notes ?? '—'}
                </Typography>
              </View>
            </View>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

function KanbanView({
  entries,
  onSelect,
}: {
  entries: WaitingListEntry[];
  onSelect: (e: WaitingListEntry) => void;
}) {
  const grouped = useMemo(() => {
    const map: Record<string, WaitingListEntry[]> = {};
    for (const stage of KANBAN_STAGES) map[stage] = [];
    for (const entry of entries) {
      const stage = effectiveStage(entry);
      if ((TERMINAL_STAGES as readonly string[]).includes(stage)) continue;
      if (map[stage]) map[stage].push(entry);
      else map.enquiry.push(entry);
    }
    return map;
  }, [entries]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-6">
      {KANBAN_STAGES.map((stage) => (
        <View key={stage} style={{ width: 260 }} className="mr-3">
          <View className="mb-2 flex-row items-center justify-between rounded-lg bg-surface px-3 py-2">
            <Typography variant="label">{stageLabel(stage)}</Typography>
            <Badge label={String(grouped[stage]?.length ?? 0)} tone="muted" />
          </View>
          <ScrollView className="max-h-[520px]">
            {(grouped[stage] ?? []).map((entry) => (
              <WaitlistCard key={entry.id} entry={entry} onPress={() => onSelect(entry)} />
            ))}
          </ScrollView>
        </View>
      ))}
    </ScrollView>
  );
}

export default function AdminWaitingListScreen() {
  const { data: entries, loading, refetch } = useWaitingList();
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline');
  const [selected, setSelected] = useState<WaitingListEntry | null>(null);
  const [stagePickerFor, setStagePickerFor] = useState<WaitingListEntry | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const name = e.client?.full_name?.toLowerCase() ?? '';
      const notes = e.preference_notes?.toLowerCase() ?? '';
      return name.includes(q) || notes.includes(q);
    });
  }, [entries, search]);

  async function copyEmails() {
    const emails = filtered
      .map((e) => e.client?.email)
      .filter(Boolean)
      .join(', ');
    if (!emails) {
      Alert.alert('No emails', 'No client emails in the current list.');
      return;
    }
    await Share.share({ message: emails });
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="CRM" title="Waiting List" />
      <View className="mb-3 flex-row items-center justify-between px-6">
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => setViewMode('pipeline')}
            className={`rounded-lg border px-3 py-1.5 ${
              viewMode === 'pipeline' ? 'border-gold bg-gold/15' : 'border-gold/20'
            }`}
          >
            <Typography variant="caption" className={viewMode === 'pipeline' ? 'text-gold' : ''}>
              Pipeline
            </Typography>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('list')}
            className={`rounded-lg border px-3 py-1.5 ${
              viewMode === 'list' ? 'border-gold bg-gold/15' : 'border-gold/20'
            }`}
          >
            <Typography variant="caption" className={viewMode === 'list' ? 'text-gold' : ''}>
              List
            </Typography>
          </Pressable>
        </View>
        <Pressable onPress={copyEmails} className="flex-row items-center gap-1">
          <Ionicons name="copy-outline" size={16} color={Colors.gold} />
          <Typography variant="caption" className="text-gold">
            Emails
          </Typography>
        </Pressable>
      </View>

      <View className="mb-4 px-6">
        <Input
          placeholder="Search clients…"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      {!loading ? <SummaryStrip entries={filtered} /> : null}
      {loading ? <CardListSkeleton count={3} /> : null}

      {!loading && filtered.length === 0 ? (
        <EmptyState title="Waiting list is empty" />
      ) : loading ? null : viewMode === 'pipeline' ? (
        <KanbanView entries={filtered} onSelect={setSelected} />
      ) : (
        <ListView entries={filtered} onSelect={setSelected} />
      )}

      {selected ? (
        <DetailSheet
          entry={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            refetch();
            setSelected(null);
          }}
          onMoveStage={() => {
            setStagePickerFor(selected);
          }}
        />
      ) : null}

      <StagePickerModal
        visible={!!stagePickerFor}
        entry={stagePickerFor}
        onClose={() => setStagePickerFor(null)}
        onSaved={refetch}
      />
    </ScreenContainer>
  );
}
