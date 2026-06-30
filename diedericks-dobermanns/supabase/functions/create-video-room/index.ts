// Supabase Edge Function: create-video-room
// Creates a private Daily.co room + owner (host) token for a confirmed
// training booking, then writes the join links back to training_bookings.
//
// Deploy:  supabase functions deploy create-video-room
// Secrets: supabase secrets set DAILY_API_KEY=...
//          (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically)
//
// Request body: { bookingId: string }
// Response:     { clientUrl: string, hostUrl: string }

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const DAILY_BASE = 'https://api.daily.co/v1';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!DAILY_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Function not configured' }), { status: 500 });
  }

  try {
    const { bookingId } = (await req.json()) as { bookingId: string };
    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'bookingId is required' }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1. Fetch the booking.
    const { data: booking, error: bErr } = await supabase
      .from('training_bookings')
      .select('id, scheduled_at, duration_minutes')
      .eq('id', bookingId)
      .single();
    if (bErr || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404 });
    }

    // Expiry = scheduled start + duration + 30 min buffer.
    const start = new Date(booking.scheduled_at).getTime();
    const exp = Math.floor((start + (booking.duration_minutes + 30) * 60_000) / 1000);
    const roomName = `dd-session-${String(bookingId).slice(0, 8)}`;

    const dailyHeaders = {
      Authorization: `Bearer ${DAILY_API_KEY}`,
      'Content-Type': 'application/json',
    };

    // 2. Create the private room.
    const roomRes = await fetch(`${DAILY_BASE}/rooms`, {
      method: 'POST',
      headers: dailyHeaders,
      body: JSON.stringify({
        name: roomName,
        privacy: 'private',
        properties: {
          exp,
          max_participants: 2,
          enable_screenshare: false,
          start_video_off: false,
        },
      }),
    });
    const room = await roomRes.json();
    if (!roomRes.ok) {
      return new Response(JSON.stringify({ error: 'Daily room error', detail: room }), { status: 502 });
    }

    // 3. Create an owner (host) meeting token for the trainer.
    const tokenRes = await fetch(`${DAILY_BASE}/meeting-tokens`, {
      method: 'POST',
      headers: dailyHeaders,
      body: JSON.stringify({ properties: { room_name: roomName, is_owner: true, exp } }),
    });
    const token = await tokenRes.json();
    if (!tokenRes.ok) {
      return new Response(JSON.stringify({ error: 'Daily token error', detail: token }), { status: 502 });
    }

    const hostUrl = `${room.url}?t=${token.token}`;

    // 4. Persist the links on the booking.
    const { error: uErr } = await supabase
      .from('training_bookings')
      .update({
        video_room_name: room.name,
        video_room_url: room.url,
        video_host_url: hostUrl,
        video_room_expires_at: new Date(exp * 1000).toISOString(),
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', bookingId);
    if (uErr) {
      return new Response(JSON.stringify({ error: 'Update failed', detail: uErr.message }), { status: 500 });
    }

    // 5. Return both links.
    return new Response(JSON.stringify({ clientUrl: room.url, hostUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
