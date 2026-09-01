// Exchange an invite code for a hashed_token. A scanner cannot consume a code.
// Deploy: supabase functions deploy redeem-portal-invite

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SITE = (Deno.env.get('SITE_URL') ?? 'https://diedericksdobermanns.com').replace(/\/$/, '');

type FailReason = 'wrong-code' | 'expired' | 'used' | 'no-invite';

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

function reasonFromDiagnose(row: {
  exists?: boolean;
  expires_at?: string | null;
  code_redeemed_at?: string | null;
  invited_at?: string | null;
} | null): FailReason {
  if (!row || row.exists === false) return 'no-invite';
  if (row.exists !== true && !row.invited_at) return 'no-invite';
  if (row.code_redeemed_at) return 'used';
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return 'expired';
  return 'wrong-code';
}

function userMessage(reason: FailReason): string {
  if (reason === 'used') return 'This code has already been used — ask Matt for a new one.';
  if (reason === 'expired') return 'That invite has expired. Ask Matt for a new one.';
  if (reason === 'no-invite') return 'No invite was issued for this email. Ask Matt for one.';
  return 'That code is not right. Check the digits and try again.';
}

function logCode(reason: FailReason): string {
  if (reason === 'used') return 'INVITE_USED';
  if (reason === 'wrong-code') return 'INVITE_CODE_WRONG';
  if (reason === 'no-invite') return 'INVITE_NONE_ISSUED';
  return 'INVITE_EXPIRED';
}

function logMessage(reason: FailReason): string {
  if (reason === 'used') return 'Invite already used';
  if (reason === 'expired') return 'Invite has expired';
  if (reason === 'no-invite') return 'No portal invite has been issued for this email';
  return 'Invite code did not match';
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
    const { data: diag } = await admin.rpc('portal_invite_diagnose', { p_email: email });
    const d = (Array.isArray(diag) ? diag[0] : diag) as {
      exists?: boolean;
      expires_at?: string | null;
      code_redeemed_at?: string | null;
    } | null;
    const reason = reasonFromDiagnose(d);
    if (reason !== 'no-invite') {
      await admin.rpc('portal_invite_record_failure', {
        p_email: email,
        p_reason: reason,
      });
    }
    await admin.from('error_events').insert({
      code: logCode(reason),
      area: 'auth',
      severity: 'error',
      message: logMessage(reason),
      detail: { reason },
      actor_role: 'anon',
      surface: 'app',
      route: '/redeem-portal-invite',
      email_domain: email.split('@')[1] ?? null,
    });
    return json({ error: userMessage(reason) }, 400);
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
  if (row.id) {
    await admin
      .from('portal_invites')
      .update({ code_redeemed_at: new Date().toISOString() })
      .eq('id', row.id);
  }
  return json({ tokenHash });
});
