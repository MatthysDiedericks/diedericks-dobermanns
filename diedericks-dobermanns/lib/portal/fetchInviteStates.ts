import { ERROR_CODES } from '@/lib/errors/codes';
import { logError } from '@/lib/errors/logError';
import { requireSupabase } from '@/lib/supabase';

import type { InviteStateRow } from '@/lib/portal/invite';

export type InviteStateMap = Map<string, InviteStateRow> & { failed: boolean };

function emptyMap(failed: boolean): InviteStateMap {
  const map = new Map<string, InviteStateRow>() as InviteStateMap;
  map.failed = failed;
  return map;
}

/** Same diagnostic as the website: name the session before blaming is_admin(). */
export async function fetchInviteStates(emails: string[]): Promise<InviteStateMap> {
  const unique = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (unique.length === 0) return emptyMap(false);

  const supabase = requireSupabase();
  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData.user ?? null;
  let usersRole: string | null = null;
  if (authUser?.id) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .maybeSingle();
    usersRole = profile?.role ?? null;
  }

  const { data, error } = await supabase.rpc('portal_invite_states', {
    p_emails: unique,
  });
  if (error) {
    await logError({
      code: ERROR_CODES.ADMIN_QUERY_FAILED,
      area: 'admin',
      message: 'Invite states could not be loaded',
      detail: {
        postgres: error.message,
        postgres_code: error.code,
        auth_user_present: Boolean(authUser),
        auth_user_id: authUser?.id ?? null,
        users_role: usersRole,
      },
      route: '/admin/invite',
      actorRole: 'admin',
      actorId: authUser?.id ?? null,
    });
    return emptyMap(true);
  }

  const map = emptyMap(false);
  for (const row of (data ?? []) as InviteStateRow[]) {
    map.set(row.email.toLowerCase(), row);
  }
  return map;
}
