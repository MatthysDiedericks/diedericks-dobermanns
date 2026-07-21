/**
 * Typed wrappers for calling Supabase Edge Functions from the mobile app.
 * All calls use the anon key — functions use the service role key server-side.
 */
import { supabase } from '@/lib/supabase';

export async function callCreateVideoRoom(bookingId: string): Promise<{
  clientUrl: string;
  hostUrl: string;
}> {
  if (!supabase) throw new Error('Backend not configured');
  const { data, error } = await supabase.functions.invoke('create-video-room', {
    body: { bookingId },
  });
  if (error) throw new Error(error.message);
  return data as { clientUrl: string; hostUrl: string };
}

export interface NotifyPayload {
  userId: string;
  title: string;
  body: string;
  type?: 'push' | 'email' | 'whatsapp';
  /** Optional deep-link metadata forwarded to the Edge Function as-is. */
  data?: Record<string, string>;
}

/** Enqueues a notification via the `notify` Edge Function. Returns false on failure (never throws). */
export async function callNotify(payload: NotifyPayload): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.functions.invoke('notify', {
    body: {
      recipientId: payload.userId,
      type: payload.type ?? 'push',
      subject: payload.title,
      body: payload.body,
      data: payload.data,
    },
  });
  if (error) {
    console.error('[callNotify]', error.message);
    return false;
  }
  return true;
}

export async function callSendEmail(payload: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.functions.invoke('send-email', { body: payload });
  if (error) console.error('[callSendEmail]', error.message);
}

export interface CheckDocumentExpiryResult {
  ok: boolean;
  checked: number;
  remindersSent: number;
  failedDocumentIds: string[];
}

/** Manually triggers the document-expiry check (admin "Check Now" button) — same job the daily cron runs. */
export async function callCheckDocumentExpiry(): Promise<CheckDocumentExpiryResult> {
  if (!supabase) throw new Error('Backend not configured');
  const { data, error } = await supabase.functions.invoke('check-document-expiry');
  if (error) throw new Error(error.message);
  return data as CheckDocumentExpiryResult;
}

export async function callSendBroadcast(broadcastId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.functions.invoke('send-broadcast', {
    body: { broadcastId },
  });
  if (error) {
    console.error('[callSendBroadcast]', error.message);
    return false;
  }
  return true;
}
