import { requireSupabase } from '@/lib/supabase';

export type InviteSource = 'application' | 'waiting_list' | 'client';

export type InviteStateRow = {
  email: string;
  has_account: boolean;
  invited_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at?: string | null;
};

export type IssueInviteResult = {
  link: string;
  waUrl: string | null;
  invitedAt: string;
  emailSent: boolean;
  code: string;
  expiresAt: string;
  whatsappMessage: string;
  error?: string;
};

export const INVITE_TTL_DAYS = 7;

function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatInviteExpiry(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-ZA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Johannesburg',
    });
  } catch {
    return iso;
  }
}

export function formatInviteState(row: InviteStateRow | null | undefined): string {
  if (!row) return 'No account';
  if (row.last_sign_in_at) return `Signed in ${shortDate(row.last_sign_in_at)}`;
  if (row.email_confirmed_at) return 'Confirmed, never signed in';
  if (row.has_account && !row.last_sign_in_at) return 'Has account, never signed in';
  if (row.invited_at) return `Invited ${shortDate(row.invited_at)} (not opened)`;
  return 'No account';
}

export function isConfirmedNeverSignedIn(row: InviteStateRow | null | undefined): boolean {
  return Boolean(row?.email_confirmed_at && !row.last_sign_in_at);
}

export function isInvitedNotOpened(row: InviteStateRow | null | undefined): boolean {
  return Boolean(row?.invited_at && !row.last_sign_in_at);
}

export function isInviteStuck(row: InviteStateRow | null | undefined): boolean {
  return isConfirmedNeverSignedIn(row) || isInvitedNotOpened(row);
}

export async function fetchInviteStates(emails: string[]): Promise<Map<string, InviteStateRow>> {
  const map = new Map<string, InviteStateRow>();
  const unique = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (unique.length === 0) return map;
  const { data, error } = await requireSupabase().rpc('portal_invite_states', {
    p_emails: unique,
  });
  if (error) return map;
  for (const row of (data ?? []) as InviteStateRow[]) {
    map.set(row.email.toLowerCase(), row);
  }
  return map;
}

export async function countUnopenedInvites(): Promise<number> {
  const { data, error } = await requireSupabase().rpc('count_unopened_portal_invites');
  if (error || typeof data !== 'number') return 0;
  return data;
}

export async function countConfirmedNeverSignedIn(): Promise<number> {
  const { data, error } = await requireSupabase().rpc('count_confirmed_never_signed_in');
  if (error || typeof data !== 'number') return 0;
  return data;
}

/** Matt's click only. Share sheet first — nothing auto-sends. */
export async function inviteToPortal(input: {
  email: string;
  fullName: string;
  phone?: string | null;
  source: InviteSource;
  sourceId?: string | null;
  sendEmail?: boolean;
}): Promise<IssueInviteResult | { error: string }> {
  const { data, error } = await requireSupabase().functions.invoke('invite-to-portal', {
    body: { ...input, sendEmail: input.sendEmail ?? false },
  });
  if (error) return { error: error.message };
  const row = data as IssueInviteResult | { error?: string };
  if (row && 'link' in row && row.link) return row;
  return { error: (row as { error?: string })?.error ?? 'Could not invite.' };
}

export async function emailPortalInvite(input: {
  email: string;
  fullName: string;
  link: string;
  code: string;
  expiresAt: string;
}): Promise<{ error?: string }> {
  const { data, error } = await requireSupabase().functions.invoke('invite-to-portal', {
    body: { ...input, sendEmailOnly: true, source: 'client' },
  });
  if (error) return { error: error.message };
  const row = data as { error?: string; emailSent?: boolean };
  if (row?.error) return { error: row.error };
  return {};
}

export async function redeemInviteCode(
  email: string,
  code: string,
): Promise<{ tokenHash: string } | { error: string }> {
  const { data, error } = await requireSupabase().functions.invoke('redeem-portal-invite', {
    body: { email, code },
  });
  if (error) return { error: error.message };
  const row = data as { tokenHash?: string; error?: string };
  if (row?.tokenHash) return { tokenHash: row.tokenHash };
  return { error: row?.error ?? 'That code is not right, or it has expired.' };
}
