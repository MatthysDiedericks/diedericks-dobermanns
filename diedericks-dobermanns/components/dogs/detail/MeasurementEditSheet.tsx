import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { BREED_STANDARDS, type BreedStandard } from '@/lib/dogs/breedStandards';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { requireSupabase } from '@/lib/supabase';

export interface MeasurementEditSheetHandle {
  open: () => void;
}

interface Props {
  dogId: string;
  standard: BreedStandard;
  initial: {
    height_cm: number | null;
    body_length_cm: number | null;
    chest_depth_cm: number | null;
    chest_girth_cm: number | null;
  };
  onSaved: () => void;
}

export const MeasurementEditSheet = forwardRef<MeasurementEditSheetHandle, Props>(
  function MeasurementEditSheet({ dogId, standard, initial, onSaved }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['75%'], []);
    const instr = BREED_STANDARDS[standard].measurementInstructions;
    const [height, setHeight] = useState('');
    const [bodyLength, setBodyLength] = useState('');
    const [chestDepth, setChestDepth] = useState('');
    const [chestGirth, setChestGirth] = useState('');
    const [saving, setSaving] = useState(false);

    useImperativeHandle(ref, () => ({
      open: () => {
        setHeight(initial.height_cm != null ? String(initial.height_cm) : '');
        setBodyLength(initial.body_length_cm != null ? String(initial.body_length_cm) : '');
        setChestDepth(initial.chest_depth_cm != null ? String(initial.chest_depth_cm) : '');
        setChestGirth(initial.chest_girth_cm != null ? String(initial.chest_girth_cm) : '');
        sheetRef.current?.present();
      },
    }));

    function parse(v: string): number | null {
      const n = parseFloat(v.replace(',', '.'));
      return Number.isFinite(n) && n > 0 ? n : null;
    }

    async function save() {
      setSaving(true);
      try {
        const { error } = await requireSupabase()
          .from('dogs')
          .update({
            height_cm: parse(height),
            body_length_cm: parse(bodyLength),
            chest_depth_cm: parse(chestDepth),
            chest_girth_cm: parse(chestGirth),
          })
          .eq('id', dogId);
        if (error) throw new Error(error.message);
        showSaved();
        sheetRef.current?.dismiss();
        onSaved();
      } catch (e) {
        showError(e instanceof Error ? e.message : 'Could not save measurements.');
      } finally {
        setSaving(false);
      }
    }

    const fields = [
      { label: 'Withers height (cm)', value: height, set: setHeight, hint: instr.height },
      { label: 'Body length (cm)', value: bodyLength, set: setBodyLength, hint: instr.bodyLength },
      { label: 'Chest depth (cm)', value: chestDepth, set: setChestDepth, hint: instr.chestDepth },
      { label: 'Chest girth (cm)', value: chestGirth, set: setChestGirth, hint: instr.chestGirth },
    ];

    return (
      <BottomSheetModal ref={sheetRef} snapPoints={snapPoints} enablePanDownToClose backgroundStyle={{ backgroundColor: '#1C1A0E' }}>
        <BottomSheetScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
          <Typography variant="subtitle" className="mb-4 text-gold">
            Edit measurements
          </Typography>
          {fields.map((f) => (
            <View key={f.label} className="mb-4">
              <Typography variant="caption" className="mb-1 text-silver">
                {f.label}
              </Typography>
              <BottomSheetTextInput
                value={f.value}
                onChangeText={f.set}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor="#8C8474"
                className="rounded-xl border border-gold/20 bg-surface px-4 py-3 font-body text-ink"
              />
              <Typography variant="caption" className="mt-1 text-subtle">
                {f.hint}
              </Typography>
            </View>
          ))}
          <Button label="Save measurements" onPress={() => void save()} loading={saving} fullWidth />
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
