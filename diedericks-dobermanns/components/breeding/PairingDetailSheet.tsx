import { BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { coiColour } from '@/lib/breeding/coi';
import type { PairingWithCoi } from '@/types/breeding';

export interface PairingDetailSheetHandle {
  open: (pairing: PairingWithCoi) => void;
  close: () => void;
}

interface PairingDetailSheetProps {
  onRecordMating: (pairingId: string, date: string) => Promise<void>;
  onRecordLitter: (pairingId: string) => void;
}

export const PairingDetailSheet = forwardRef<PairingDetailSheetHandle, PairingDetailSheetProps>(
  function PairingDetailSheet({ onRecordMating, onRecordLitter }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['65%'], []);
    const [pairing, setPairing] = useState<PairingWithCoi | null>(null);
    const [matingDate, setMatingDate] = useState(new Date().toISOString().slice(0, 10));
    const [saving, setSaving] = useState(false);

    useImperativeHandle(ref, () => ({
      open: (p) => {
        setPairing(p);
        sheetRef.current?.present();
      },
      close: () => sheetRef.current?.dismiss(),
    }));

    const onSaveMating = useCallback(async () => {
      if (!pairing) return;
      setSaving(true);
      try {
        await onRecordMating(pairing.id, matingDate);
        sheetRef.current?.dismiss();
      } finally {
        setSaving(false);
      }
    }, [pairing, matingDate, onRecordMating]);

    if (!pairing) return null;

    const sireName = pairing.sire?.name ?? 'Sire';
    const damName = pairing.dam?.name ?? 'Dam';
    const color = coiColour(pairing.coi.severity);

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: '#1C1A0E' }}
        handleIndicatorStyle={{ backgroundColor: '#C4A35A' }}
      >
        <BottomSheetScrollView className="px-5 pb-12">
          <Typography variant="subtitle" className="mb-2 text-gold">
            {sireName} × {damName}
          </Typography>
          <Typography variant="caption" className="mb-3" style={{ color }}>
            COI {pairing.coi.coi}% · {pairing.coi.severity.toUpperCase()}
          </Typography>
          <Typography variant="body" className="mb-4 text-subtle">
            {pairing.coi.explanation}
          </Typography>
          <Typography variant="caption" className="mb-1 text-muted">
            Status: {pairing.status} · Priority: {pairing.priority}
          </Typography>
          {pairing.notes ? (
            <Typography variant="caption" className="mb-4 text-subtle">
              {pairing.notes}
            </Typography>
          ) : null}

          {pairing.status === 'Planned' ? (
            <>
              <Typography variant="caption" className="mb-1 text-muted">
                Mating date
              </Typography>
              <BottomSheetTextInput
                value={matingDate}
                onChangeText={setMatingDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#8C8474"
                className="mb-4 rounded-xl border border-gold/20 bg-[#111008] px-4 py-3 font-body text-ink"
              />
              <Button label="Record Mating" onPress={() => void onSaveMating()} loading={saving} fullWidth />
            </>
          ) : null}

          {pairing.status === 'Active' ? (
            <Button
              label="Record Litter"
              onPress={() => {
                sheetRef.current?.dismiss();
                onRecordLitter(pairing.id);
              }}
              fullWidth
              className="mt-2"
            />
          ) : null}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
