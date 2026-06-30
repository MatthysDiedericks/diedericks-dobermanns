import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import type { NewTrialInput } from '@/hooks/useTrialPairings';
import {
  BREEDING_DOG_SELECT,
  PLANNER_DAM_ROLES,
  PLANNER_FEMALE_FILTER,
  PLANNER_MALE_FILTER,
  PLANNER_SIRE_ROLES,
} from '@/lib/breeding/constants';
import { coiBadgeClasses, coiSeverityLabel } from '@/lib/breeding/coiDisplay';
import type { CoiResult } from '@/lib/breeding/coi';
import { requireSupabase } from '@/lib/supabase';
import type { BreedingDog, BreedingLine } from '@/types/breeding';

export interface AddTrialSheetHandle {
  open: () => void;
}

interface AddTrialSheetProps {
  onSaved: () => void;
  addTrial: (input: NewTrialInput) => Promise<void>;
  calcCoi: (sireId: string, damId: string) => Promise<CoiResult | null>;
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="mb-4">
      <Typography variant="caption" className="mb-2 text-silver">
        {label}
      </Typography>
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              className={`rounded-xl border px-4 py-2 ${active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'}`}
            >
              <Typography variant="caption" className={active ? 'text-gold' : 'text-ink-muted'}>
                {o.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DogPicker({
  label,
  dogs,
  selectedId,
  onSelect,
}: {
  label: string;
  dogs: BreedingDog[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dogs;
    return dogs.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d as BreedingDog & { call_name?: string | null }).call_name?.toLowerCase().includes(q),
    );
  }, [dogs, query]);

