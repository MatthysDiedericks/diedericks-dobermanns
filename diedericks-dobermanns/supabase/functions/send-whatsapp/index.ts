// Supabase Edge Function: send-whatsapp
// Sends a WhatsApp message via the WhatsApp Business API (360dialog / Twilio).
// This is a thin, provider-agnostic stub — wire to your chosen provider.
//
// Deploy: supabase functions deploy send-whatsapp
// Secrets: supabase secrets set WHATSAPP_API_KEY=...

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

interface WhatsAppPayload {
  to: string; // E.164 phone number
  body: string;
}

const WHATSAPP_API_KEY = Deno.env.get('WHATSAPP_API_KEY');
const WHATSAPP_API_URL = Deno.env.get('WHATSAPP_API_URL'); // provider endpoint

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!WHATSAPP_API_KEY || !WHATSAPP_API_URL) {
    return new Response(
      JSON.stringify({ error: 'WhatsApp provider not configured' }),
      { status: 500 },
    );
  }

  try {
    const { to, body } = (await req.json()) as WhatsAppPayload;
    const res = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
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
