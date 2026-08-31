import { requireSupabase } from '@/lib/supabase';
import { inviteToPortal } from '@/lib/portal/invite';

export type PortalMemberRow = {
  id: string;
  invited_email: string;
  full_name: string;
  relationship: string | null;
  status: 'pending' | 'active' | 'revoked';
  can_view_financials: boolean;
  invited_at: string;
  accepted_at: string | null;
};

export const FINANCIAL_TOGGLE_COPY =
  'When on, this person can see invoices, quotes, payments, proof of payment and the contract. Off by default — a handler or adult child often should not see the purchase price.';

export const MEMBER_CAP = 2;

const SELECT =
  'id, invited_email, full_name, relationship, status, can_view_financials, invited_at, accepted_at';

export async function fetchPortalMembers(holderId: string): Promise<PortalMemberRow[]> {
  const { data, error } = await requireSupabase()
    .from('portal_members')
    .select(SELECT)
    .eq('account_holder_id', holderId)
    .neq('status', 'revoked')
    .order('invited_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PortalMemberRow[];
}

export async function invitePortalMember(input: {
  holderId: string;
  holderName: string;
  fullName: string;
  email: string;
  relationship: string;
  canViewFinancials: boolean;
}): Promise<{ error?: string }> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  if (!fullName) return { error: 'Enter their name.' };
  if (!email.includes('@')) return { error: 'That email does not look valid.' };

  const supabase = requireSupabase();
  const { data: existing, error: existingErr } = await supabase
    .from('portal_members')
    .select('id, status')
    .eq('account_holder_id', input.holderId)
    .eq('invited_email', email)
    .maybeSingle();
  if (existingErr) return { error: existingErr.message };

  let memberId = existing?.id as string | undefined;
  if (existing && existing.status !== 'revoked') {
    return { error: 'That person is already on your portal.' };
  }

  if (existing?.status === 'revoked') {
    const { error } = await supabase
      .from('portal_members')
      .update({
        full_name: fullName,
        relationship: input.relationship.trim() || null,
        can_view_financials: input.canViewFinancials,
        status: 'pending',
        member_user_id: null,
        accepted_at: null,
        revoked_at: null,
        revoked_by: null,
        invited_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { count } = await supabase
      .from('portal_members')
      .select('id', { count: 'exact', head: true })
      .eq('account_holder_id', input.holderId)
      .neq('status', 'revoked');
    if ((count ?? 0) >= MEMBER_CAP) {
      return { error: 'You can add at most two people to your portal.' };
    }
    const inserted = await supabase
      .from('portal_members')
      .insert({
        account_holder_id: input.holderId,
        invited_email: email,
        full_name: fullName,
        relationship: input.relationship.trim() || null,
        can_view_financials: input.canViewFinancials,
        status: 'pending',
      })
      .select('id')
      .maybeSingle();
    if (inserted.error || !inserted.data) {
      return { error: inserted.error?.message ?? 'Could not add them.' };
    }
    memberId = inserted.data.id as string;
  }

  if (!memberId) return { error: 'Could not add them.' };

  const issued = await inviteToPortal({
    email,
    fullName,
    source: 'member',
    sourceId: memberId,
    sendEmail: true,
    holderName: input.holderName,
  });
  if ('error' in issued && issued.error && !('link' in issued)) {
    return { error: issued.error };
  }
  return {};
}

export async function resendPortalMemberInvite(input: {
  memberId: string;
  holderName: string;
}): Promise<{ error?: string }> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('portal_members')
    .select('id, invited_email, full_name, status')
    .eq('id', input.memberId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data || data.status === 'revoked') return { error: 'That person is not on your portal.' };
  const issued = await inviteToPortal({
    email: data.invited_email as string,
    fullName: data.full_name as string,
    source: 'member',
    sourceId: data.id as string,
    sendEmail: true,
    holderName: input.holderName,
  });
  if ('error' in issued && issued.error && !('link' in issued)) {
    return { error: issued.error };
  }
  return {};
}

export async function setPortalMemberFinancials(
  memberId: string,
  canViewFinancials: boolean,
): Promise<{ error?: string }> {
  const { error } = await requireSupabase()
    .from('portal_members')
    .update({ can_view_financials: canViewFinancials })
    .eq('id', memberId);
  if (error) return { error: error.message };
  return {};
}

export async function revokePortalMember(memberId: string, holderId: string): Promise<{ error?: string }> {
  const { error } = await requireSupabase()
    .from('portal_members')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: holderId,
    })
    .eq('id', memberId);
  if (error) return { error: error.message };
  return {};
}
