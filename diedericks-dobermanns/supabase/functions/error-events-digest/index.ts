// Daily digest of open error_events — Matt / admins only.
// Subject counts unresolved errors + criticals. Payments are listed separately.
// Warnings collapse to one line. Send nothing when nothing is wrong and no
// payment arrived. Cron: 0065_error_events.sql (07:00 SAST).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://diedericksdobermanns.com';
const PAYMENT_CODE = 'PAYMENT_PROOF_UPLOADED';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type Row = {
  id: number;
  code: string;
  area: string;
  severity: string;
  message: string | null;
  occurred_at: string;
};

type Group = { code: string; n: number; last: string; message: string | null };

type Body = { preview?: boolean; forceEmpty?: boolean };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function lastSeen(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Johannesburg',
  });
}

function groupByCode(rows: Row[]): Group[] {
  const map = new Map<string, Group>();
  for (const r of rows) {
    const cur = map.get(r.code);
    if (!cur) {
      map.set(r.code, { code: r.code, n: 1, last: r.occurred_at, message: r.message });
      continue;
    }
    cur.n += 1;
    if (r.occurred_at > cur.last) {
      cur.last = r.occurred_at;
      cur.message = r.message;
    }
  }
  return [...map.values()].sort((a, b) => b.last.localeCompare(a.last));
}

function groupLines(groups: Group[]): string {
  return groups
    .map((g) => {
      const msg = g.message ? `<div style="color:#c4b89a;font-size:13px;margin:2px 0 10px;">${esc(g.message)}</div>` : '';
      return `<li style="margin:0 0 8px;"><strong>${g.n} × ${esc(g.code)}</strong> — last seen ${esc(lastSeen(g.last))}${msg}</li>`;
    })
    .join('');
}

function warningHint(rows: Row[]): string {
  const bits: string[] = [];
  if (rows.some((r) => r.code.startsWith('INVITE_') || r.code.startsWith('SIGNIN_'))) {
    bits.push('invite links');
  }
  if (rows.some((r) => r.code.includes('RATE_LIMIT') || r.code.includes('HONEYPOT'))) {
    bits.push('rate limits');
  }
  return bits.length ? ` (${bits.join(', ')})` : '';
}

function renderHtml(opts: {
  open: Group[];
  payments: Group[];
  warningCount: number;
  warningHint: string;
}): string {
  const failures = opts.open.length
    ? `<h3 style="color:#C4A35A;font-family:Cinzel,Georgia,serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Open failures</h3><ul style="padding-left:18px;">${groupLines(opts.open)}</ul>`
    : '';
  const payments = opts.payments.length
    ? `<h3 style="color:#C4A35A;font-family:Cinzel,Georgia,serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Payments received</h3><ul style="padding-left:18px;">${groupLines(opts.payments)}</ul>`
    : '';
  const warnings = opts.warningCount
    ? `<p style="color:#c4b89a;margin-top:20px;">+ ${opts.warningCount} warnings${esc(opts.warningHint)}</p>`
    : '';
  return `
    <div style="font-family:Lato,Georgia,serif;background:#111008;color:#F5F0E8;padding:24px;">
      <h2 style="font-family:Cinzel,Georgia,serif;color:#C4A35A;letter-spacing:0.08em;text-transform:uppercase;font-size:14px;">
        System health
      </h2>
      ${failures}
      ${payments}
      ${warnings}
      <p style="margin-top:24px;">
        <a href="${SITE_URL}/admin/errors" style="color:#C4A35A;">Open system health →</a>
      </p>
    </div>
  `;
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

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    if (!(await isAuthorized(req))) return json({ error: 'Forbidden' }, 403);

    const body = (await req.json().catch(() => ({}))) as Body;
    if (body.forceEmpty) {
      return json({ ok: true, events: 0, emailsSent: 0, skipped: 'clean_day' });
    }

    const dayAgo = new Date(Date.now() - 24 * 3_600_000).toISOString();
    const { data, error } = await admin
      .from('error_events')
      .select('id, code, area, severity, message, occurred_at')
      .is('resolved_at', null)
      .order('occurred_at', { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Row[];
    const payments = rows.filter((r) => r.code === PAYMENT_CODE && r.occurred_at >= dayAgo);
    const warnings = rows.filter((r) => r.severity === 'warning' && r.code !== PAYMENT_CODE);
    const open = rows.filter((r) => r.severity === 'error' || r.severity === 'critical');
    const openGroups = groupByCode(open);
    const paymentGroups = groupByCode(payments);

    if (open.length === 0 && payments.length === 0) {
      return json({ ok: true, events: 0, emailsSent: 0, skipped: 'clean_day' });
    }

    const subject = open.length === 0
      ? 'System health — all clear'
      : `System health — ${open.length} open`;
    const html = renderHtml({
      open: openGroups,
      payments: paymentGroups,
      warningCount: warnings.length,
      warningHint: warningHint(warnings),
    });

    if (body.preview) {
      return json({
        ok: true,
        preview: true,
        subject,
        html,
        events: open.length,
        payments: payments.length,
        warnings: warnings.length,
        emailsSent: 0,
      });
    }

    const recipients = await adminRecipients();
    let emailsSent = 0;
    for (const recipient of recipients) {
      await admin.from('notifications_log').insert({
        recipient_id: recipient.id,
        type: 'email',
        subject,
        body: `${open.length} open · ${payments.length} payments`,
        status: 'sent',
      });
      try {
        await sendEmail(recipient.email, subject, html);
        emailsSent++;
      } catch (err) {
        console.error('[error-events-digest] email failed:', String(err));
      }
    }

    return json({
      ok: true,
      events: open.length,
      payments: payments.length,
      warnings: warnings.length,
      codes: openGroups.length,
      emailsSent,
    });
  } catch (err) {
    console.error('[error-events-digest] failed:', String(err));
    return json({ error: String(err) }, 500);
  }
});
