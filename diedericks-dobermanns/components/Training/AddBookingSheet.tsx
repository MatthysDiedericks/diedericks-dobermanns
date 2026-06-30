import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import type { TrainingSessionType } from '@/types/app.types';

export function AddBookingSheet({
  date,
  start,
  end,
  typeId,
  max,
  notes,
  types,
  submitting,
  onDateChange,
  onStartChange,
  onEndChange,
  onTypeIdChange,
  onMaxChange,
  onNotesChange,
  onSubmit,
}: {
  date: string;
  start: string;
  end: string;
  typeId: string | null;
  max: string;
  notes: string;
  types: TrainingSessionType[];
  submitting: boolean;
  onDateChange: (v: string) => void;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onTypeIdChange: (id: string | null) => void;
  onMaxChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Card className="mb-4">
      <Typography variant="subtitle" className="mb-3">Add a slot</Typography>
      <Input
        label="Date (YYYY-MM-DD)"
        value={date}
        onChangeText={onDateChange}
        autoCapitalize="none"
        placeholder="2026-07-01"
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input label="Start (HH:MM)" value={start} onChangeText={onStartChange} autoCapitalize="none" placeholder="09:00" />
        </View>
        <View className="flex-1">
          <Input label="End (HH:MM)" value={end} onChangeText={onEndChange} autoCapitalize="none" placeholder="10:00" />
        </View>
      </View>
      <Typography variant="label" className="mb-2">Session type (optional)</Typography>
      <View className="mb-3 flex-row flex-wrap gap-2">
        <Pressable
          onPress={() => onTypeIdChange(null)}
          className={`rounded-xl border px-3 py-2 ${typeId === null ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'}`}
        >
          <Typography variant="caption" className={typeId === null ? 'text-gold' : 'text-ink-muted'}>Any</Typography>
        </Pressable>
        {types.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => onTypeIdChange(t.id)}
            className={`rounded-xl border px-3 py-2 ${typeId === t.id ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'}`}
          >
            <Typography variant="caption" className={typeId === t.id ? 'text-gold' : 'text-ink-muted'}>
              {t.name}
            </Typography>
          </Pressable>
        ))}
      </View>
      <Input label="Max bookings" value={max} onChangeText={onMaxChange} keyboardType="number-pad" />
      <Input label="Notes (optional)" value={notes} onChangeText={onNotesChange} />
      <Button label="Add Slot" onPress={onSubmit} loading={submitting} fullWidth />
    </Card>
  );
}
