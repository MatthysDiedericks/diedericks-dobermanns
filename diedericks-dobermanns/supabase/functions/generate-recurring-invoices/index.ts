// Generate due recurring invoices as DRAFTS. Never emails a client.
// Notifies admins only that drafts are waiting. Idempotent same-day via SQL.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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
  const { data: users, error } = await admin.from('users').select('id').in('role', ['admin', 'super_admin']);
  if (error) throw new Error(error.message);
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

    const { data, error } = await admin.rpc('generate_due_recurring_invoices');
    if (error) throw new Error(error.message);
    const created = (data ?? []) as { schedule_id: string; invoice_id: string }[];
    if (created.length === 0) return json({ ok: true, created: 0, emailsSent: 0 });

    const subject = `${created.length} recurring invoice draft(s) waiting`;
    const html = `
      <div style="font-family: Georgia, serif; background:#111008; color:#F5F0E8; padding:24px;">
        <h2 style="color:#C4A35A; font-size:14px; letter-spacing:0.08em; text-transform:uppercase;">
          Recurring drafts waiting
        </h2>
        <p>${created.length} draft invoice(s) were generated. Nothing was emailed to a client.</p>
        <p><a href="${SITE_URL}/admin/finance/invoices" style="color:#C4A35A;">Review invoices →</a></p>
      </div>`;

    const recipients = await adminRecipients();
    let emailsSent = 0;
    for (const recipient of recipients) {
      const { error: logError } = await admin.from('notifications_log').insert({
        recipient_id: recipient.id,
        type: 'recurring_invoice_draft',
        subject,
        body: `${created.length} draft invoice(s). Clients were not emailed.`,
        status: 'sent',
      });
      if (logError) console.error('[generate-recurring-invoices] log failed:', logError.message);
      try {
        await sendEmail(recipient.email, subject, html);
        emailsSent++;
      } catch (err) {
        console.error('[generate-recurring-invoices] admin mail failed:', String(err));
      }
    }

    return json({ ok: true, created: created.length, emailsSent });
  } catch (err) {
    console.error('[generate-recurring-invoices] failed:', String(err));
    return json({ error: String(err) }, 500);
  }
});
