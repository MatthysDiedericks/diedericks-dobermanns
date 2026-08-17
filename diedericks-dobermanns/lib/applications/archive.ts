import { requireSupabase } from '@/lib/supabase';

export const ARCHIVE_REASONS = [
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'spam_or_test', label: 'Spam or test' },
  { value: 'withdrawn_by_applicant', label: 'Withdrawn by applicant' },
  { value: 'no_longer_interested', label: 'No longer interested' },
  { value: 'other', label: 'Other' },
] as const;

export type ArchiveReasonValue = (typeof ARCHIVE_REASONS)[number]['value'];

export interface ArchiveRemainders {
  quoteNumber: string | null;
  dogName: string | null;
  hasWaitlist: boolean;
  hasReservation: boolean;
}

export function remaindersConfirm(r: ArchiveRemainders): string {
  const bits: string[] = [];
  if (r.dogName) bits.push(r.dogName);
  if (r.quoteNumber) bits.push(`quote ${r.quoteNumber}`);
  if (r.hasWaitlist) bits.push('the waiting-list entry');
  if (r.hasReservation) bits.push('the reservation');
  if (bits.length === 0) return 'The contact remains — only the application is filed away.';
  if (bits.length === 1) return `${bits[0]} remains — only the application is filed away.`;
  return `${bits.slice(0, -1).join(', ')} and ${bits[bits.length - 1]} remain — only the application is filed away.`;
}

export async function fetchArchiveRemainders(applicationId: string): Promise<ArchiveRemainders> {
  const supabase = requireSupabase();
  const [quote, waitlist, reservation] = await Promise.all([
    supabase.from('quotes').select('quote_number').eq('application_id', applicationId).limit(1).maybeSingle(),
    supabase
      .from('waiting_list')
      .select('id, assigned_dog_id')
      .eq('application_id', applicationId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('reservations')
      .select('id, dog_id')
      .eq('application_id', applicationId)
      .limit(1)
      .maybeSingle(),
  ]);
  const dogIds = [waitlist.data?.assigned_dog_id, reservation.data?.dog_id].filter(Boolean) as string[];
  let dogName: string | null = null;
  if (dogIds.length) {
    const { data: dog } = await supabase.from('dogs').select('name').in('id', dogIds).limit(1).maybeSingle();
    dogName = dog?.name ?? null;
  }
  return {
    quoteNumber: quote.data?.quote_number ?? null,
    dogName,
    hasWaitlist: Boolean(waitlist.data),
    hasReservation: Boolean(reservation.data),
  };
}

export async function archiveApplication(
  id: string,
  userId: string,
  reason: string,
): Promise<{ error: string | null }> {
  const trimmed = reason.trim();
  if (!trimmed) return { error: 'A reason is required.' };
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('applications')
    .update({
      archived_at: new Date().toISOString(),
      archived_by: userId,
      archived_reason: trimmed,
    } as never)
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function restoreApplication(id: string): Promise<{ error: string | null }> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('applications')
    .update({
      archived_at: null,
      archived_by: null,
      archived_reason: null,
    } as never)
    .eq('id', id);
  return { error: error?.message ?? null };
}
