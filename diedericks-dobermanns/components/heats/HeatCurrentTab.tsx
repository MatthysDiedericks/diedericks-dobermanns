import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  HeatCycleActionSheets,
  type HeatActionSheetsHandle,
} from '@/components/heats/HeatCycleActionSheets';
import { HeatStatusBadge } from '@/components/heats/HeatStatusBadge';
import { PhaseTimeline } from '@/components/heats/PhaseTimeline';
import { ProgesteroneChart } from '@/components/heats/ProgesteroneChart';
import {
  RecordBottomSheet,
  type RecordSheetRef,
} from '@/components/dogs/detail/RecordBottomSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import {
  useAddProgesteroneTest,
  useBreedDefaults,
  useConfirmHeat,
  useUpdateHeatCycle,
} from '@/hooks/useHeatCycles';
import { parseDateInput } from '@/lib/dogDetail/feedback';
import { breedingWindowEnd, daysUntil, isActiveHeat } from '@/lib/heats/calculations';
import type { HeatCycleRecord } from '@/lib/heats/constants';
import { formatKennelDate } from '@/lib/kennel/formatters';
import type { Dog } from '@/types/app.types';

interface HeatCurrentTabProps {
  dog: Dog | null;
  dogId: string;
  cycles: HeatCycleRecord[];
  onRefresh: () => void;
}

function DateRow({ label, date }: { label: string; date: string | null | undefined }) {
  const away = daysUntil(date ?? null);
  return (
    <View className="flex-row justify-between border-b border-gold/10 py-2">
      <Typography variant="caption" className="text-muted">
        {label}
      </Typography>
      <View className="items-end">
        <Typography variant="body">{date ? formatKennelDate(date) : '— not recorded'}</Typography>
        {date && away != null ? (
          <Typography variant="caption" className="text-muted">
            {away >= 0 ? `${away} days away` : `${Math.abs(away)} days ago`}
          </Typography>
        ) : null}
      </View>
    </View>
  );
}

function StaticRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View className="flex-row justify-between border-b border-gold/10 py-2">
      <Typography variant="caption" className="text-muted">
        {label}
      </Typography>
      <Typography variant="body">{value ?? '— not recorded'}</Typography>
    </View>
  );
}

