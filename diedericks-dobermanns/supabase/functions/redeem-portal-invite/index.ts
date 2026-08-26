// Exchange an invite code for a hashed_token. A scanner cannot consume a code.
// Deploy: supabase functions deploy redeem-portal-invite

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SITE = (Deno.env.get('SITE_URL') ?? 'https://diedericksdobermanns.com').replace(/\/$/, '');

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: 'Function not configured' }, 500);

  let body: { email?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request' }, 422);
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const code = (body.code ?? '').replace(/\s/g, '');
  if (!email.includes('@') || code.length < 6) {
    return json({ error: 'Enter the email and the 6-digit code.' }, 422);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const codeHash = await sha256Hex(`portal_invite_code:${email}:${code}`);
  const { data, error } = await admin.rpc('portal_invite_for_code', {
    p_email: email,
    p_code_hash: codeHash,
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row?.email) {
    const { data: flags } = await admin.rpc('auth_invite_flags', { p_email: email });
    const f = Array.isArray(flags) ? flags[0] : flags;
    const scanner = Boolean(f?.email_confirmed_at && !f?.last_sign_in_at);
    await admin.from('error_events').insert({
      code: scanner ? 'INVITE_SCANNER_CONSUMED' : 'INVITE_EXPIRED_USED',
      area: 'auth',
      severity: 'error',
      message: scanner
        ? 'Invite code failed after email was confirmed without a sign-in'
        : 'Invite code missing or expired',
      actor_role: 'anon',
      surface: 'app',
      route: '/redeem-portal-invite',
    });
    return json({ error: 'That code is not right, or it has expired.' }, 400);
  }

  const generated = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: row.email as string,
    options: { redirectTo: `${SITE}/portal` },
  });
  const tokenHash =
    (generated.data.properties?.hashed_token as string | undefined) ??
    (() => {
      try {
        const link = generated.data.properties?.action_link as string | undefined;
        return link ? new URL(link).searchParams.get('token') : null;
      } catch {
        return null;
      }
    })();
  if (!tokenHash) {
    return json({ error: 'Could not open the account. Ask Matt for a new code.' }, 500);
  }
  return json({ tokenHash });
});
