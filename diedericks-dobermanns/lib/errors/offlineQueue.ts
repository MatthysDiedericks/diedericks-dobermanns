import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'error_events_offline_queue_v1';
const MAX_QUEUED = 50;

export type QueuedErrorRow = {
  code: string;
  area: string;
  severity: string;
  message: string | null;
  detail: Record<string, unknown> | null;
  surface: string;
  route: string | null;
  actor_role: string | null;
  actor_id: string | null;
  email_domain: string | null;
  session_ref: string | null;
  entity_type: string | null;
  entity_id: string | null;
  queued_at: string;
};

export async function enqueueErrorEvent(row: QueuedErrorRow): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const list: QueuedErrorRow[] = raw ? (JSON.parse(raw) as QueuedErrorRow[]) : [];
    list.push(row);
    while (list.length > MAX_QUEUED) list.shift();
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('[errorQueue] enqueue failed', err);
  }
}

export async function drainErrorEventQueue(
  insert: (row: QueuedErrorRow) => Promise<boolean>,
): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return 0;
    const list = JSON.parse(raw) as QueuedErrorRow[];
    if (!list.length) return 0;

    const remaining: QueuedErrorRow[] = [];
    let flushed = 0;
    for (const row of list) {
      const ok = await insert(row);
      if (ok) flushed += 1;
      else remaining.push(row);
    }
    if (remaining.length) {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    } else {
      await AsyncStorage.removeItem(QUEUE_KEY);
    }
    return flushed;
  } catch (err) {
    console.error('[errorQueue] drain failed', err);
    return 0;
  }
}