export function HeatCurrentTab({ dog, dogId, cycles, onRefresh }: HeatCurrentTabProps) {
  const { defaults } = useBreedDefaults();
  const confirmHeat = useConfirmHeat();
  const updateCycle = useUpdateHeatCycle();
  const addProg = useAddProgesteroneTest();
  const actionSheets = useRef<HeatActionSheetsHandle>(null);
  const confirmSheet = useRef<RecordSheetRef>(null);
  const progSheet = useRef<RecordSheetRef>(null);
  const [confirmValues, setConfirmValues] = useState<Record<string, string>>({});
  const [progValues, setProgValues] = useState<Record<string, string>>({});

  const cycle =
    cycles.find(isActiveHeat) ??
    cycles.find((c) => c.is_predicted) ??
    cycles[0] ??
    null;

  const photo = dog?.media?.find((m) => m.is_primary)?.url ?? dog?.media?.[0]?.url;
  const ovulation = cycle?.ovulation_date;
  const breedingWindow =
    ovulation && parseDateInput(ovulation)
      ? `${formatKennelDate(ovulation)} – ${formatKennelDate(breedingWindowEnd(ovulation))}`
      : null;

  const cycleId = cycle?.id;

  if (!cycle) {
    return (
      <View className="py-8">
        <Typography variant="bodyMuted" className="mb-4 text-center">
          No heat cycle on record for this female.
        </Typography>
        <Button label="Add Heat Cycle" onPress={() => actionSheets.current?.openAdd()} fullWidth />
        <HeatCycleActionSheets ref={actionSheets} dogId={dogId} cycle={null} onSaved={onRefresh} />
      </View>
    );
  }

  async function onConfirm() {
    const date = parseDateInput(confirmValues.heat_start_date ?? '');
    if (!date || !cycleId) return;
    await confirmHeat(cycleId, date, confirmValues.notes);
    confirmSheet.current?.close();
    onRefresh();
  }

  async function onAddProg() {
    const date = parseDateInput(progValues.date ?? '');
    const value = parseFloat(progValues.value ?? '');
    if (!date || !Number.isFinite(value) || !cycleId) return;
    await addProg(cycleId, cycle.progesterone_tests, {
      date,
      value_ng_ml: value,
      lab: progValues.lab?.trim() || null,
      notes: progValues.notes?.trim() || null,
    });
    progSheet.current?.close();
    setProgValues({});
    onRefresh();
  }

  async function markCompleted() {
    if (!cycleId) return;
    await updateCycle(cycleId, {
      status: 'completed',
      heat_end_date: new Date().toISOString().slice(0, 10),
    });
    onRefresh();
  }

  return (
    <View className="pb-8">
      <Card className="mb-4">
        <View className="flex-row items-center gap-3">
          {photo ? (
            <Image source={{ uri: photo }} style={{ width: 56, height: 56, borderRadius: 28 }} />
          ) : null}
          <View className="flex-1">
            <Typography variant="subtitle">{dog?.name ?? 'Dam'}</Typography>
            <HeatStatusBadge status={cycle.status} predicted={cycle.is_predicted} />
          </View>
        </View>
        {cycle.is_predicted ? (
          <View className="mt-4 rounded-lg border border-dashed border-gold/40 bg-gold/5 p-3">
            <Typography variant="caption" className="text-muted">
              This is a predicted heat — confirm when actual heat begins
            </Typography>
            <Button
              label="Confirm Actual Heat"
              onPress={() => {
                setConfirmValues({ heat_start_date: cycle.heat_start_date });
                confirmSheet.current?.open();
              }}
              fullWidth
              className="mt-3"
            />
          </View>
        ) : null}
      </Card>

      <PhaseTimeline heatStart={cycle.heat_start_date} defaults={defaults} />

      <Card className="mb-4">
        <Typography variant="label" className="mb-2 text-gold">
          KEY DATES
        </Typography>
        <DateRow label="Heat start" date={cycle.heat_start_date} />
        <DateRow label="Proestrus start" date={cycle.proestrus_start_date} />
        <DateRow label="Estrus start (fertile)" date={cycle.estrus_start_date} />
        <DateRow label="Ovulation (est.)" date={cycle.ovulation_date} />
        <StaticRow label="Optimal breeding window" value={breedingWindow} />
        <DateRow label="Expected whelp" date={cycle.expected_whelp_date} />
      </Card>

      <Card className="mb-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Typography variant="label" className="text-gold">
            PROGESTERONE
          </Typography>
          <Pressable onPress={() => progSheet.current?.open()}>
            <Typography variant="caption" className="text-gold">
              + Add Test
            </Typography>
          </Pressable>
        </View>
        <ProgesteroneChart tests={cycle.progesterone_tests ?? []} />
      </Card>

      <Card className="mb-4">
        <Typography variant="label" className="mb-2 text-gold">
          NOTES
        </Typography>
        <Typography variant="bodyMuted">{cycle.notes || 'Tap Edit to add notes.'}</Typography>
      </Card>

      <View className="gap-3">
        {!cycle.is_predicted ? (
          <>
            <Button label="Edit This Cycle" variant="outline" onPress={() => actionSheets.current?.openEdit()} fullWidth />
            <Button label="Record Mating" variant="outline" onPress={() => actionSheets.current?.openMating()} fullWidth />
            <Button label="Mark as Completed" variant="outline" onPress={() => void markCompleted()} fullWidth />
          </>
        ) : null}
        <Button label="Add New Heat Cycle" onPress={() => actionSheets.current?.openAdd()} fullWidth />
      </View>

      <HeatCycleActionSheets ref={actionSheets} dogId={dogId} cycle={cycle} onSaved={onRefresh} />
      <RecordBottomSheet
        ref={confirmSheet}
        title="Confirm Actual Heat Start"
        fields={[
          { key: 'heat_start_date', label: 'Actual heat start', placeholder: 'YYYY-MM-DD', required: true },
          { key: 'notes', label: 'Notes', multiline: true },
        ]}
        values={confirmValues}
        onChange={(k, v) => setConfirmValues((s) => ({ ...s, [k]: v }))}
        onSave={() => void onConfirm()}
      />
      <RecordBottomSheet
        ref={progSheet}
        title="Add Progesterone Test"
        fields={[
          { key: 'date', label: 'Test date', placeholder: 'YYYY-MM-DD', required: true },
          { key: 'value', label: 'Value (ng/mL)', keyboard: 'numeric', required: true },
          { key: 'lab', label: 'Lab / Vet' },
          { key: 'notes', label: 'Notes' },
        ]}
        values={progValues}
        onChange={(k, v) => setProgValues((s) => ({ ...s, [k]: v }))}
        onSave={() => void onAddProg()}
      />
    </View>
  );
}
