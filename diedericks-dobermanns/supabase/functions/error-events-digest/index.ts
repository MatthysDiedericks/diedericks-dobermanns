// Daily digest of unresolved error_events — Matt / admins only.
// Skip send entirely when there is nothing to report.
// Cron: 0065_error_events.sql (07:00 SAST). Same auth pattern as
// notify-pending-applications.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://diedericksdobermanns.com';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function isAuthorized(req: Request): Promise<boolean> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;
  if (token === SERVICE_ROLE_KEY) return true;
  const { data: userData, error } = await admin.auth.getUser(token);
  if (error || !userData?.user) return false;
  const { data: profile } = await admin
    .from('users')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();
  return profile?.role === 'admin' || profile?.role === 'super_admin';
}

async function adminRecipients(): Promise<{ id: string; email: string }[]> {
  const { data: users, error } = await admin
    .from('users')
    .select('id')
    .in('role', ['admin', 'super_admin']);
  if (error) throw new Error(`Query recipients failed: ${error.message}`);
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

type Row = {
  id: number;
  code: string;
  area: string;
  severity: string;
  message: string | null;
  session_ref: string | null;
  email_domain: string | null;
  detail: { specific_code?: string } | null;
  occurred_at: string;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    if (!(await isAuthorized(req))) return json({ error: 'Forbidden' }, 403);

    const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
    const { data, error } = await admin
      .from('error_events')
      .select('id, code, area, severity, message, session_ref, email_domain, detail, occurred_at')
      .is('resolved_at', null)
      .gte('occurred_at', since)
      .order('occurred_at', { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Row[];
    if (rows.length === 0) {
      return json({ ok: true, events: 0, emailsSent: 0, skipped: 'clean_day' });
    }

    const byCode = new Map<string, Row[]>();
    for (const r of rows) {
      const key = r.detail?.specific_code || r.code;
      const list = byCode.get(key) ?? [];
      list.push(r);
      byCode.set(key, list);
    }

    const lines = [...byCode.entries()]
      .map(([code, list]) => {
        const people = new Set(list.map((e) => e.session_ref || e.email_domain || `id:${e.id}`));
        return `<li><strong>${code}</strong> — ${list.length} event(s), ${people.size} people · ${list[0]?.severity}</li>`;
      })
      .join('');

    const subject = `Error trail — ${rows.length} unresolved in 24h (${byCode.size} codes)`;
    const html = `
      <div style="font-family: Georgia, serif; background:#0b0a08; color:#f5f0e8; padding:24px;">
        <h2 style="color:#c4a35a; letter-spacing: 0.08em; text-transform: uppercase; font-size: 14px;">
          Internal failure digest
        </h2>
        <p>Unresolved error_events in the last 24 hours. Nothing here is sent to clients.</p>
        <ul>${lines}</ul>
        <p style="margin-top:24px;">
          <a href="${SITE_URL}/admin/errors" style="color:#C4A35A;">Open system health →</a>
        </p>
      </div>
    `;

    const recipients = await adminRecipients();
    let emailsSent = 0;
    for (const recipient of recipients) {
      await admin.from('notifications_log').insert({
        recipient_id: recipient.id,
        type: 'email',
        subject,
        body: `${rows.length} unresolved error_events`,
        status: 'sent',
      });
      try {
        await sendEmail(recipient.email, subject, html);
        emailsSent++;
      } catch (err) {
        console.error('[error-events-digest] email failed:', String(err));
      }
    }

    return json({ ok: true, events: rows.length, codes: byCode.size, emailsSent });
  } catch (err) {
    console.error('[error-events-digest] failed:', String(err));
    return json({ error: String(err) }, 500);
  }
});
