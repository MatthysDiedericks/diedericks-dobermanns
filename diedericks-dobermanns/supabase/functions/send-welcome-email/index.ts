// Supabase Edge Function: send-welcome-email
// Sends a branded welcome email when a new user registers.
//
// Deploy: supabase functions deploy send-welcome-email
// Secrets: RESEND_API_KEY (shared with send-email)
// Optional DB trigger (run once on Supabase):
//   CREATE OR REPLACE FUNCTION public.handle_new_user_welcome()
//   RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
//   BEGIN
//     PERFORM net.http_post(
//       url := current_setting('app.settings.supabase_url') || '/functions/v1/send-welcome-email',
//       headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
//       body := jsonb_build_object('user_id', NEW.id, 'email', NEW.email)
//     );
//     RETURN NEW;
//   END; $$;

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM = 'Diedericks Dobermanns <no-reply@diedericksdobermanns.com>';

interface WelcomePayload {
  user_id?: string;
  email?: string;
  full_name?: string;
}

function welcomeHtml(name: string): string {
  return `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;background:#0a0a0a;color:#f5f5f5;padding:32px">
    <h1 style="font-family:Cinzel,serif;color:#c4a35a">Welcome to Diedericks Dobermanns</h1>
    <p>Hi ${name},</p>
    <p>Your account has been created. Once your application is reviewed, you'll receive full access to the client portal, training bookings, and documents.</p>
    <p>Questions? Reply to this email or contact us at info@diedericksdobermanns.com</p>
    <p style="color:#888;margin-top:32px">Diedericks Dobermanns · Precision bred. Professionally trained.</p>
  </body></html>`;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), { status: 500 });
  }

  try {
    const body = (await req.json()) as WelcomePayload;
    let email = body.email;
    let name = body.full_name ?? 'there';

    if (body.user_id && !email) {
      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data } = await admin.auth.admin.getUserById(body.user_id);
      email = data.user?.email ?? undefined;
      name =
        (data.user?.user_metadata?.full_name as string | undefined) ??
        data.user?.email?.split('@')[0] ??
        name;
    }

    if (!email) {
      return new Response(JSON.stringify({ error: 'email required' }), { status: 422 });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: email,
        subject: 'Welcome to Diedericks Dobermanns',
        html: welcomeHtml(name),
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
