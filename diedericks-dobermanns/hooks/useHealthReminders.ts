import { useCallback, useEffect, useMemo, useState } from 'react';

import { dueFlags } from '@/lib/dogs/healthCalendar';
import { requireSupabase } from '@/lib/supabase';

export type HealthReminderKind = 'vaccination' | 'deworming' | 'vet_visit' | 'other';

export type HealthReminder = {
  id: string;
  client_id: string;
  dog_id: string;
  kind: HealthReminderKind;
  title: string;
  due_date: string;
  note: string | null;
  is_done: boolean;
  done_at?: string | null;
};

const SELECT = 'id, client_id, dog_id, kind, title, due_date, note, is_done, done_at';

function mapRow(row: Record<string, unknown>): HealthReminder {
  return {
    id: String(row.id),
    client_id: String(row.client_id),
    dog_id: String(row.dog_id),
    kind: row.kind as HealthReminderKind,
    title: String(row.title),
    due_date: String(row.due_date),
    note: (row.note as string | null) ?? null,
    is_done: Boolean(row.is_done),
    done_at: (row.done_at as string | null) ?? null,
  };
}

export function reminderDueItems(rows: HealthReminder[]): HealthReminder[] {
  return rows.filter((r) => {
    if (r.is_done) return false;
    const flags = dueFlags(r.due_date);
    return flags.isUpcoming || flags.isOverdue;
  });
}

export async function createHealthReminder(input: {
  clientId: string;
  dogId: string;
  kind: HealthReminderKind;
  title: string;
  dueDate: string;
  note?: string;
}): Promise<{ error?: string }> {
  const client = requireSupabase();
  const { error } = await client.from('health_reminders' as never).insert({
    client_id: input.clientId,
    dog_id: input.dogId,
    kind: input.kind,
    title: input.title.trim(),
    due_date: input.dueDate,
    note: input.note?.trim() || null,
    created_by: input.clientId,
  } as never);
  return error ? { error: error.message } : {};
}

export async function markHealthReminderDone(
  id: string,
  clientId: string,
): Promise<{ error?: string }> {
  const client = requireSupabase();
  const { error } = await client
    .from('health_reminders' as never)
    .update({ is_done: true, done_at: new Date().toISOString() } as never)
    .eq('id', id)
    .eq('client_id', clientId);
  return error ? { error: error.message } : {};
}

/** Owner-set reminders for this client. Always filtered by userId. */
export function useHealthReminders(userId: string) {
  const [reminders, setReminders] = useState<HealthReminder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setReminders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const client = requireSupabase();
    const { data, error } = await client
      .from('health_reminders' as never)
      .select(SELECT)
      .eq('client_id', userId)
      .order('due_date', { ascending: true });
    if (error) {
      setReminders([]);
    } else {
      setReminders((data ?? []).map((r) => mapRow(r as Record<string, unknown>)));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const due = useMemo(() => reminderDueItems(reminders), [reminders]);

  return { reminders, due, loading, refresh };
}
