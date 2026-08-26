import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import {
  createHealthReminder,
  type HealthReminderKind,
} from '@/hooks/useHealthReminders';
import { useAuthStore } from '@/stores/authStore';

export function RemindMeBlock({
  dogId,
  kind,
  title,
  dueDate,
  onSaved,
}: {
  dogId: string;
  kind: HealthReminderKind;
  title: string;
  dueDate: string | null;
  onSaved: () => void;
}) {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(dueDate?.slice(0, 10) ?? '');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <Button
        label="Remind me"
        variant="ghost"
        size="sm"
        onPress={() => setOpen(true)}
        className="mt-2 self-start"
      />
    );
  }

  return (
    <View className="mt-3 rounded-xl border border-gold/25 bg-black-rich p-3">
      <Typography variant="caption" className="mb-2 text-subtle">
        Shown on your health list. Nothing is sent automatically.
      </Typography>
      <DateField label="Remind me on" value={date} onChange={setDate} />
      <Input label="Note (optional)" value={note} onChangeText={setNote} />
      {error ? <Typography variant="caption">{error}</Typography> : null}
      <View className="mt-2 flex-row gap-3">
        <Button
          label="Save reminder"
          size="sm"
          loading={busy}
          onPress={async () => {
            if (!userId) return;
            setBusy(true);
            const res = await createHealthReminder({
              clientId: userId,
              dogId,
              kind,
              title,
              dueDate: date,
              note,
            });
            setBusy(false);
            if (res.error) {
              setError(res.error);
              return;
            }
            setOpen(false);
            onSaved();
          }}
        />
        <Button label="Cancel" variant="ghost" size="sm" onPress={() => setOpen(false)} />
      </View>
    </View>
  );
}
