import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ScorePicker } from '@/components/dogs/detail/TemperamentDimensionRow';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { getTemperamentGrade } from '@/lib/dogs/breedStandards';
import {
  TEMPERAMENT_DIMENSION_KEYS,
  TEMPERAMENT_DIMENSIONS,
  type TemperamentDimensionKey,
} from '@/lib/dogs/temperamentDimensions';
import { showError } from '@/lib/dogDetail/feedback';
import type { TemperamentScoreInput } from '@/hooks/useDogTemperament';

export interface TemperamentEvaluationSheetHandle {
  open: () => void;
}

interface Props {
  dogId: string;
  onSave: (payload: TemperamentScoreInput) => Promise<void>;
}

const DEFAULT_SCORES = Object.fromEntries(
  TEMPERAMENT_DIMENSION_KEYS.map((k) => [k, 5]),
) as Record<TemperamentDimensionKey, number>;

export const TemperamentEvaluationSheet = forwardRef<TemperamentEvaluationSheetHandle, Props>(
  function TemperamentEvaluationSheet({ dogId, onSave }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['90%'], []);
    const [standard, setStandard] = useState<'fci_ztp' | 'akc_dpca'>('fci_ztp');
    const [scores, setScores] = useState(DEFAULT_SCORES);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const total = TEMPERAMENT_DIMENSION_KEYS.reduce((s, k) => s + scores[k], 0);
    const grade = getTemperamentGrade(total);

    useImperativeHandle(ref, () => ({
      open: () => {
        setScores({ ...DEFAULT_SCORES });
        setNotes('');
        setStandard('fci_ztp');
        sheetRef.current?.present();
      },
    }));

    async function save() {
      setSaving(true);
      try {
        await onSave({
          dog_id: dogId,
          assessed_at: new Date().toISOString().slice(0, 10),
          evaluation_standard: standard,
          nerve_stability: scores.nerve_stability,
          drive_and_energy: scores.drive_and_energy,
          courage: scores.courage,
          hardness: scores.hardness,
          environmental_confidence: scores.environmental_confidence,
          working_willingness: scores.working_willingness,
          social_behavior: scores.social_behavior,
          obedience: scores.obedience,
          notes: notes.trim() || null,
        });
        sheetRef.current?.dismiss();
      } catch (e) {
        showError(e instanceof Error ? e.message : 'Could not save evaluation.');
      } finally {
        setSaving(false);
      }
    }

    return (
      <BottomSheetModal ref={sheetRef} snapPoints={snapPoints} enablePanDownToClose backgroundStyle={{ backgroundColor: '#1C1A0E' }}>
        <BottomSheetScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
          <Typography variant="subtitle" className="mb-4 text-gold">
            New evaluation
          </Typography>
          <View className="mb-4 flex-row gap-2">
            {(['fci_ztp', 'akc_dpca'] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => setStandard(s)}
                className={`rounded-xl border px-3 py-2 ${standard === s ? 'border-gold bg-gold/15' : 'border-gold/20'}`}
              >
                <Typography variant="caption" className={standard === s ? 'text-gold' : 'text-ink-muted'}>
                  {s === 'fci_ztp' ? 'ZTP / FCI-KUSA' : 'AKC/DPCA'}
                </Typography>
              </Pressable>
            ))}
          </View>
          <Typography variant="body" className="mb-4" style={{ color: grade.color }}>
            Total: {total} / 80 · {grade.label.toUpperCase()}
          </Typography>
          {TEMPERAMENT_DIMENSION_KEYS.map((key) => {
            const dim = TEMPERAMENT_DIMENSIONS[key];
            return (
              <View key={key} className="mb-4">
                <Typography variant="caption" className="text-gold">
                  {dim.label}
                  {standard === 'fci_ztp' ? ` · ${dim.labelDE}` : ''}
                </Typography>
                <Typography variant="caption" className="mb-2 text-subtle">
                  {dim.description}
                </Typography>
                <ScorePicker value={scores[key]} onChange={(n) => setScores((prev) => ({ ...prev, [key]: n }))} />
                <Typography variant="caption" className="italic text-subtle">
                  10 = {standard === 'fci_ztp' ? dim.ficGuide : dim.akcGuide}
                </Typography>
              </View>
            );
          })}
          <BottomSheetTextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)"
            placeholderTextColor="#8C8474"
            multiline
            className="mb-4 min-h-[72px] rounded-xl border border-gold/20 bg-surface px-4 py-3 font-body text-ink"
          />
          <Button label="Save evaluation" onPress={() => void save()} loading={saving} fullWidth />
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
