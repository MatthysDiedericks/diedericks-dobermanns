import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { allocateDogToClient } from '@/lib/dogs/allocation';
import { isAllocatablePuppy } from '@/lib/waitlist/allocationDecision';
import { colourLabel } from '@/lib/colours/dogColours';
import { collarLabel } from '@/lib/litters/collarColours';
import { supabase } from '@/lib/supabase';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import {
  assignBuyer,
  litterPlacementCounts,
  puppyPlacement,
  rankedBuyersForPuppy,
  siblingGroupLines,
  suggestLitterAllocation,
  undoAllocation,
  type WorkingAllocation,
} from '@/lib/waitlist/litterAllocation';
import { WaitlistHoldNote } from '@/components/waitlist/WaitlistHoldNote';
import { holdOverridePrompt, queuePositionInStage, queuePositionLabel } from '@/lib/waitlist/hold';
import { entryDisplayName } from '@/lib/waitlist/helpers';
import {
  explainEmptyBuyersForDog,
  MATCHABLE_STAGES,
  preferenceChipLabel,
  tierGapSummary,
  type MatchableDog,
} from '@/lib/waitlist/matching';
import { assignWaitlistMatch } from '@/lib/waitlist/mutations';
import type { WaitingListEntry } from '@/types/app.types';

type Puppy = MatchableDog & {
  birth_order: number | null;
  collar_colour: string | null;
  reserved_for_name: string | null;
};

const PLACE = {
  allocated: 'Allocated',
  unallocated: 'Unallocated',
  reserved: 'Reserved',
  other: 'Not for sale',
} as const;

