// Supabase Edge Function: send-push
// Dispatches an Expo push notification to a stored Expo push token.
//
// Deploy: supabase functions deploy send-push

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

interface PushPayload {
  to: string; // ExponentPushToken[...]
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = (await req.json()) as PushPayload;
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: payload.to,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        sound: 'default',
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
