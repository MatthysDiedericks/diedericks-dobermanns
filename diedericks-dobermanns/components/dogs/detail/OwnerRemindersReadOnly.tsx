import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { dueWording } from '@/lib/dogs/healthCalendar';
import { formatKennelDate } from '@/lib/kennel/formatters';
import { requireSupabase } from '@/lib/supabase';
import type { HealthReminder } from '@/hooks/useHealthReminders';

export function OwnerRemindersReadOnly({ dogId }: { dogId: string }) {
  const [rows, setRows] = useState<HealthReminder[]>([]);

  const load = useCallback(async () => {
    const supabase = requireSupabase();
    const { data } = await supabase
      .from('health_reminders' as never)
      .select('id, client_id, dog_id, kind, title, due_date, note, is_done')
      .eq('dog_id', dogId)
      .order('due_date', { ascending: true });
    setRows((data ?? []) as HealthReminder[]);
  }, [dogId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View className="mb-6">
      <Typography variant="label" className="mb-2 text-gold">
        OWNER REMINDERS
      </Typography>
      <Typography variant="caption" className="mb-3 text-subtle">
        The client&apos;s notes — read only.
      </Typography>
      {rows.length === 0 ? (
        <Typography variant="bodyMuted">The owner has not set any reminders.</Typography>
      ) : (
        rows.map((r) => (
          <View key={r.id} className="mb-2 rounded-xl border border-dashed border-gold/40 bg-surface p-3">
            <Typography variant="caption" className="text-gold">
              SET BY THE OWNER
            </Typography>
            <Typography variant="body" className="mt-1">
              {r.title}
            </Typography>
            <Typography variant="caption" className="mt-1 text-muted">
              Due {formatKennelDate(r.due_date)}
              {r.is_done ? ' · Done' : dueWording(r.due_date) ? ` · ${dueWording(r.due_date)}` : ''}
            </Typography>
            {r.note ? (
              <Typography variant="caption" className="mt-1">
                {r.note}
              </Typography>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}
