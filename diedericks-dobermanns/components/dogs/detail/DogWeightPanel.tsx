import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { SectionCard } from '@/components/dogs/detail/SectionCard';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import {
  BREED_STANDARDS,
  evalWeight,
  statusColor,
  type BreedStandard,
} from '@/lib/dogs/breedStandards';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { formatKennelDate, formatWeight } from '@/lib/kennel/formatters';
import { requireSupabase } from '@/lib/supabase';
import type { Dog } from '@/types/app.types';

interface DogWeightPanelProps {
  dog: Dog;
  canEdit: boolean;
  onSaved: () => void;
}

export function DogWeightPanel({ dog, canEdit, onSaved }: DogWeightPanelProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['40%'], []);
  const [latestKg, setLatestKg] = useState<number | null>(null);
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [kgInput, setKgInput] = useState('');
  const [saving, setSaving] = useState(false);

  const standard = (dog.standard ?? 'fci_kusa') as BreedStandard;
  const sex = dog.sex === 'male' ? 'male' : 'female';
  const weightRange = sex === 'male' ? BREED_STANDARDS[standard].weightMale : BREED_STANDARDS[standard].weightFemale;
  const weightEval = latestKg != null ? evalWeight(latestKg, standard, sex) : null;

  const loadLatest = useCallback(async () => {
    const { data } = await requireSupabase()
      .from('weight_logs')
      .select('weight_kg, recorded_date, recorded_at')
      .eq('dog_id', dog.id)
      .is('session', null)
      .order('recorded_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setLatestKg(Number(data.weight_kg));
      setLatestDate(data.recorded_date ?? data.recorded_at?.slice(0, 10) ?? null);
    } else {
      setLatestKg(null);
      setLatestDate(null);
    }
  }, [dog.id]);

  useEffect(() => {
    void loadLatest();
  }, [loadLatest]);

  async function saveWeight() {
    const kg = parseFloat(kgInput.replace(',', '.'));
    if (!Number.isFinite(kg) || kg <= 0) {
      showError('Enter a valid weight in kg.');
      return;
    }
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await requireSupabase().from('weight_logs').insert({
        dog_id: dog.id,
        weight_kg: Math.round(kg * 1000) / 1000,
        recorded_date: today,
        recorded_at: new Date().toISOString(),
        session: null,
      });
      if (error) throw new Error(error.message);
      showSaved();
      sheetRef.current?.dismiss();
      setKgInput('');
      await loadLatest();
      onSaved();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not log weight.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SectionCard title="Weight tracking">
        {latestKg != null ? (
          <>
            <Typography variant="body" className="text-gold">
              Latest: {formatWeight(latestKg)}
              {latestDate ? ` (${formatKennelDate(latestDate)})` : ''}
            </Typography>
            <Typography variant="caption" className="mt-1 text-subtle">
              Standard range: {weightRange.min}–{weightRange.max} kg ({sex})
            </Typography>
            {weightEval ? (
              <Typography variant="caption" style={{ color: statusColor(weightEval.status) }}>
                {weightEval.label}
              </Typography>
            ) : null}
          </>
        ) : (
          <Typography variant="caption" className="text-subtle">
            No adult weight logged yet.
          </Typography>
        )}
        {canEdit ? (
          <Pressable onPress={() => sheetRef.current?.present()} className="mt-3">
            <Typography variant="label" className="text-gold">
              + Log Weight
            </Typography>
          </Pressable>
        ) : null}
      </SectionCard>
      {canEdit ? (
        <BottomSheetModal ref={sheetRef} snapPoints={snapPoints} enablePanDownToClose backgroundStyle={{ backgroundColor: '#1C1A0E' }}>
          <BottomSheetScrollView contentContainerStyle={{ padding: 24 }}>
            <Typography variant="subtitle" className="mb-4 text-gold">
              Log weight
            </Typography>
            <BottomSheetTextInput
              value={kgInput}
              onChangeText={setKgInput}
              keyboardType="decimal-pad"
              placeholder="kg e.g. 40.2"
              placeholderTextColor="#8C8474"
              className="mb-4 rounded-xl border border-gold/20 bg-surface px-4 py-3 font-body text-ink"
            />
            <Button label="Save weight" onPress={() => void saveWeight()} loading={saving} fullWidth />
          </BottomSheetScrollView>
        </BottomSheetModal>
      ) : null}
    </>
  );
}
