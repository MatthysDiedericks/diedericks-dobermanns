import { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useUpdateHeatCycle } from '@/hooks/useHeatCycles';
import {
  PREGNANCY_STATUS_OPTIONS,
  type HeatCycleRecord,
} from '@/lib/heats/constants';
import { formatDueBasis, type WhelpWindow } from '@/lib/dogs/whelpDates';
import { formatKennelDate } from '@/lib/kennel/formatters';

const CLOSING = new Set([
  'not_pregnant',
  'false_pregnancy',
  'loss_early',
  'loss_late',
  'loss_unspecified',
]);

export function PregnancyControl({
  cycle,
  whelp,
  onSaved,
}: {
  cycle: HeatCycleRecord;
  whelp: WhelpWindow;
  onSaved: () => void;
}) {
  const update = useUpdateHeatCycle();
  const [status, setStatus] = useState(cycle.pregnancy_status ?? 'not_yet_known');
  const [notes, setNotes] = useState(cycle.pregnancy_notes ?? '');
  const [reason, setReason] = useState(cycle.cancelled_reason ?? '');
  const [saving, setSaving] = useState(false);

  const save = async (litterAction: 'keep' | 'cancel_expected' = 'keep') => {
    if (CLOSING.has(status) && !reason.trim()) {
      Alert.alert('Reason required', 'Record why this cycle is closing.');
      return;
    }
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        pregnancy_status: status,
        pregnancy_notes: notes.trim() || null,
      };
      if (status === 'pregnant') patch.status = 'confirmed_pregnant';
      if (CLOSING.has(status)) {
        patch.status = 'no_outcome';
        patch.cancelled_reason = reason.trim();
        if (litterAction === 'cancel_expected' && cycle.resulting_litter_id) {
          patch.resulting_litter_id = null;
        }
      }
      await update(cycle.id, patch);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const onPressSave = () => {
    if (CLOSING.has(status) && cycle.resulting_litter_id) {
      Alert.alert(
        'Expected litter linked',
        'This will not silently delete the expected litter. Keep it, or mark it cancelled?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Keep litter', onPress: () => void save('keep') },
          {
            text: 'Cancel litter',
            style: 'destructive',
            onPress: () => void save('cancel_expected'),
          },
        ],
      );
      return;
    }
    void save('keep');
  };

  return (
    <View className="mb-4">
      <Typography variant="subtitle" className="mb-3 text-gold">
        Pregnancy
      </Typography>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {PREGNANCY_STATUS_OPTIONS.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => setStatus(o.value)}
            className={`rounded-full border px-3 py-1.5 ${
              status === o.value ? 'border-gold bg-gold/15' : 'border-gold/20'
            }`}
          >
            <Typography variant="caption">{o.label}</Typography>
          </Pressable>
        ))}
      </View>

      {status === 'pregnant' ? (
        <View className="mb-3 rounded-xl border border-gold/30 bg-gold/10 p-3">
          <Typography variant="body">
            {formatKennelDate(whelp.earliest)} – {formatKennelDate(whelp.latest)}
          </Typography>
          <Typography variant="caption" className="mt-1 text-muted">
            {formatDueBasis(whelp, formatKennelDate)}
          </Typography>
          {cycle.go_home_earliest ? (
            <Typography variant="caption" className="mt-1 text-gold">
              Go home {formatKennelDate(cycle.go_home_earliest)}
            </Typography>
          ) : null}
        </View>
      ) : null}

      {CLOSING.has(status) ? (
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Reason (required)"
          placeholderTextColor="#8C8474"
          className="mb-3 rounded-xl border border-gold/20 bg-[#111008] px-4 py-3 font-body text-ink"
        />
      ) : null}

      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes"
        placeholderTextColor="#8C8474"
        className="mb-3 rounded-xl border border-gold/20 bg-[#111008] px-4 py-3 font-body text-ink"
      />
      <Button label="Save pregnancy" onPress={onPressSave} loading={saving} fullWidth />
    </View>
  );
}
