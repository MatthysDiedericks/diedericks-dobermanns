import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useAddHeatCycle, useBreedDefaults, useUpdateHeatCycle } from '@/hooks/useHeatCycles';
import { parseDateInput } from '@/lib/dogDetail/feedback';
import { addDays, autoHeatDates, breedingWindowEnd } from '@/lib/heats/calculations';
import type { HeatCycleRecord } from '@/lib/heats/constants';
import { formatKennelDate } from '@/lib/kennel/formatters';
import { requireSupabase } from '@/lib/supabase';

export interface HeatActionSheetsHandle {
  openAdd: () => void;
  openEdit: () => void;
  openMating: () => void;
  close: () => void;
}

interface HeatCycleActionSheetsProps {
  dogId: string;
  cycle: HeatCycleRecord | null;
  onSaved: () => void;
}

const MATING_TYPES = ['natural', 'fresh_chilled', 'frozen', 'surgical_ai'] as const;
type SheetMode = 'add' | 'edit' | 'mating';

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <View className="mb-3">
      <Typography variant="caption" className="mb-1 text-muted">
        {label}
      </Typography>
      <BottomSheetTextInput
        value={value ?? ''}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#8C8474"
        multiline={multiline}
        className="rounded-xl border border-gold/20 bg-[#111008] px-4 py-3 font-body text-ink"
        style={multiline ? { minHeight: 72, textAlignVertical: 'top' } : undefined}
      />
    </View>
  );
}

export const HeatCycleActionSheets = forwardRef<
  HeatActionSheetsHandle,
  HeatCycleActionSheetsProps