  return (
    <View className="mb-4">
      <Typography variant="caption" className="mb-2 text-silver">
        {label}
      </Typography>
      <BottomSheetTextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name…"
        placeholderTextColor="#9E9E9E"
        className="mb-2 rounded-xl border border-gold/20 bg-surface px-4 py-3 font-body text-base text-ink"
      />
      <View className="max-h-[300] overflow-hidden rounded-xl border border-gold/15">
        <FlatList
          data={filtered}
          keyExtractor={(d) => d.id}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const selected = item.id === selectedId;
            const callName = (item as BreedingDog & { call_name?: string | null }).call_name;
            return (
              <Pressable
                onPress={() => onSelect(item.id)}
                className={`flex-row items-center justify-between border-b border-gold/10 px-3 py-2.5 ${selected ? 'bg-gold/10' : ''}`}
              >
                <View className="flex-1 pr-2">
                  <Typography variant="body">{item.name}</Typography>
                  <Typography variant="caption" className="text-subtle">
                    Line {item.line ?? '—'} · Gen {item.generation ?? '—'}
                    {callName ? ` · ${callName}` : ''}
                  </Typography>
                </View>
                {selected ? <Ionicons name="checkmark-circle" size={20} color="#C4A35A" /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Typography variant="caption" className="p-4 text-center text-subtle">
              No dogs match your search.
            </Typography>
          }
        />
      </View>
    </View>
  );
}

function mapDog(row: Record<string, unknown>): BreedingDog {
  return {
    id: String(row.id),
    name: String(row.name),
    sex: (row.sex as string | null) ?? null,
    date_of_birth: (row.date_of_birth as string | null) ?? null,
    father_id: (row.father_id as string | null) ?? null,
    mother_id: (row.mother_id as string | null) ?? null,
    line: (row.line as BreedingLine | null) ?? null,
    generation: (row.generation as number | null) ?? null,
    breeding_role: (row.breeding_role as BreedingDog['breeding_role']) ?? null,
    urgency_flag: Boolean(row.urgency_flag),
    health_dcm1: (row.health_dcm1 as BreedingDog['health_dcm1']) ?? null,
    health_dcm2: (row.health_dcm2 as BreedingDog['health_dcm2']) ?? null,
    health_dcm3: (row.health_dcm3 as BreedingDog['health_dcm3']) ?? null,
    health_dcm4: (row.health_dcm4 as BreedingDog['health_dcm4']) ?? null,
    health_dcm5: (row.health_dcm5 as BreedingDog['health_dcm5']) ?? null,
    health_hd: (row.health_hd as BreedingDog['health_hd']) ?? null,
    health_ed: (row.health_ed as BreedingDog['health_ed']) ?? null,
    holter_date: (row.holter_date as string | null) ?? null,
    holter_result: (row.holter_result as BreedingDog['holter_result']) ?? null,
    wrights_coi: (row.wrights_coi as number | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    origin_pairing_id: (row.origin_pairing_id as string | null) ?? null,
    status: String(row.status ?? 'keep'),
    call_name: (row.call_name as string | null) ?? null,
  } as BreedingDog & { call_name?: string | null };
}

export const AddTrialSheet = forwardRef<AddTrialSheetHandle, AddTrialSheetProps>(function AddTrialSheet(
  { onSaved, addTrial, calcCoi },
  ref,
) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['92%'], []);

  const [sires, setSires] = useState<BreedingDog[]>([]);
  const [dams, setDams] = useState<BreedingDog[]>([]);
  const [loadingDogs, setLoadingDogs] = useState(false);
  const [sireId, setSireId] = useState<string | null>(null);
  const [damId, setDamId] = useState<string | null>(null);
  const [line, setLine] = useState<'A' | 'B' | 'Cross' | ''>('');
  const [generation, setGeneration] = useState('1');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [coiLoading, setCoiLoading] = useState(false);
  const [coiPreview, setCoiPreview] = useState<CoiResult | null>(null);

  const reset = useCallback(() => {
    setSireId(null);
    setDamId(null);
    setLine('');
    setGeneration('1');
    setTargetDate('');
    setNotes('');
    setCoiPreview(null);
    setCoiLoading(false);
  }, []);

  const loadDogs = useCallback(async () => {
    setLoadingDogs(true);
    try {
      const sb = requireSupabase();
      const [sireRes, damRes] = await Promise.all([
        sb
          .from('dogs')
          .select(BREEDING_DOG_SELECT)
          .eq('sex', 'male')
          .in('status', [...PLANNER_MALE_FILTER])
          .in('breeding_role', [...PLANNER_SIRE_ROLES])
          .order('name'),
        sb
          .from('dogs')
          .select(BREEDING_DOG_SELECT)
          .eq('sex', 'female')
          .in('status', [...PLANNER_FEMALE_FILTER])
          .in('breeding_role', [...PLANNER_DAM_ROLES])
          .order('name'),
      ]);
      if (sireRes.error) throw sireRes.error;
      if (damRes.error) throw damRes.error;
      setSires((sireRes.data ?? []).map((r) => mapDog(r as Record<string, unknown>)));
      setDams((damRes.data ?? []).map((r) => mapDog(r as Record<string, unknown>)));
    } catch (e) {
      console.error('[AddTrialSheet.loadDogs]', e);
      setSires([]);
      setDams([]);
    } finally {
      setLoadingDogs(false);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    open: () => {
      reset();
      void loadDogs();
      sheetRef.current?.present();
    },
  }));

  useEffect(() => {
    if (!sireId || !damId) {
      setCoiPreview(null);
      setCoiLoading(false);
      return;
    }
    let cancelled = false;
    setCoiLoading(true);
    void calcCoi(sireId, damId).then((result) => {
      if (!cancelled) {
        setCoiPreview(result);
        setCoiLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [sireId, damId, calcCoi]);

  const canSave = Boolean(sireId && damId && line);

  const handleSave = async () => {
    if (!canSave || !sireId || !damId || !line) return;
    setSaving(true);
    try {
      await addTrial({
        sire_id: sireId,
        dam_id: damId,
        line,
        trial_generation: Number(generation),
        target_date: targetDate.trim() || null,
        notes: notes.trim() || null,
        coi_estimate: coiPreview?.coi ?? null,
      });
      sheetRef.current?.dismiss();
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const coiBadge = coiPreview ? coiBadgeClasses(coiPreview.severity) : null;

  return (
    <BottomSheetModal ref={sheetRef} snapPoints={snapPoints} enablePanDownToClose backgroundStyle={{ backgroundColor: '#1C1A0E' }}>
      <BottomSheetScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <Typography variant="subtitle" className="mb-1 text-gold">
          Add Trial Pairing
        </Typography>
        <Typography variant="caption" className="mb-4 text-subtle">
          Sandbox pairing — not committed to the breeding programme until promoted.
        </Typography>

        {loadingDogs ? (
          <ActivityIndicator color="#C4A35A" className="mb-4" />
        ) : (
          <>
            <DogPicker label="Sire" dogs={sires} selectedId={sireId} onSelect={setSireId} />
            <DogPicker label="Dam" dogs={dams} selectedId={damId} onSelect={setDamId} />
          </>
        )}

        <ChipGroup
          label="Line"
          value={line}
          onChange={(v) => setLine(v as 'A' | 'B' | 'Cross')}
          options={[
            { value: 'A', label: 'A' },
            { value: 'B', label: 'B' },
            { value: 'Cross', label: 'Cross' },
          ]}
        />
        <ChipGroup
          label="Generation"
          value={generation}
          onChange={setGeneration}
          options={[1, 2, 3, 4, 5].map((g) => ({ value: String(g), label: `Gen ${g}` }))}
        />

        {Platform.OS === 'web' ? (
          <View className="mb-4">
            <Typography variant="caption" className="mb-2 text-silver">
              Target Date (optional)
            </Typography>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full rounded-xl border border-gold/20 bg-surface px-4 py-3 text-ink"
            />
          </View>
        ) : (
          <Input
            label="Target Date (optional)"
            placeholder="YYYY-MM-DD"
            value={targetDate}
            onChangeText={setTargetDate}
            autoCapitalize="none"
          />
        )}

        <View className="mb-4">
          <Typography variant="caption" className="mb-2 text-silver">
            Notes (optional)
          </Typography>
          <BottomSheetTextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Trial notes…"
            placeholderTextColor="#9E9E9E"
            multiline
            numberOfLines={3}
            className="min-h-[88px] rounded-xl border border-gold/20 bg-surface px-4 py-3 font-body text-base text-ink"
          />
        </View>

        {sireId && damId ? (
          <View className="mb-4 rounded-xl border border-gold/20 bg-black-rich p-3">
            {coiLoading ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#C4A35A" />
                <Typography variant="caption" className="text-subtle">
                  Calculating COI…
                </Typography>
              </View>
            ) : coiPreview && coiBadge ? (
              <Typography variant="body" className={coiBadge.text}>
                🧬 COI: {coiPreview.coi}% — {coiSeverityLabel(coiPreview.severity)}
              </Typography>
            ) : (
              <Typography variant="caption" className="text-subtle">
                COI could not be calculated — check pedigree data.
              </Typography>
            )}
          </View>
        ) : null}

        <Button label="Save Trial Pairing" onPress={() => void handleSave()} loading={saving} disabled={!canSave} fullWidth />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
