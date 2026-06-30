import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ bookingId: z.string().uuid() });

/**
 * Admin-only: provisions a private Daily.co room for a training booking and
 * stores the room + host URLs on the booking. Requires an authenticated admin
 * session; the actual write uses the service-role client.
 */
export async function POST(request: Request) {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await auth
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  }

  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Daily.co is not configured" },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("training_bookings")
    .select("id, scheduled_at, duration_minutes")
    .eq("id", parsed.data.bookingId)
    .maybeSingle();
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const start = new Date(booking.scheduled_at).getTime();
  const expSeconds = Math.floor(
    (start + (booking.duration_minutes + 60) * 60 * 1000) / 1000,
  );
  const roomName = `dd-${booking.id.slice(0, 8)}-${Date.now().toString(36)}`;

  const roomRes = await fetch("https://api.daily.co/v1/rooms", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: roomName,
      privacy: "private",
      properties: { exp: expSeconds, enable_chat: true },
    }),
  });

  if (!roomRes.ok) {
    return NextResponse.json(
      { error: "Failed to create video room" },
      { status: 502 },
    );
  }
  const room = (await roomRes.json()) as { url: string; name: string };

  const tokenRes = await fetch("https://api.daily.co/v1/meeting-tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { room_name: room.name, is_owner: true, exp: expSeconds },
    }),
  });
  const token = tokenRes.ok
    ? ((await tokenRes.json()) as { token: string }).token
    : null;

  const hostUrl = token ? `${room.url}?t=${token}` : room.url;

  const { error } = await admin
    .from("training_bookings")
    .update({
      video_room_name: room.name,
      video_room_url: room.url,
      video_host_url: hostUrl,
      video_room_expires_at: new Date(expSeconds * 1000).toISOString(),
    })
    .eq("id", booking.id);

  if (error) {
    return NextResponse.json(
      { error: "Room created but could not be saved" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, url: room.url, hostUrl });
}
