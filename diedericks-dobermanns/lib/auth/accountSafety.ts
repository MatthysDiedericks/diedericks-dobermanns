import { supabase } from '@/lib/supabase';

export type AuthResult = { error: string | null };

const DEMO_ERROR =
  'Authentication requires a connected backend. Add Supabase credentials to .env.';

export async function changePasswordWithCurrent(
  current: string,
  next: string,
): Promise<AuthResult> {
  if (!supabase) return { error: DEMO_ERROR };
  const { data: sessionData } = await supabase.auth.getSession();
  const email = sessionData.session?.user?.email;
  if (!email) return { error: 'Not signed in.' };
  if (current.trim()) {
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: current });
    if (authErr) return { error: 'Current password is incorrect.' };
  }
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: error.message };
  await supabase.auth.signOut({ scope: 'others' });
  return { error: null };
}

export async function changeEmailWithCurrent(
  currentPassword: string,
  nextEmail: string,
): Promise<AuthResult> {
  if (!supabase) return { error: DEMO_ERROR };
  const { data: sessionData } = await supabase.auth.getSession();
  const email = sessionData.session?.user?.email;
  if (!email) return { error: 'Not signed in.' };
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (authErr) return { error: 'Current password is incorrect.' };
  const { error } = await supabase.auth.updateUser({ email: nextEmail.trim().toLowerCase() });
  return { error: error?.message ?? null };
}
