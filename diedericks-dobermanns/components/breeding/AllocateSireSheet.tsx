import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { previewCoiForDogs } from '@/hooks/useBreedingPlanner';
import { coiColour, type CoiResult } from '@/lib/breeding/coi';
import { checkPairingValidity } from '@/lib/breeding/rules';
import type { PairingWithCoi, PlannerDog } from '@/types/breeding';

export interface AllocateSireSheetHandle {
  open: (female: PlannerDog, males: PlannerDog[], existingPairing?: PairingWithCoi) => void;
  close: () => void;
}

interface AllocateSireSheetProps {
  pairings: PairingWithCoi[];
  onSave: (femaleId: string, sireId: string, line: PlannerDog['line'], existingId?: string) => Promise<void>;
}

export const AllocateSireSheet = forwardRef<AllocateSireSheetHandle, AllocateSireSheetProps>(
  function AllocateSireSheet({ pairings, onSave }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['70%'], []);
    const [female, setFemale] = useState<PlannerDog | null>(null);
    const [males, setMales] = useState<PlannerDog[]>([]);
    const [sireId, setSireId] = useState('');
    const [existingId, setExistingId] = useState<string | undefined>();
    const [coiPreview, setCoiPreview] = useState<CoiResult | null>(null);
    const [validityReason, setValidityReason] = useState('');
    const [saving, setSaving] = useState(false);

    const loadPreview = useCallback(
      async (dam: PlannerDog, sire: PlannerDog) => {
        const validity = checkPairingValidity(sire, dam, { pairings });
        setValidityReason(validity.allowed ? '' : validity.reason);
        const coi = await previewCoiForDogs(sire.id, dam.id);
        setCoiPreview(coi);
      },
      [pairings],
    );

    useImperativeHandle(ref, () => ({
      open: (f, m, existing) => {
        setFemale(f);
        setMales(m);
        setExistingId(existing?.id);
        const initialSire = existing?.sire_id ?? m[0]?.id ?? '';
        setSireId(initialSire);
        setCoiPreview(existing?.coi ?? null);
        setValidityReason('');
        sheetRef.current?.present();
        const sire = m.find((x) => x.id === initialSire);
        if (sire) void loadPreview(f, sire);
      },
      close: () => sheetRef.current?.dismiss(),
    }));

    async function onSelectSire(id: string) {
      setSireId(id);
      if (!female) return;
      const sire = males.find((m) => m.id === id);
      if (sire) await loadPreview(female, sire);
    }

    async function onConfirm() {
      if (!female || !sireId || validityReason) return;
      setSaving(true);
      try {
        const sire = males.find((m) => m.id === sireId);
        await onSave(female.id, sireId, sire?.line ?? female.line ?? 'A', existingId);
        sheetRef.current?.dismiss();
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
            {existingId ? 'Edit pairing for' : 'Assign'} {female?.name ?? '…'}
          </Typography>
          <Typography variant="caption" className="mb-2 text-muted">
            Select sire
          </Typography>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {males.map((m) => (
              <Button
                key={m.id}
                label={m.name}
                size="sm"
                variant={sireId === m.id ? 'primary' : 'outline'}
                onPress={() => void onSelectSire(m.id)}
              />
            ))}
          </View>
          {validityReason ? (
            <Typography variant="caption" className="mb-2 text-danger">
              ✗ {validityReason}
            </Typography>
          ) : (
            <Typography variant="caption" className="mb-2 text-success">
              ✓ Pairing allowed
            </Typography>
          )}
          {coiPreview ? (
            <Typography variant="body" style={{ color: coiColour(coiPreview.severity) }}>
              COI preview: {coiPreview.coi}% — {coiPreview.severity}
            </Typography>
          ) : null}
          <Button
            label={existingId ? 'Update pairing' : 'Save pairing'}
            onPress={() => void onConfirm()}
            loading={saving}
            disabled={!sireId || Boolean(validityReason)}
            fullWidth
            className="mt-6"
          />
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
