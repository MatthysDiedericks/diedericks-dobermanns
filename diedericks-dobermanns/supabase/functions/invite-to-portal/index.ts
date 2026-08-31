// Invite a buyer to the portal. 6-digit code + click-to-open link. No password.
// WhatsApp is the send path. Email only when Matt asks (sendEmail / sendEmailOnly).
// Deploy: supabase functions deploy invite-to-portal

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
const TTL_DAYS = 7;

type Source = 'application' | 'waiting_list' | 'client' | 'member';

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

function confirmUrl(inviteId: string): string {
  return `${SITE}/portal/auth/confirm?invite=${encodeURIComponent(inviteId)}`;
}

function verifyUrl(email: string): string {
  return `${SITE}/portal/verify-code?email=${encodeURIComponent(email)}`;
}

function expiryLabel(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Johannesburg',
  });
}

function whatsappMessage(fullName: string, email: string, link: string, code: string, expiresAt: string): string {
  return (
    `Hi ${firstName(fullName)}, your Diedericks Dobermanns sign-in code is ${code}. ` +
    `It expires ${expiryLabel(expiresAt)} (${TTL_DAYS} days). ` +
    `Type it at ${verifyUrl(email)} — a mail scanner cannot use a code.\n\n` +
    `Or tap this link and press Sign in to your portal:\n${link}`
  );
}

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sendInviteMail(
  to: string,
  fullName: string,
  link: string,
  code: string,
  expiresAt: string,
  memberHolder?: string,
): Promise<string | null> {
  if (!RESEND_API_KEY) return 'RESEND_API_KEY not set';
  const name = firstName(fullName);
  const holder = memberHolder?.trim() || '';
  const heading = holder ? `${holder} has added you` : 'Your private portal code';
  const intro = holder
    ? `${holder} has added you to their Diedericks Dobermanns portal so you can see the vaccination schedule, upload photos and read training updates.`
    : 'Your sign-in code is:';
  const html = `
    <div style="font-family:Georgia,serif;background:#111008;color:#F5F0E8;padding:32px;">
      <div style="max-width:560px;margin:0 auto;background:#1C1A0E;padding:32px;border:1px solid #C4A35A33;">
        <h1 style="color:#C4A35A;font-size:14px;letter-spacing:0.18em;text-transform:uppercase;">${heading}</h1>
        <p>Hi ${name},</p>
        <p>${intro}</p>
        <p>Your sign-in code is:</p>
        <p style="font-size:28px;letter-spacing:0.24em;color:#C4A35A;">${code}</p>
        <p style="font-size:12px;color:#C4A35A99;">Expires ${expiryLabel(expiresAt)} (${TTL_DAYS} days). Type it at ${verifyUrl(to)}.</p>
        <p>Or open the link and press Sign in to your portal — fetching the page does not sign anyone in.</p>
        <p style="margin:28px 0;">
          <a href="${link}" style="display:inline-block;background:#C4A35A;color:#111008;text-decoration:none;padding:14px 22px;letter-spacing:0.12em;text-transform:uppercase;font-size:13px;">${holder ? 'Open the portal' : 'Sign in to your portal'}</a>
        </p>
        <p style="font-size:12px;word-break:break-all;color:#F5F0E8;">${link}</p>
      </div>
    </div>`;
  const subject = holder
    ? `${holder} has added you to their Diedericks Dobermanns portal`
    : `Your Diedericks Dobermanns code is ${code}`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to,
      subject,
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

  let body: {
    email?: string;
    fullName?: string;
    phone?: string | null;
    source?: Source;
    sourceId?: string | null;
    sendEmail?: boolean;
    sendEmailOnly?: boolean;
    link?: string;
    code?: string;
    expiresAt?: string;
    holderName?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request' }, 422);
  }

  const isAdmin = Boolean(profile && ['admin', 'super_admin'].includes(profile.role));
  if (body.source === 'member') {
    if (!body.sourceId) return json({ error: 'Invalid request' }, 422);
    const { data: membership } = await admin
      .from('portal_members')
      .select('id, account_holder_id')
      .eq('id', body.sourceId)
      .maybeSingle();
    if (!membership || membership.account_holder_id !== actor.id) {
      return json({ error: 'Forbidden' }, 403);
    }
  } else if (!isAdmin) {
    return json({ error: 'Forbidden' }, 403);
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const fullName = (body.fullName ?? '').trim() || 'there';
  if (!email.includes('@')) return json({ error: 'Invalid request' }, 422);

  if (body.sendEmailOnly && body.link && body.code && body.expiresAt) {
    const mailErr = await sendInviteMail(email, fullName, body.link, body.code, body.expiresAt);
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
      return json({ error: 'The email did not send. Use WhatsApp.' }, 500);
    }
    return json({ emailSent: true });
  }

  const source = body.source;
  if (!source || !['application', 'waiting_list', 'client', 'member'].includes(source)) {
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
  } else {
    const created = await admin.auth.admin.createUser({
      email,
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

  const inviteId = crypto.randomUUID();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const invitedAt = new Date();
  const expiresAt = new Date(invitedAt.getTime() + TTL_DAYS * 86_400_000);
  const link = confirmUrl(inviteId);
  const codeHash = await sha256Hex(`portal_invite_code:${email}:${code}`);

  const { data: row } = await admin
    .from('portal_invites')
    .insert({
      id: inviteId,
      email,
      user_id: userId,
      invited_by: actor.id,
      invited_at: invitedAt.toISOString(),
      source,
      source_id: body.sourceId ?? null,
      code_hash: codeHash,
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .maybeSingle();

  await admin.from('audit_log').insert({
    table_name: 'portal_invites',
    record_id: row?.id ?? userId,
    action: 'insert',
    actor_id: actor.id,
    actor_email: actor.email ?? profile?.email,
    actor_role: source === 'member' ? 'client' : 'admin',
    new_values: { email, source, source_id: body.sourceId ?? null, user_id: userId },
  });

  let mailErr: string | null = null;
  if (body.sendEmail) {
    mailErr = await sendInviteMail(
      email,
      fullName,
      link,
      code,
      expiresAt.toISOString(),
      source === 'member' ? (body.holderName ?? profile?.full_name ?? undefined) : undefined,
    );
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
  }

  const expiresIso = expiresAt.toISOString();
  const message = whatsappMessage(fullName, email, link, code, expiresIso);
  const digits = waDigits(body.phone);
  return json({
    link,
    invitedAt: invitedAt.toISOString(),
    emailSent: Boolean(body.sendEmail) && !mailErr,
    code,
    expiresAt: expiresIso,
    whatsappMessage: message,
    waUrl: digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null,
    error: mailErr ? 'Invite ready — the email did not send. Use WhatsApp.' : undefined,
  });
});
