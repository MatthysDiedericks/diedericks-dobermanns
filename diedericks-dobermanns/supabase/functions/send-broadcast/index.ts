// Supabase Edge Function: send-broadcast
// Delivers a broadcast_messages row to group members via push (and email if configured).
//
// Deploy: supabase functions deploy send-broadcast
// Body: { broadcastId: string }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function sendPush(token: string, title: string, body: string) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, title, body, sound: 'default' }),
  });
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Diedericks Dobermanns <noreply@diedericksdobermanns.com>',
      to,
      subject,
      html,
    }),
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { broadcastId } = await req.json();
    if (!broadcastId) return json({ error: 'broadcastId required' }, 400);

    const { data: msg, error } = await admin
      .from('broadcast_messages')
      .select('id, group_id, title, body, channels, status')
      .eq('id', broadcastId)
      .single();
    if (error || !msg) return json({ error: 'Broadcast not found' }, 404);
    if (msg.status === 'scheduled') return json({ ok: true, skipped: 'scheduled' });

    let memberIds: string[] = [];
    if (msg.group_id) {
      const { data: members } = await admin
        .from('client_group_members')
        .select('client_id')
        .eq('group_id', msg.group_id);
      memberIds = (members ?? []).map((m: { client_id: string }) => m.client_id);
    } else {
      const { data: clients } = await admin.from('users').select('id').eq('role', 'client');
      memberIds = (clients ?? []).map((c: { id: string }) => c.id);
    }

    const channels = (msg.channels ?? ['push']) as string[];
    let delivered = 0;

    for (const userId of memberIds) {
      const { data: user } = await admin
        .from('users')
        .select('expo_push_token')
        .eq('id', userId)
        .single();

      if (channels.includes('push') && user?.expo_push_token) {
        await sendPush(user.expo_push_token, msg.title, msg.body);
        delivered++;
      }

      if (channels.includes('email')) {
        const { data: authUser } = await admin.auth.admin.getUserById(userId);
        const email = authUser?.user?.email;
        if (email) {
          await sendEmail(
            email,
            msg.title,
            `<p>${msg.body}</p>`,
          );
        }
      }
    }

    await admin
      .from('broadcast_messages')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipient_count: memberIds.length,
      })
      .eq('id', broadcastId);

    return json({ ok: true, recipients: memberIds.length, delivered });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
