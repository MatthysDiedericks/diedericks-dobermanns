import { fetchInviteStates } from '@/lib/portal/fetchInviteStates';
import { requireSupabase } from '@/lib/supabase';

export type InviteSource = 'application' | 'waiting_list' | 'client' | 'member';

export type InviteStateRow = {
  email: string;
  has_account: boolean;
  invited_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at?: string | null;
  last_get_at?: string | null;
  opened_at?: string | null;
  last_failed_at?: string | null;
  last_failed_reason?: 'wrong-code' | 'expired' | 'used' | 'no-invite' | null;
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
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Africa/Johannesburg',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function shortWhen(iso: string): string {
  try {
    const d = new Date(iso);
    const time = d.toLocaleString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Africa/Johannesburg',
    });
    const day = d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Africa/Johannesburg',
    });
    const today = new Date().toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Africa/Johannesburg',
    });
    return day === today ? time : `${day} ${time}`;
  } catch {
    return iso.slice(0, 16);
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
  if (row.last_sign_in_at) return `Signed in ${shortWhen(row.last_sign_in_at)}`;
  if (row.last_get_at) return `Link opened ${shortWhen(row.last_get_at)} — not yet signed in`;
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

export function inviteDaysWaiting(
  row: InviteStateRow | null | undefined,
  fallbackIso: string,
): number {
  const iso = row?.invited_at ?? fallbackIso;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function formatCannotGetInState(row: InviteStateRow | null | undefined): string {
  if (row?.last_failed_at && row.last_failed_reason && row.last_failed_reason !== 'no-invite') {
    const tried = shortDate(row.last_failed_at);
    const why =
      row.last_failed_reason === 'wrong-code'
        ? 'wrong code'
        : row.last_failed_reason === 'used'
          ? 'already used'
          : 'expired';
    return `Tried ${tried} — ${why}`;
  }
  if (isConfirmedNeverSignedIn(row)) return 'Confirmed, never signed in';
  if (isInvitedNotOpened(row) && row?.invited_at && !row.last_get_at) {
    return `Invited ${shortDate(row.invited_at)}, never opened`;
  }
  if (!row?.invited_at) return 'No invite ever issued';
  return formatInviteState(row);
}

export type CannotGetInClient = {
  id: string;
  fullName: string;
  email: string;
  daysWaiting: number;
  stateLabel: string;
};

export async function fetchClientsWhoCannotGetIn(): Promise<{
  clients: CannotGetInClient[];
  inviteStatesFailed: boolean;
}> {
  const supabase = requireSupabase();
  const { data: clients, error } = await supabase
    .from('users')
    .select('id, full_name, email, created_at')
    .eq('role', 'client');
  if (error || !clients?.length) return { clients: [], inviteStatesFailed: false };

  const emails = clients.map((c) => c.email ?? '').filter(Boolean);
  const states = await fetchInviteStates(emails);
  if (states.failed) return { clients: [], inviteStatesFailed: true };
  if (emails.length > 0 && states.size === 0) {
    return { clients: [], inviteStatesFailed: false };
  }

  const rows: CannotGetInClient[] = [];
  for (const client of clients) {
    const email = (client.email ?? '').trim().toLowerCase();
    if (!email) continue;
    const state = states.get(email) ?? null;
    const cannotGetIn =
      !state?.last_sign_in_at && (isInviteStuck(state) || !state?.invited_at);
    if (!cannotGetIn) continue;
    rows.push({
      id: client.id,
      fullName: (client.full_name ?? '').trim() || email,
      email,
      daysWaiting: inviteDaysWaiting(state, client.created_at),
      stateLabel: formatCannotGetInState(state),
    });
  }
  rows.sort((a, b) => b.daysWaiting - a.daysWaiting || a.fullName.localeCompare(b.fullName));
  return { clients: rows, inviteStatesFailed: false };
}

export { fetchInviteStates, type InviteStateMap } from '@/lib/portal/fetchInviteStates';

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
  holderName?: string;
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
): Promise<{ tokenHash: string } | { error: string; alreadyRegistered?: boolean }> {
  const { data, error } = await requireSupabase().functions.invoke('redeem-portal-invite', {
    body: { email, code },
  });
  const row = data as { tokenHash?: string; error?: string; alreadyRegistered?: boolean } | null;
  if (row?.tokenHash) return { tokenHash: row.tokenHash };
  if (row?.error) return { error: row.error, alreadyRegistered: row.alreadyRegistered };
  if (error) return { error: error.message };
  return { error: 'That code is not right. Check the digits and try again.' };
}
