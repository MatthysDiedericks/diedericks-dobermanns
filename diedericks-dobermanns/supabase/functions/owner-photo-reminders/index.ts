// Owner photo cadence reminders — email + notifications_log only. No WhatsApp.
// Once per window. Never again if they have submitted. Never sends condolence.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL =
  Deno.env.get('FROM_EMAIL') ?? 'Diedericks Dobermanns <noreply@diedericksdobermanns.com>';

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

function pronounFor(sex: string | null): 'he' | 'she' | 'they' {
  if (sex === 'female') return 'she';
  if (sex === 'male') return 'he';
  return 'they';
}

function buildCopy(first: string, dog: string, pronoun: 'he' | 'she' | 'they') {
  const obj = pronoun === 'she' ? 'her' : pronoun === 'he' ? 'him' : 'them';
  const grown =
    pronoun === 'she' ? 'she has' : pronoun === 'he' ? 'he has' : 'they have';
  const subject = `How is ${dog}?`;
  const text =
    `Hi ${first},\n\n` +
    `It has been four months since ${dog} went home. How is ${obj}? ` +
    `Send us up to three photos — we would love to see how ${grown} grown.\n\n` +
    `You can upload them in your portal when you have a moment.\n\n` +
    `Matt`;
  const html =
    `<p>Hi ${first},</p>` +
    `<p>It has been four months since ${dog} went home. How is ${obj}? ` +
    `Send us up to three photos — we would love to see how ${grown} grown.</p>` +
    `<p>You can upload them in your portal when you have a moment.</p>` +
    `<p>Matt</p>`;
  return { subject, text, html };
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

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    if (!(await isAuthorized(req))) return json({ error: 'Forbidden' }, 403);

    const { data: dogs, error } = await admin
      .from('dogs')
      .select('id, name, sex, owner_id, buyer_contact_id, status')
      .neq('status', 'deceased')
      .not('owner_id', 'is', null)
      .limit(500);
    if (error) throw new Error(error.message);

    let sent = 0;
    let skippedNoEmail = 0;
    const noEmailNames: string[] = [];

    for (const dog of dogs ?? []) {
      const { data: winRows } = await admin.rpc('owner_photo_window', { p_dog_id: dog.id });
      const win = Array.isArray(winRows) ? winRows[0] : winRows;
      if (!win?.can_upload || (win.photos_in_window ?? 0) > 0) continue;

      const windowKey = String(win.window_open_at ?? '').slice(0, 10);
      if (!windowKey || !dog.owner_id) continue;

      const { data: prior } = await admin
        .from('notifications_log')
        .select('id')
        .eq('recipient_id', dog.owner_id)
        .eq('type', 'owner_photo_reminder')
        .ilike('body', `%[window:${windowKey}]%`)
        .limit(1);
      if ((prior ?? []).length > 0) continue;

      let email: string | null = null;
      let first = 'there';
      if (dog.buyer_contact_id) {
        const { data: c } = await admin
          .from('contacts')
          .select('full_name, email')
          .eq('id', dog.buyer_contact_id)
          .maybeSingle();
        email = c?.email?.trim() || null;
        first = (c?.full_name ?? 'there').split(' ')[0] || 'there';
      }
      if (!email) {
        const { data: u } = await admin
          .from('users')
          .select('full_name, email')
          .eq('id', dog.owner_id)
          .maybeSingle();
        email = u?.email?.trim() || null;
        first = (u?.full_name ?? first).split(' ')[0] || first;
      }

      if (!email) {
        skippedNoEmail++;
        if (first && first !== 'there') noEmailNames.push(`${first} (${dog.name})`);
        continue;
      }

      const copy = buildCopy(first, dog.name, pronounFor(dog.sex));
      const body = `${copy.text}\n\n[window:${windowKey}][dog:${dog.id}]`;

      const { error: logErr } = await admin.from('notifications_log').insert({
        recipient_id: dog.owner_id,
        type: 'owner_photo_reminder',
        subject: copy.subject,
        body,
        status: 'sent',
      });
      if (logErr) {
        console.error('[owner-photo-reminders] log failed', logErr.message);
        continue;
      }

      try {
        await sendEmail(email, copy.subject, copy.html);
        sent++;
      } catch (err) {
        console.error('[owner-photo-reminders] email failed', String(err));
      }
    }

    return json({ ok: true, sent, skippedNoEmail, noEmailNames });
  } catch (err) {
    console.error('[owner-photo-reminders]', String(err));
    return json({ error: String(err) }, 500);
  }
});
