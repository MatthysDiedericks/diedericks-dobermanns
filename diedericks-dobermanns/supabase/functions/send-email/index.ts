// Supabase Edge Function: send-email
// Sends branded transactional email via Resend. Secrets are read from the
// function environment and never exposed to the client.
//
// Deploy: supabase functions deploy send-email
// Secrets: supabase secrets set RESEND_API_KEY=...

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM = 'Diedericks Dobermanns <no-reply@diedericksdobermanns.com>';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), {
      status: 500,
    });
  }

  try {
    const { to, subject, html } = (await req.json()) as EmailPayload;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.ok ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
