// Supabase Edge Function: notify
//
// Central notification dispatcher. Two call shapes:
//
//   1. Enqueue (from the app / admin broadcast):
//        { recipientId: '<uuid>' | 'all', type, subject, body }
//      Inserts one notifications_log row per recipient. The DB AFTER INSERT
//      trigger then calls this function again in "deliver" mode.
//
//   2. Deliver (from the DB dispatch trigger):
//        { record: <notifications_log row> }
//      Looks up the recipient's contact details and performs the actual
//      push / email / WhatsApp send, then updates the row's status.
//
// Deploy: supabase functions deploy notify

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const WHATSAPP_API_KEY = Deno.env.get('WHATSAPP_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Diedericks Dobermanns <noreply@diedericksdobermanns.com>';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface LogRow {
  id: string;
  recipient_id: string | null;
  type: 'push' | 'email' | 'whatsapp';
  subject: string | null;
  body: string | null;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// --- Delivery channels ------------------------------------------------------
async function sendPush(token: string, subject: string, body: string) {
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, title: subject, body, sound: 'default' }),
  });
  if (!res.ok) throw new Error(`Expo push failed: ${res.status}`);
}

async function sendEmail(to: string, subject: string, body: string) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');
  const html = `
    <div style="background:#0A0A0A;padding:32px;font-family:Inter,Arial,sans-serif;color:#F5F5F5">
      <h1 style="color:#C4A35A;font-size:20px;letter-spacing:1px;text-transform:uppercase">${subject}</h1>
      <p style="color:#CCCCCC;font-size:16px;line-height:1.6">${body}</p>
      <hr style="border:none;border-top:1px solid rgba(196,163,90,0.3);margin:24px 0" />
      <p style="color:#9E9E9E;font-size:12px">Diedericks Dobermanns — Born With Purpose. Built With Discipline.</p>
    </div>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${res.status}`);
}

async function sendWhatsApp(phone: string, body: string) {
  // Placeholder for WhatsApp Business API (360dialog / Twilio).
  if (!WHATSAPP_API_KEY) throw new Error('WHATSAPP_API_KEY not configured');
  console.log(`[whatsapp] -> ${phone}: ${body}`);
}

// --- Deliver a single stored notification -----------------------------------
async function deliver(record: LogRow): Promise<void> {
  if (!record.recipient_id) return;

  const { data: user } = await admin
    .from('users')
    .select('expo_push_token, phone')
    .eq('id', record.recipient_id)
    .single();

  // `users` has no email column; the address lives on the auth record.
  const { data: authUser } = await admin.auth.admin.getUserById(record.recipient_id);
  const email = authUser?.user?.email ?? null;
  const subject = record.subject ?? 'Diedericks Dobermanns';
  const body = record.body ?? '';

  let status: 'delivered' | 'failed' = 'delivered';
  try {
    if (record.type === 'push') {
      const token = (user as { expo_push_token: string | null } | null)?.expo_push_token;
      if (!token) throw new Error('No push token on file');
      await sendPush(token, subject, body);
    } else if (record.type === 'email') {
      if (!email) throw new Error('No email on file');
      await sendEmail(email, subject, body);
    } else if (record.type === 'whatsapp') {
      const phone = (user as { phone: string | null } | null)?.phone;
      if (!phone) throw new Error('No phone on file');
      await sendWhatsApp(phone, body);
    }
  } catch (err) {
    status = 'failed';
    console.error('Delivery failed:', String(err));
  }

  await admin.from('notifications_log').update({ status }).eq('id', record.id);
}

// --- Enqueue: insert one inbox row per recipient ----------------------------
async function enqueue(input: {
  recipientId: string;
  type: string;
  subject?: string;
  body: string;
}): Promise<number> {
  let recipients: string[] = [];
  if (input.recipientId === 'all') {
    const { data } = await admin
      .from('users')
      .select('id')
      .in('role', ['client', 'trainer']);
    recipients = (data ?? []).map((r: { id: string }) => r.id);
  } else {
    recipients = [input.recipientId];
  }

  if (recipients.length === 0) return 0;
  const rows = recipients.map((rid) => ({
    recipient_id: rid,
    type: input.type ?? 'push',
    subject: input.subject ?? null,
    body: input.body,
    status: 'sent',
  }));
  await admin.from('notifications_log').insert(rows);
  return rows.length;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const payload = await req.json();

    if (payload.record) {
      await deliver(payload.record as LogRow);
      return json({ ok: true, mode: 'deliver' });
    }

    if (payload.recipientId && payload.body) {
      const count = await enqueue(payload);
      return json({ ok: true, mode: 'enqueue', queued: count });
    }

    return json({ error: 'Invalid payload' }, 400);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
