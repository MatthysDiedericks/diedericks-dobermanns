import { requireSupabase } from '@/lib/supabase';

function emailDomain(email: string): string {
  const at = email.trim().lastIndexOf('@');
  if (at < 0) return 'unknown';
  return email.trim().slice(at + 1).toLowerCase() || 'unknown';
}

/**
 * Logs a failed signup attempt without PII beyond the email domain.
 * Never stores the password or the full address.
 */
export async function logSignupFailure(opts: {
  errorCode: string;
  email: string;
}): Promise<void> {
  try {
    const client = requireSupabase();
    const { error } = await client.from('signup_failures').insert({
      error_code: opts.errorCode.slice(0, 120),
      email_domain: emailDomain(opts.email).slice(0, 120),
    });
    if (error) console.error('[logSignupFailure]', error.message);
  } catch (err) {
    console.error('[logSignupFailure]', err);
  }
}