export default function LitterAllocateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const litterId = id ?? '';
  const [title, setTitle] = useState('Litter');
  const [puppies, setPuppies] = useState<Puppy[]>([]);
  const [entries, setEntries] = useState<WaitingListEntry[]>([]);
  const [baseline, setBaseline] = useState<WorkingAllocation[]>([]);
  const [allocations, setAllocations] = useState<WorkingAllocation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !litterId) return;
    const [{ data: litter }, { data: dogs }, { data: buyers }] = await Promise.all([
      supabase.from('litters').select('id, name, litter_letter, default_programme_tier').eq('id', litterId).maybeSingle(),
      supabase
        .from('dogs')
        .select('id, name, sex, colour, status, programme_tier, category, tail_type, birth_order, collar_colour, reserved_for_name')
        .eq('litter_id', litterId)
        .order('birth_order', { ascending: true, nullsFirst: false }),
      supabase
        .from('waiting_list')
        .select('*, client:users!waiting_list_client_id_fkey(id, full_name, phone, email)')
        .in('pipeline_stage', [...MATCHABLE_STAGES]),
    ]);
    setTitle(litter?.name ?? litter?.litter_letter ?? 'Litter');
    const rows: Puppy[] = (dogs ?? [])
      .filter((dog) => isAllocatablePuppy(dog))
      .map((dog) => ({
      id: dog.id,
      name: dog.name,
      sex: dog.sex,
      colour: dog.colour,
      status: dog.status,
      programme_tier: dog.programme_tier,
      litter_default_programme_tier: dog.programme_tier ? null : litter?.default_programme_tier ?? null,
      category: dog.category,
      tail_type: dog.tail_type,
      birth_order: dog.birth_order,
      collar_colour: dog.collar_colour,
      reserved_for_name: dog.reserved_for_name,
    }));
    setPuppies(rows);
    const puppyIds = rows.map((puppy) => puppy.id);
    const list = (buyers ?? []) as WaitingListEntry[];
    setEntries(list);
    const saved: WorkingAllocation[] = list
      .filter((entry) => entry.assigned_dog_id && puppyIds.includes(entry.assigned_dog_id))
      .map((entry) => ({
        puppyId: entry.assigned_dog_id as string,
        entryId: entry.id,
        source: 'saved' as const,
      }));
    setBaseline(saved);
    setAllocations(saved);
    setSelectedId((current) => current ?? rows[0]?.id ?? null);
  }, [litterId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = puppies.find((puppy) => puppy.id === selectedId) ?? puppies[0] ?? null;
  const counts = litterPlacementCounts(puppies, allocations);
  const ranked = useMemo(
    () => (selected ? rankedBuyersForPuppy(entries, selected, allocations) : []),
    [allocations, entries, selected],
  );
  const proposed = allocations.filter((line) => line.source === 'proposed');

  async function save() {
    if (!supabase || proposed.length === 0) return;
    setSaving(true);
    try {
      for (const line of proposed) {
        const stage = await assignWaitlistMatch(line.entryId, { dogId: line.puppyId, litterId });
        if (stage.error) {
          showError(stage.error);
          return;
        }
        const { data: entry } = await supabase
          .from('waiting_list')
          .select('client_id')
          .eq('id', line.entryId)
          .maybeSingle();
        if (entry?.client_id) {
          const alloc = await allocateDogToClient(line.puppyId, entry.client_id);
          if (alloc.error) {
            showError(alloc.error);
            return;
          }
        } else {
          await supabase.from('dogs').update({ status: 'reserved' } as never).eq('id', line.puppyId);
        }
      }
      showSaved('Allocation saved');
      setNotice(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Litter" title={`Allocate — ${title}`} />
      <ScrollView className="px-4 pb-12">
        <Typography variant="body" className="mb-3">
          Allocated {counts.allocated} · Unallocated {counts.unallocated} · Reserved {counts.reserved}
        </Typography>
        {tierGapSummary(entries, puppies).map((gap) => (
          <Typography key={gap} variant="caption" className="mb-2 text-warning">
            {gap}
          </Typography>
        ))}
        {siblingGroupLines(entries).map((line) => (
          <Typography key={line} variant="caption" className="mb-2 text-gold">
            {line}
          </Typography>
        ))}
        {notice ? (
          <Typography variant="caption" className="mb-3 text-gold">
            {notice}
          </Typography>
        ) : null}
        <View className="mb-4 flex-row gap-2">
          <Button
            label="Suggest"
            size="sm"
            variant="outline"
            onPress={() => {
              setAllocations(suggestLitterAllocation(puppies, entries, baseline));
              setNotice('Suggestion only — nothing has been saved.');
            }}
          />
          <Button
            label={saving ? 'Saving…' : 'Save'}
            size="sm"
            loading={saving}
            disabled={proposed.length === 0}
            onPress={() => void save()}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {puppies.map((puppy) => {
            const place = puppyPlacement(puppy, allocations);
            const line = allocations.find((row) => row.puppyId === puppy.id);
            return (
              <Pressable
                key={puppy.id}
                onPress={() => setSelectedId(puppy.id)}
                className={`mr-2 w-36 rounded-xl border p-3 ${
                  selected?.id === puppy.id ? 'border-gold bg-gold/10' : 'border-gold/20'
                }`}
              >
                <Typography variant="subtitle">{puppy.name}</Typography>
                <Typography variant="caption">
                  {PLACE[place]}
                  {line ? ` · ${entryDisplayName(entries.find((e) => e.id === line.entryId) ?? ({ enquirer_name: 'Buyer' } as WaitingListEntry))}` : ''}
                </Typography>
                <Typography variant="caption" className="text-silver">
                  {[collarLabel(puppy.collar_colour), puppy.sex, puppy.colour ? colourLabel(puppy.colour) : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Typography>
                {!puppy.tail_type ? (
                  <Typography variant="caption" className="text-warning">
                    Tail not recorded
                  </Typography>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
        {selected && allocations.some((line) => line.puppyId === selected.id) ? (
          <Button
            label="Undo"
            size="sm"
            variant="outline"
            className="mb-3"
            onPress={() => setAllocations(undoAllocation(allocations, selected.id, baseline))}
          />
        ) : null}
        {ranked.map((candidate) => (
          <Card key={candidate.entry.id} className="mb-3 p-4">
            <Typography variant="subtitle">{entryDisplayName(candidate.entry)}</Typography>
            <Typography variant="caption" className="text-silver">
              {candidate.daysWaiting} days · {queuePositionLabel(queuePositionInStage(candidate.entry, entries))} · score {candidate.score}
              {candidate.perfectFit ? ' · perfect fit' : ''}
            </Typography>
            <WaitlistHoldNote
              holdUntil={candidate.entry.hold_until}
              holdReason={candidate.entry.hold_reason}
            />
            <Typography variant="caption">{preferenceChipLabel(candidate.entry)}</Typography>
            {candidate.criteria.map((criterion) => (
              <Typography
                key={criterion.key}
                variant="caption"
                className={criterion.unknown ? 'text-warning' : criterion.matched ? 'text-success' : 'text-danger'}
              >
                {criterion.label}: {criterion.detail} ({criterion.points})
              </Typography>
            ))}
            {candidate.warnings.map((warning) => (
              <Typography key={warning} variant="caption" className="text-warning">
                {warning}
              </Typography>
            ))}
            {candidate.mismatches.map((mismatch) => (
              <Typography key={mismatch} variant="caption" className="text-danger">
                {mismatch}
              </Typography>
            ))}
            <Button
              label="Allocate"
              size="sm"
              className="mt-3"
              onPress={() => {
                if (!selected) return;
                const place = () => {
                  const result = assignBuyer(allocations, selected.id, candidate.entry.id);
                  if (result.error) {
                    showError(result.error);
                    return;
                  }
                  setAllocations(result.allocations);
                  setNotice('Placed on the board. Not saved yet.');
                };
                const prompt = holdOverridePrompt(candidate.entry);
                if (!prompt) {
                  place();
                  return;
                }
                Alert.alert('This buyer is on hold', prompt, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Allocate anyway', onPress: place },
                ]);
              }}
            />
          </Card>
        ))}
        {selected && ranked.length === 0 ? (
          <Typography variant="bodyMuted">
            {explainEmptyBuyersForDog(entries, selected, puppies) ??
              'Every matching buyer is already placed on another puppy in this litter.'}
          </Typography>
        ) : null}
        <Button label="Back to litter" variant="outline" className="mt-4" onPress={() => router.back()} />
      </ScrollView>
    </ScreenContainer>
  );
}
