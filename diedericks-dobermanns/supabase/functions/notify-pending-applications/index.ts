// Supabase Edge Function: notify-pending-applications
//
// Daily digest — for every application still `status = 'submitted'`, emails
// all admin/super_admin users a single list (with age in days) so nothing
// sits unreviewed. Reminders stop as soon as an application's status changes
// away from 'submitted'.
//
// Idempotency: applications reminded within the last 20 hours are skipped,
// so a duplicate run in the same day (manual retry, cron double-fire)
// cannot spam the same digest twice. `last_reminder_sent_at` /
// `reminder_count` (0044_client_portal_and_application_alerts.sql) track
// this per application, and are still updated even for applications that
// don't end up in *this* run's digest (there are none — every 'submitted'
// row not already reminded within 20h is included).
//
// Mail: reuses the existing `send-email` Edge Function via HTTP (Resend
// lives behind that one function only — no second mail path here).
//
// Two ways this gets called, matching check-document-expiry:
//   1. Scheduled — pg_cron invokes this daily at 07:00 SAST. See
//      0045_notify_pending_applications_cron.sql. The Authorization header
//      carries the service-role key directly (trusted server-to-server).
//   2. Manual — an admin action could call this via
//      `supabase.functions.invoke('notify-pending-applications')`, forwarding
//      the signed-in user's JWT, verified against `users.role` below.
//
// Deploy: supabase functions deploy notify-pending-applications

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://diedericksdobermanns.com';

/** Applications reminded more recently than this are skipped (guards double-runs). */
const REMINDER_COOLDOWN_HOURS = 20;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface PendingApplication {
  id: string;
  full_name: string;
  created_at: string;
  last_reminder_sent_at: string | null;
  reminder_count: number;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function ageInDays(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
}

/** Service-role callers (cron) are trusted directly; everything else must be a signed-in admin/super_admin. */
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

/** Admin + super_admin — same role definition as public.is_admin(). */
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

/** Reuses the existing send-email Edge Function — never a second mail path. */
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

function digestHtml(apps: PendingApplication[]): string {
  const rows = apps
    .map(
      (a) =>
        `<li><strong>${a.full_name}</strong> — ${ageInDays(a.created_at)} day(s) old — ` +
        `<a href="${SITE_URL}/admin/applications/${a.id}">Review →</a></li>`,
    )
    .join('');
  return `
    <div style="font-family: Georgia, serif; background:#0b0a08; color:#f5f0e8; padding:24px;">
      <h2 style="color:#c4a35a; letter-spacing: 0.08em; text-transform: uppercase; font-size: 14px;">
        Applications Awaiting Review
      </h2>
      <ul>${rows}</ul>
    </div>
  `;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    if (!(await isAuthorized(req))) return json({ error: 'Forbidden' }, 403);

    const cutoff = new Date(Date.now() - REMINDER_COOLDOWN_HOURS * 3_600_000).toISOString();
    const { data: pending, error: appsError } = await admin
      .from('applications')
      .select('id, full_name, created_at, last_reminder_sent_at, reminder_count')
      .eq('status', 'submitted')
      .is('archived_at', null)
      .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${cutoff}`)
      .order('created_at');
    if (appsError) throw new Error(`Query applications failed: ${appsError.message}`);

    const apps = (pending ?? []) as PendingApplication[];
    if (apps.length === 0) {
      return json({ ok: true, pending: 0, emailsSent: 0 });
    }

    const recipients = await adminRecipients();
    const oldest = Math.max(...apps.map((a) => ageInDays(a.created_at)));
    const subject = `${apps.length} application(s) awaiting review — oldest ${oldest} days`;
    const html = digestHtml(apps);

    let emailsSent = 0;
    for (const recipient of recipients) {
      const { error: logError } = await admin.from('notifications_log').insert({
        recipient_id: recipient.id,
        type: 'application_reminder',
        subject,
        body: `${apps.length} application(s) still awaiting review.`,
        status: 'sent',
      });
      if (logError) {
        console.error(`[notify-pending-applications] log insert failed for ${recipient.id}:`, logError.message);
      }
      try {
        await sendEmail(recipient.email, subject, html);
        emailsSent++;
      } catch (err) {
        // Never let one failed email abort the batch — log and move on.
        console.error(`[notify-pending-applications] email failed for ${recipient.id}:`, String(err));
      }
    }

    // Mark all pending applications as reminded, regardless of per-recipient
    // email outcome — the digest was attempted for this batch.
    const now = new Date().toISOString();
    for (const app of apps) {
      const { error: markError } = await admin
        .from('applications')
        .update({ last_reminder_sent_at: now, reminder_count: app.reminder_count + 1 })
        .eq('id', app.id);
      if (markError) {
        console.error(`[notify-pending-applications] failed to mark ${app.id}:`, markError.message);
      }
    }

    return json({ ok: true, pending: apps.length, emailsSent });
  } catch (err) {
    console.error('[notify-pending-applications] run failed:', String(err));
    return json({ error: String(err) }, 500);
  }
});
