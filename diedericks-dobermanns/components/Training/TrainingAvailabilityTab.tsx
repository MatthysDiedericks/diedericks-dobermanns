import { useState } from 'react';
import { View } from 'react-native';

import { AddBookingSheet } from '@/components/Training/AddBookingSheet';
import { AvailabilitySlot } from '@/components/Training/AvailabilitySlot';
import { useAdminAvailability, useSessionTypes } from '@/hooks/useTraining';
import {
  createAvailability,
  deleteAvailability,
  useSubmitting,
  type AvailabilityInput,
} from '@/hooks/useMutations';

export function TrainingAvailabilityTab() {
  const { data: slots, refetch } = useAdminAvailability();
  const { data: types } = useSessionTypes(false);
  const { submitting, run } = useSubmitting();

  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [typeId, setTypeId] = useState<string | null>(null);
  const [max, setMax] = useState('1');
  const [notes, setNotes] = useState('');

  async function add() {
    if (!date.trim() || !start.trim() || !end.trim()) return;
    const input: AvailabilityInput = {
      available_date: date.trim(),
      start_time: start.trim(),
      end_time: end.trim(),
      session_type_id: typeId,
      max_bookings: Number(max) || 1,
      notes: notes.trim() || null,
    };
    const { error } = await run(() => createAvailability(input));
    if (!error) {
      setDate('');
      setStart('');
      setEnd('');
      setNotes('');
      await refetch();
    }
  }

  return (
    <View className="px-6">
      <AddBookingSheet
        date={date}
        start={start}
        end={end}
        typeId={typeId}
        max={max}
        notes={notes}
        types={types}
        submitting={submitting}
        onDateChange={setDate}
        onStartChange={setStart}
        onEndChange={setEnd}
        onTypeIdChange={setTypeId}
        onMaxChange={setMax}
        onNotesChange={setNotes}
        onSubmit={add}
      />

      <View className="gap-2">
        {slots.map((s) => (
          <AvailabilitySlot
            key={s.id}
            slot={s}
            typeName={types.find((t) => t.id === s.session_type_id)?.name ?? 'Any type'}
            onDelete={async () => {
              await run(() => deleteAvailability(s.id));
              await refetch();
            }}
          />
        ))}
      </View>
    </View>
  );
}
