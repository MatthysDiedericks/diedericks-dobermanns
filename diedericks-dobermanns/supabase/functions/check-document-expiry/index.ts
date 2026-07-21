// Supabase Edge Function: check-document-expiry
//
// Finds documents expiring in exactly 14 days that haven't been reminded
// about yet, and sends one reminder (email + in-app notifications_log row)
// per admin/super_admin user, then marks the document so it isn't reminded
// again for the same expiry.
//
// Two ways this gets called:
//   1. Scheduled — pg_cron (or Supabase Dashboard Cron) invokes this daily.
//      See supabase/migrations/0036_document_expiry_reminders.sql. The
//      Authorization header carries the service-role key directly — treated
//      as a trusted server-to-server call.
//   2. Manual — the "Check Now" button on app/(admin)/documents/index.tsx
//      calls `supabase.functions.invoke('check-document-expiry')`, which
//      forwards the signed-in user's session JWT. That JWT is verified
//      against `users.role` below — non-admins are rejected.
//
// Email sending is inlined here (fetch -> Resend) rather than chaining to the
// `send-email` function, matching the existing pattern in
// supabase/functions/notify and supabase/functions/send-broadcast.
//
// Deploy: supabase functions deploy check-document-expiry
// Secrets: supabase secrets set RESEND_API_KEY=...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL =
  Deno.env.get('FROM_EMAIL') ?? 'Diedericks Dobermanns <noreply@diedericksdobermanns.com>';

/** Reminders fire 2 weeks before expiry_date — mirrors lib/documents/expiry.ts's day-math (whole calendar days). */
const REMINDER_DAYS = 14;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface DocumentRow {
  id: string;
  document_name: string;
  entity_type: string;
  expiry_date: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Date-range match (not exact-timestamp equality) to avoid timezone edge cases. */
function reminderDateRange(now = new Date()): { from: string; to: string } {
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() + REMINDER_DAYS - 1);
  const to = new Date(now);
  to.setUTCDate(to.getUTCDate() + REMINDER_DAYS);
  return { from: isoDate(from), to: isoDate(to) };
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${res.status}`);
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

/** Admin + super_admin — same role definition as public.is_admin() (0002_user_trigger.sql). */
async function adminRecipients(): Promise<{ id: string }[]> {
  const { data, error } = await admin.from('users').select('id').in('role', ['admin', 'super_admin']);
  if (error) throw new Error(`Query recipients failed: ${error.message}`);
  return data ?? [];
}

async function remindForDocument(doc: DocumentRow, recipients: { id: string }[]): Promise<void> {
  const subject = `Document expiring in 2 weeks: ${doc.document_name}`;
  const body = `${doc.document_name} (${doc.entity_type}) expires on ${doc.expiry_date} — 2 weeks from today.`;
  const html = `<p>${body}</p>`;

  for (const recipient of recipients) {
    const { error: logError } = await admin.from('notifications_log').insert({
      recipient_id: recipient.id,
      type: 'document_expiry',
      subject,
      body,
      status: 'sent',
    });
    if (logError) console.error(`[check-document-expiry] log insert failed for ${recipient.id}:`, logError.message);

    try {
      const { data: authUser } = await admin.auth.admin.getUserById(recipient.id);
      const email = authUser?.user?.email;
      if (!email) throw new Error('No email on file');
      await sendEmail(email, subject, html);
    } catch (err) {
      // Never let one failed email abort the batch — log and move on.
      console.error(`[check-document-expiry] email failed for ${recipient.id}:`, String(err));
    }
  }

  const { error: markError } = await admin
    .from('documents')
    .update({ expiry_reminder_sent_at: new Date().toISOString() })
    .eq('id', doc.id);
  if (markError) throw new Error(`Failed to mark reminder sent: ${markError.message}`);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    if (!(await isAuthorized(req))) return json({ error: 'Forbidden' }, 403);

    const { from, to } = reminderDateRange();
    const { data: docs, error: docsError } = await admin
      .from('documents')
      .select('id, document_name, entity_type, expiry_date')
      .not('expiry_date', 'is', null)
      .gte('expiry_date', from)
      .lte('expiry_date', to)
      .is('expiry_reminder_sent_at', null);
    if (docsError) throw new Error(`Query documents failed: ${docsError.message}`);

    const recipients = await adminRecipients();

    let remindersSent = 0;
    const failedDocumentIds: string[] = [];

    for (const doc of (docs ?? []) as DocumentRow[]) {
      try {
        await remindForDocument(doc, recipients);
        remindersSent++;
      } catch (err) {
        // One document failing (e.g. the final mark-as-sent update) must not
        // abort the rest of the batch.
        console.error(`[check-document-expiry] failed for document ${doc.id}:`, String(err));
        failedDocumentIds.push(doc.id);
      }
    }

    return json({ ok: true, checked: (docs ?? []).length, remindersSent, failedDocumentIds });
  } catch (err) {
    console.error('[check-document-expiry] run failed:', String(err));
    return json({ error: String(err) }, 500);
  }
});
