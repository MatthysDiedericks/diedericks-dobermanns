// Invite a buyer to the portal with a magic-link sign-in. Never generates a password.
// Admin JWT required. Email sends only on this invocation (Matt's click).
//
// Deploy: supabase functions deploy invite-to-portal
// Secrets: RESEND_API_KEY (shared). SUPABASE_URL / SERVICE_ROLE_KEY injected.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const SITE = (Deno.env.get('SITE_URL') ?? 'https://diedericksdobermanns.com').replace(/\/$/, '');
const FROM = 'Diedericks Dobermanns <no-reply@diedericksdobermanns.com>';

const INVITE_MAX = 10;
const INVITE_WINDOW_SECS = 3600;

type Source = 'application' | 'waiting_list' | 'client';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || 'there';
}

function waDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/[^\d]/g, '');
  if (!d) return null;
  if (d.startsWith('0') && d.length === 10) d = `27${d.slice(1)}`;
  return d;
}

function confirmUrl(tokenHash: string, email: string): string {
  const params = new URLSearchParams({
    token_hash: tokenHash,
    type: 'magiclink',
    next: '/portal',
    email,
  });
  return `${SITE}/portal/auth/confirm?${params.toString()}`;
}

function whatsappMessage(fullName: string, link: string): string {
  return (
    `Hi ${firstName(fullName)}, here is your private link to your Diedericks Dobermanns account — ` +
    `tap it and you are in, no password needed. You will be able to see your puppy's photos, ` +
    `weights and paperwork.\n\n${link}`
  );
}

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sendInviteMail(to: string, fullName: string, link: string): Promise<string | null> {
  if (!RESEND_API_KEY) return 'RESEND_API_KEY not set';
  const name = firstName(fullName);
  const html = `
    <div style="font-family:Georgia,serif;background:#111008;color:#F5F0E8;padding:32px;">
      <div style="max-width:560px;margin:0 auto;background:#1C1A0E;padding:32px;border:1px solid #C4A35A33;">
        <h1 style="color:#C4A35A;font-size:14px;letter-spacing:0.18em;text-transform:uppercase;">
          Your private portal link
        </h1>
        <p>Hi ${name},</p>
        <p>Here is your private link to your Diedericks Dobermanns account. Tap it on your phone and you are in — no password needed.</p>
        <p style="margin:28px 0;">
          <a href="${link}" style="display:inline-block;background:#C4A35A;color:#111008;text-decoration:none;padding:14px 22px;letter-spacing:0.12em;text-transform:uppercase;font-size:13px;">
            Open your account
          </a>
        </p>
        <p style="font-size:12px;word-break:break-all;color:#F5F0E8;">${link}</p>
        <p style="margin-top:32px;font-size:12px;color:#C4A35A99;">Diedericks Dobermanns</p>
      </div>
    </div>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to,
      subject: 'Your Diedericks Dobermanns account — tap to open',
      html,
    }),
  });
  if (!res.ok) return `Resend ${res.status}`;
  return null;
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
    return json({ error: 'Function not configured' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: actor },
  } = await userClient.auth.getUser();
  if (!actor) return json({ error: 'Unauthorized' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: profile } = await admin
    .from('users')
    .select('id, role, full_name, email')
    .eq('id', actor.id)
    .maybeSingle();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return json({ error: 'Forbidden' }, 403);
  }

  let body: {
    email?: string;
    fullName?: string;
    phone?: string | null;
    source?: Source;
    sourceId?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request' }, 422);
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const fullName = (body.fullName ?? '').trim() || 'there';
  const source = body.source;
  if (!email.includes('@') || !source || !['application', 'waiting_list', 'client'].includes(source)) {
    return json({ error: 'Invalid request' }, 422);
  }

  const key = await sha256Hex(`portal_invite:${email}`);
  const { data: allowed } = await admin.rpc('check_rate_limit', {
    p_action: 'portal_invite',
    p_key: key,
    p_max: INVITE_MAX,
    p_window_seconds: INVITE_WINDOW_SECS,
    p_hit: true,
  });
  if (allowed === false) {
    return json({ error: 'Too many invites to this address just now. Try again shortly.' }, 429);
  }

  let userId: string | null = null;
  const { data: existing } = await admin.from('users').select('id').ilike('email', email).maybeSingle();
  if (existing?.id) {
    userId = existing.id;
    await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  } else {
    const created = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    userId = created.data.user?.id ?? null;
    if (!userId) {
      const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      userId = listed.data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    }
    if (!userId) {
      await admin.from('error_events').insert({
        code: 'INVITE_UNHANDLED',
        area: 'auth',
        severity: 'error',
        message: created.error?.message ?? 'createUser failed',
        actor_role: 'admin',
        actor_id: actor.id,
        surface: 'app',
        route: '/invite-to-portal',
      });
      return json({ error: 'Could not prepare the account.' }, 500);
    }
  }

  const generated = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${SITE}/portal/auth/confirm` },
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
    await admin.from('error_events').insert({
      code: 'INVITE_UNHANDLED',
      area: 'auth',
      severity: 'error',
      message: generated.error?.message ?? 'no token',
      actor_role: 'admin',
      actor_id: actor.id,
      surface: 'app',
      route: '/invite-to-portal',
    });
    return json({ error: 'Could not create the sign-in link.' }, 500);
  }

  const link = confirmUrl(tokenHash, email);
  const invitedAt = new Date().toISOString();
  const { data: row } = await admin
    .from('portal_invites')
    .insert({
      email,
      user_id: userId,
      invited_by: actor.id,
      invited_at: invitedAt,
      source,
      source_id: body.sourceId ?? null,
    })
    .select('id')
    .maybeSingle();

  await admin.from('audit_log').insert({
    table_name: 'portal_invites',
    record_id: row?.id ?? userId,
    action: 'insert',
    actor_id: actor.id,
    actor_email: actor.email ?? profile.email,
    actor_role: 'admin',
    new_values: { email, source, source_id: body.sourceId ?? null, user_id: userId },
  });

  const mailErr = await sendInviteMail(email, fullName, link);
  if (mailErr) {
    await admin.from('error_events').insert({
      code: 'INVITE_SEND_FAILED',
      area: 'auth',
      severity: 'error',
      message: mailErr,
      actor_role: 'admin',
      actor_id: actor.id,
      surface: 'app',
      route: '/invite-to-portal',
    });
  }

  const digits = waDigits(body.phone);
  const message = whatsappMessage(fullName, link);
  return json({
    link,
    invitedAt,
    emailSent: !mailErr,
    whatsappMessage: message,
    waUrl: digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null,
    error: mailErr ? 'Link ready — the email did not send. Use WhatsApp.' : undefined,
  });
});