>(function HeatCycleActionSheets({ dogId, cycle, onSaved }, ref) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [mode, setMode] = useState<SheetMode>('edit');
  const { defaults } = useBreedDefaults();
  const addHeat = useAddHeatCycle();
  const updateCycle = useUpdateHeatCycle();
  const [values, setValues] = useState<Record<string, string>>({});
  const [males, setMales] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const snapPoints = useMemo(() => ['75%'], []);

  const loadMales = useCallback(async () => {
    const { data } = await requireSupabase()
      .from('dogs')
      .select('id, name')
      .eq('sex', 'male')
      .order('name');
    setMales((data ?? []) as { id: string; name: string }[]);
  }, []);

  const openAdd = useCallback(() => {
    setMode('add');
    const today = new Date().toISOString().slice(0, 10);
    const auto = autoHeatDates(today, defaults);
    setValues({
      heat_start_date: today,
      proestrus_start_date: auto.proestrus_start_date,
      estrus_start_date: auto.estrus_start_date,
      ovulation_date: auto.ovulation_date,
      heat_end_date: '',
      status: 'active',
      notes: '',
    });
    sheetRef.current?.present();
  }, [defaults]);

  const openEdit = useCallback(() => {
    if (!cycle) return;
    setMode('edit');
    setValues({
      heat_start_date: cycle.heat_start_date,
      proestrus_start_date: cycle.proestrus_start_date ?? '',
      estrus_start_date: cycle.estrus_start_date ?? '',
      ovulation_date: cycle.ovulation_date ?? '',
      heat_end_date: cycle.heat_end_date ?? '',
      status: cycle.status,
      notes: cycle.notes ?? '',
    });
    sheetRef.current?.present();
  }, [cycle]);

  const openMating = useCallback(() => {
    if (!cycle) return;
    setMode('mating');
    void loadMales();
    setValues({
      mating_date: cycle.mating_date ?? new Date().toISOString().slice(0, 10),
      mating_type: cycle.mating_type ?? 'natural',
      sire_id: cycle.sire_id ?? '',
      notes: cycle.notes ?? '',
    });
    sheetRef.current?.present();
  }, [cycle, loadMales]);

  useImperativeHandle(ref, () => ({
    openAdd,
    openEdit,
    openMating,
    close: () => sheetRef.current?.dismiss(),
  }));

  function onHeatStartChange(v: string) {
    const auto = parseDateInput(v) ? autoHeatDates(v, defaults) : null;
    setValues((s) => ({
      ...s,
      heat_start_date: v,
      ...(auto
        ? {
            proestrus_start_date: auto.proestrus_start_date,
            estrus_start_date: auto.estrus_start_date,
            ovulation_date: auto.ovulation_date,
          }
        : {}),
    }));
  }

  const ovulation = values.ovulation_date?.trim();
  const parsedOv = ovulation ? parseDateInput(ovulation) : null;
  const windowLabel = parsedOv
    ? `${formatKennelDate(parsedOv)} – ${formatKennelDate(breedingWindowEnd(parsedOv))}`
    : '—';
  const whelpLabel = parsedOv
    ? formatKennelDate(addDays(parsedOv, defaults.gestation_days))
    : '—';

  async function onSave() {
    setSaving(true);
    try {
      if (mode === 'add') {
        const start = parseDateInput(values.heat_start_date ?? '');
        if (!start) return;
        await addHeat(dogId, start, {
          proestrus_start_date: parseDateInput(values.proestrus_start_date ?? ''),
          estrus_start_date: parseDateInput(values.estrus_start_date ?? ''),
          ovulation_date: parseDateInput(values.ovulation_date ?? ''),
          heat_end_date: parseDateInput(values.heat_end_date ?? ''),
          status: values.status || 'active',
          notes: values.notes?.trim() || null,
        });
      } else if (mode === 'edit' && cycle) {
        const ov = parseDateInput(values.ovulation_date ?? '');
        await updateCycle(cycle.id, {
          heat_start_date: parseDateInput(values.heat_start_date ?? '') ?? cycle.heat_start_date,
          proestrus_start_date: parseDateInput(values.proestrus_start_date ?? ''),
          estrus_start_date: parseDateInput(values.estrus_start_date ?? ''),
          ovulation_date: ov,
          heat_end_date: parseDateInput(values.heat_end_date ?? ''),
          expected_whelp_date: ov ? addDays(ov, defaults.gestation_days) : cycle.expected_whelp_date,
          status: values.status || cycle.status,
          notes: values.notes?.trim() || null,
        });
      } else if (mode === 'mating' && cycle) {
        const matingDate = parseDateInput(values.mating_date ?? '');
        if (!matingDate) return;
        const ov = cycle.ovulation_date;
        await updateCycle(cycle.id, {
          mating_date: matingDate,
          mating_type: values.mating_type || null,
          sire_id: values.sire_id?.trim() || null,
          status: 'mated',
          expected_whelp_date: ov
            ? addDays(ov, defaults.gestation_days)
            : addDays(matingDate, 60),
          notes: values.notes?.trim() || cycle.notes,
        });
      }
      sheetRef.current?.dismiss();
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const title =
    mode === 'add' ? 'Add Heat Cycle' : mode === 'mating' ? 'Record Mating' : 'Edit Heat Cycle';

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: '#1C1A0E' }}
      handleIndicatorStyle={{ backgroundColor: '#C4A35A' }}
    >
      <BottomSheetScrollView className="px-5 pb-10">
        <Typography variant="subtitle" className="mb-4 text-gold">
          {title}
        </Typography>
        {mode === 'mating' ? (
          <>
            <Field label="Mating date *" value={values.mating_date} onChange={(v) => setValues((s) => ({ ...s, mating_date: v }))} />
            <Typography variant="caption" className="mb-2 text-muted">
              Mating type
            </Typography>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {MATING_TYPES.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setValues((s) => ({ ...s, mating_type: t }))}
                  className={`rounded-full border px-3 py-1.5 ${
                    values.mating_type === t ? 'border-gold bg-gold/15' : 'border-gold/20'
                  }`}
                >
                  <Typography variant="caption">{t.replace(/_/g, ' ')}</Typography>
                </Pressable>
              ))}
            </View>
            <Typography variant="caption" className="mb-2 text-muted">
              Sire
            </Typography>
            {males.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => setValues((s) => ({ ...s, sire_id: m.id }))}
                className={`mb-2 rounded-lg border px-3 py-2 ${
                  values.sire_id === m.id ? 'border-gold bg-gold/10' : 'border-gold/15'
                }`}
              >
                <Typography variant="body">{m.name}</Typography>
              </Pressable>
            ))}
            <Field label="Notes" value={values.notes} onChange={(v) => setValues((s) => ({ ...s, notes: v }))} multiline />
          </>
        ) : (
          <>
            <Field label="Heat start *" value={values.heat_start_date} onChange={onHeatStartChange} />
            <Field label="Proestrus start" value={values.proestrus_start_date} onChange={(v) => setValues((s) => ({ ...s, proestrus_start_date: v }))} />
            <Field label="Estrus start" value={values.estrus_start_date} onChange={(v) => setValues((s) => ({ ...s, estrus_start_date: v }))} />
            <Field label="Ovulation date" value={values.ovulation_date} onChange={(v) => setValues((s) => ({ ...s, ovulation_date: v }))} />
            <Field label="Heat end" value={values.heat_end_date} onChange={(v) => setValues((s) => ({ ...s, heat_end_date: v }))} />
            <Field label="Status" value={values.status} onChange={(v) => setValues((s) => ({ ...s, status: v }))} />
            <Field label="Notes" value={values.notes} onChange={(v) => setValues((s) => ({ ...s, notes: v }))} multiline />
            <Typography variant="caption" className="mb-1 text-muted">
              Breeding window: {windowLabel}
            </Typography>
            <Typography variant="caption" className="mb-4 text-muted">
              Expected whelp: {whelpLabel}
            </Typography>
          </>
        )}
        <Button label="Save" onPress={() => void onSave()} loading={saving} fullWidth />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
