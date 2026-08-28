// Supabase Edge Function: send-email
// Sends branded transactional email via Resend. Secrets are read from the
// function environment and never exposed to the client.
//
// Deploy: supabase functions deploy send-email
// Secrets: supabase secrets set RESEND_API_KEY=...

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

interface EmailAttachment {
  filename: string;
  /** Base64-encoded file contents (no data: prefix). */
  content: string;
  contentType?: string;
}

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
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
    const { to, subject, html, attachments } = (await req.json()) as EmailPayload;
    const body: Record<string, unknown> = { from: FROM, to, subject, html };
    if (attachments?.length) {
      // Resend reads base64 from `content`. Dropping this array is a silent
      // success — the covering note arrives, the file does not.
      body.attachments = attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
      }));
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const payload = {
      ...data,
      attachmentCount: attachments?.length ?? 0,
    };
    return new Response(JSON.stringify(payload), {
      status: res.ok ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
