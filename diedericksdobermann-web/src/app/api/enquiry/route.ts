import { NextResponse } from "next/server";
import { z } from "zod";

import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  country: z.string().optional(),
  subject: z.string().min(1),
  message: z.string().min(10),
  dog_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`enquiry:${ip}`, { maxRequests: 5, windowMs: 60_000 });

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
    full_name: v.full_name.trim().slice(0, 100),
    email: v.email.trim().toLowerCase().slice(0, 200),
    phone: v.phone?.trim().slice(0, 20) || null,
    country: v.country?.trim().slice(0, 100) || null,
    subject: v.subject.trim().slice(0, 200),
    message: v.message.trim().slice(0, 2000),
    dog_id: v.dog_id ?? null,
    status: "new",
  });

  if (error) {
    console.error("Enquiry form error:", error);
    return NextResponse.json({ error: "Could not submit" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
