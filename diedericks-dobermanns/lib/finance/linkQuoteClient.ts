import { requireSupabase } from '@/lib/supabase';

/**
 * When raising a quote from an application, attach a confirmed portal account
 * by exact lowercased email. Never links on an unconfirmed address or a name.
 */
export async function resolveClientForApplicationQuote(
  applicationId: string | null | undefined,
  existingClientId: string | null | undefined,
): Promise<{
  clientId: string | null;
  historicalName: string | null;
}> {
  if (!applicationId) {
    return { clientId: existingClientId ?? null, historicalName: null };
  }

  const supabase = requireSupabase();
  const { data: app, error } = await supabase
    .from('applications')
    .select('id, email, full_name, user_id')
    .eq('id', applicationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!app) {
    return { clientId: existingClientId ?? null, historicalName: null };
  }

  let clientId = existingClientId ?? app.user_id ?? null;

  if (!clientId && app.email?.trim()) {
    const { data: resolved, error: resolveErr } = await supabase.rpc(
      'resolve_confirmed_user_id' as never,
      { p_email: app.email.trim().toLowerCase() } as never,
    );
    if (resolveErr) throw new Error(resolveErr.message);
    clientId = (resolved as string | null) ?? null;
  }

  if (clientId && !app.user_id) {
    const { error: linkErr } = await supabase
      .from('applications')
      .update({ user_id: clientId })
      .eq('id', applicationId)
      .is('user_id', null);
    if (linkErr) throw new Error(linkErr.message);
  }

  return {
    clientId,
    historicalName: clientId ? null : app.full_name,
  };
}
