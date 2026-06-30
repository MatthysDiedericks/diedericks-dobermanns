import { NextResponse } from "next/server";
import { z } from "zod";

import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  preference_notes: z.string().optional(),
  litterId: z.string().uuid(),
  litterName: z.string().min(1),
});

/**
 * Public litter waitlist registration. Because `waiting_list` requires an
 * authenticated client_id, anonymous web signups are captured as enquiries
 * tagged with the litter, which admins triage and convert to formal waitlist
 * entries inside the app.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`waitlist:${ip}`, { maxRequests: 5, windowMs: 60_000 });

  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 422 });
  }
  const v = parsed.data;

  const supabase = createAdminClient();
  const { error } = await supabase.from("enquiries").insert({
    full_name: v.full_name,
    email: v.email,
    phone: v.phone || null,
    subject: `Waitlist — ${v.litterName}`,
    message:
      `Litter waitlist registration for "${v.litterName}" (litter ${v.litterId}).` +
      (v.preference_notes ? `\n\nPreferences: ${v.preference_notes}` : ""),
    status: "new",
  });

  if (error) {
    return NextResponse.json({ error: "Could not submit" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
