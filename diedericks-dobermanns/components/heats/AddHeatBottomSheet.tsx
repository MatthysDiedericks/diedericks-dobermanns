import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useAddHeatCycle } from '@/hooks/useHeatCycles';
import { parseDateInput, showError } from '@/lib/dogDetail/feedback';
import { requireSupabase } from '@/lib/supabase';

export interface AddHeatBottomSheetHandle {
  open: () => void;
  close: () => void;
}

interface AddHeatBottomSheetProps {
  onSaved: () => void;
}

export const AddHeatBottomSheet = forwardRef<AddHeatBottomSheetHandle, AddHeatBottomSheetProps>(
  function AddHeatBottomSheet({ onSaved }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['70%'], []);
    const addHeat = useAddHeatCycle();

    const [females, setFemales] = useState<{ id: string; name: string }[]>([]);
    const [dogId, setDogId] = useState('');
    const [heatStart, setHeatStart] = useState(new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const loadFemales = useCallback(async () => {
      const { data, error } = await requireSupabase()
        .from('dogs')
        .select('id, name')
        .eq('sex', 'female')
        .eq('status', 'keep')
        .order('name');
      if (error) {
        showError(error.message);
        setFemales([]);
        return;
      }
      const list = (data ?? []) as { id: string; name: string }[];
      setFemales(list);
      if (list.length && !dogId) setDogId(list[0].id);
    }, [dogId]);

    const open = useCallback(() => {
      setHeatStart(new Date().toISOString().slice(0, 10));
      setNotes('');
      void loadFemales();
      sheetRef.current?.present();
    }, [loadFemales]);

    const close = useCallback(() => sheetRef.current?.dismiss(), []);

    useImperativeHandle(ref, () => ({ open, close }), [open, close]);

    useEffect(() => {
      if (females.length && !dogId) setDogId(females[0].id);
    }, [females, dogId]);

    async function onSave() {
      const date = parseDateInput(heatStart);
      if (!dogId || !date) {
        showError('Select a female and enter a valid heat start date.');
        return;
      }
      setSaving(true);
      try {
        await addHeat(dogId, date, { notes: notes.trim() || null, status: 'active' });
        sheetRef.current?.dismiss();
        onSaved();
      } catch (e) {
        showError(e instanceof Error ? e.message : 'Could not save heat cycle.');
      } finally {
        setSaving(false);
      }
    }

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: '#1C1A0E' }}
        handleIndicatorStyle={{ backgroundColor: '#C4A35A' }}
      >
        <BottomSheetScrollView className="px-5 pb-12">
          <Typography variant="subtitle" className="mb-4 text-gold">
            Add Heat Cycle
          </Typography>

          <Typography variant="caption" className="mb-2 text-muted">
            Female *
          </Typography>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {females.map((f) => (
              <Button
                key={f.id}
                label={f.name}
                size="sm"
                variant={dogId === f.id ? 'primary' : 'outline'}
                onPress={() => setDogId(f.id)}
              />
            ))}
            {females.length === 0 ? (
              <Typography variant="caption" className="text-muted">
                No breeding females (status: keep) found.
              </Typography>
            ) : null}
          </View>

          <Typography variant="caption" className="mb-1 text-muted">
            Heat start date *
          </Typography>
          <BottomSheetTextInput
            value={heatStart}
            onChangeText={setHeatStart}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#8C8474"
            className="mb-4 rounded-xl border border-gold/20 bg-[#111008] px-4 py-3 font-body text-ink"
          />

          <Typography variant="caption" className="mb-1 text-muted">
            Notes
          </Typography>
          <BottomSheetTextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional"
            placeholderTextColor="#8C8474"
            multiline
            className="mb-6 rounded-xl border border-gold/20 bg-[#111008] px-4 py-3 font-body text-ink"
            style={{ minHeight: 72, textAlignVertical: 'top' }}
          />

          <Button label="Save heat cycle" onPress={() => void onSave()} loading={saving} fullWidth />
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
