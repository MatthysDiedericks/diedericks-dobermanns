// Immediate alert for a short list of critical error_events codes.
// Dedupes: one alert per code per hour, with a count of events in that window.
// Never messages a client — admin recipients only.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://diedericksdobermanns.com';
const ADMIN_WHATSAPP = Deno.env.get('ADMIN_ALERT_WHATSAPP') ?? '';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const IMMEDIATE = new Set([
  'AUTH_SIGNUP_PHANTOM',
  'AUTH_REGISTRATION_BLOCKED',
  'QUOTE_TOTAL_MISMATCH',
  'QUOTE_LINE_DROPPED',
  'SECURITY_AUTH_LOCKOUT',
  'PAYMENT_PROOF_UPLOADED',
  'APPLY_DB_ERROR',
  'APPLY_UNHANDLED',
]);

const RATE_LIMIT_ALERT_AFTER = 20;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function isAuthorized(req: Request): Promise<boolean> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  return Boolean(token) && token === SERVICE_ROLE_KEY;
}

async function adminRecipients(): Promise<{ id: string; email: string }[]> {
  const { data: users } = await admin.from('users').select('id').in('role', ['admin', 'super_admin']);
  const recipients: { id: string; email: string }[] = [];
  for (const u of users ?? []) {
    const { data: authUser } = await admin.auth.admin.getUserById(u.id);
    if (authUser?.user?.email) recipients.push({ id: u.id, email: authUser.user.email });
  }
  return recipients;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, subject, html }),
  });
  if (!res.ok) throw new Error(`send-email failed: ${res.status}`);
}

async function sendWhatsApp(to: string, body: string): Promise<void> {
  if (!to) return;
  await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, body }),
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    if (!(await isAuthorized(req))) return json({ error: 'Forbidden' }, 403);

    const payload = await req.json() as {
      id?: number;
      code?: string;
      area?: string;
      severity?: string;
      message?: string | null;
      session_ref?: string | null;
      email_domain?: string | null;
      entity_type?: string | null;
      entity_id?: string | null;
      route?: string | null;
      surface?: string | null;
    };

    const code = payload.code ?? '';
    const severity = payload.severity ?? 'error';
    const area = payload.area ?? 'other';
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await admin
      .from('error_events')
      .select('id', { count: 'exact', head: true })
      .eq('code', code)
      .gte('occurred_at', hourAgo);

    const allowed =
      IMMEDIATE.has(code) ||
      (area === 'payment' && severity === 'critical') ||
      (code === 'SECURITY_RATE_LIMIT' && (count ?? 0) > RATE_LIMIT_ALERT_AFTER);
    if (!allowed) return json({ ok: true, skipped: 'not_immediate' });

    // Dedup: if we already emailed for this code in the last hour, skip.
    const { data: prior } = await admin
      .from('notifications_log')
      .select('id, created_at, subject')
      .eq('type', 'email')
      .ilike('subject', `ALERT ${code}%`)
      .gte('created_at', hourAgo)
      .limit(1);
    if (prior?.length) {
      return json({ ok: true, skipped: 'deduped', count: count ?? 1 });
    }

    const n = count ?? 1;
    const subject = `ALERT ${code} ×${n} (last hour)`;
    const html = `
      <div style="font-family: Georgia, serif; background:#0b0a08; color:#f5f0e8; padding:24px;">
        <h2 style="color:#c4a35a;">Immediate failure alert</h2>
        <p><strong>${code}</strong> — ${n} occurrence(s) in the last hour.</p>
        <p>${payload.message ?? ''}</p>
        <p>Domain: ${payload.email_domain ?? '—'} · Route: ${payload.route ?? '—'} · Surface: ${payload.surface ?? '—'}</p>
        <p style="margin-top:24px;">
          <a href="${SITE_URL}${code.startsWith('SECURITY_') ? '/admin/security' : '/admin/errors'}" style="color:#C4A35A;">Open ${code.startsWith('SECURITY_') ? 'security log' : 'system health'} →</a>
        </p>
      </div>
    `;
    const waBody = `DD alert: ${code} ×${n}. ${payload.message ?? ''} See ${SITE_URL}/admin/errors`;

    const recipients = await adminRecipients();
    for (const recipient of recipients) {
      await admin.from('notifications_log').insert({
        recipient_id: recipient.id,
        type: 'email',
        subject,
        body: waBody.slice(0, 500),
        status: 'sent',
      });
      try {
        await sendEmail(recipient.email, subject, html);
      } catch (err) {
        console.error('[error-events-alert] email failed:', String(err));
      }
    }

    try {
      await sendWhatsApp(ADMIN_WHATSAPP, waBody);
    } catch (err) {
      console.error('[error-events-alert] whatsapp failed:', String(err));
    }

    return json({ ok: true, alerted: true, count: n });
  } catch (err) {
    console.error('[error-events-alert] failed:', String(err));
    return json({ error: String(err) }, 500);
  }
});
