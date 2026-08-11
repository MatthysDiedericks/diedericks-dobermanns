// Supabase Edge Function: send-birthday-greetings
//
// Daily cron (see 0058_training_guides_and_birthday_cron.sql) finds dogs whose
// month/day match today, with an owner, not deceased, and sends one warm
// greeting per owner per calendar year. Dedupes via notifications_log type
// dog_birthday — never a boolean on the dog.
//
// Deploy: supabase functions deploy send-birthday-greetings
// Secrets: RESEND_API_KEY, FROM_EMAIL (optional)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL =
  Deno.env.get("FROM_EMAIL") ?? "Diedericks Dobermanns <noreply@diedericksdobermanns.com>";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const AGE_WORDS = [
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen", "twenty",
];

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function emailShell(heading: string, bodyHtml: string): string {
  return `
    <div style="font-family: Georgia, serif; background:#111008; color:#F5F0E8; padding:32px;">
      <div style="max-width:560px; margin:0 auto; background:#1C1A0E; padding:32px; border:1px solid #C4A35A33;">
        <h1 style="color:#C4A35A; font-size:14px; letter-spacing:0.18em; text-transform:uppercase; margin:0 0 20px;">
          ${heading}
        </h1>
        ${bodyHtml}
        <p style="margin-top:32px; font-size:12px; color:#C4A35A99;">
          Diedericks Dobermanns · Born With Purpose. Built With Discipline.
        </p>
      </div>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ageWords(dob: string, now: Date): string {
  const birth = new Date(dob.includes("T") ? dob : `${dob}T12:00:00`);
  let years = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  ) {
    years -= 1;
  }
  if (years < 1) return "one";
  if (years <= 20) return AGE_WORDS[years - 1] ?? String(years);
  return String(years);
}

function isBirthdayToday(dob: string, now: Date): boolean {
  const birth = new Date(dob.includes("T") ? dob : `${dob}T12:00:00`);
  const m = birth.getMonth();
  const d = birth.getDate();
  if (m === 1 && d === 29) {
    const y = now.getFullYear();
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    if (!leap) return now.getMonth() === 2 && now.getDate() === 1;
  }
  return now.getMonth() === m && now.getDate() === d;
}

async function isAuthorized(req: Request): Promise<boolean> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  if (token === SERVICE_ROLE_KEY) return true;
  const { data: userData, error } = await admin.auth.getUser(token);
  if (error || !userData?.user) return false;
  const { data: profile } = await admin
    .from("users")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  return profile?.role === "admin" || profile?.role === "super_admin";
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${res.status}`);
}

/** One greeting per dog per recipient per calendar year (retry-safe). */
async function alreadySentThisYear(
  ownerId: string,
  dogId: string,
  year: number,
): Promise<boolean> {
  const from = `${year}-01-01T00:00:00.000Z`;
  const to = `${year + 1}-01-01T00:00:00.000Z`;
  const { data, error } = await admin
    .from("notifications_log")
    .select("id, body")
    .eq("recipient_id", ownerId)
    .eq("type", "dog_birthday")
    .gte("created_at", from)
    .lt("created_at", to);
  if (error) {
    console.error("[send-birthday-greetings] dedupe query failed:", error.message);
    return true;
  }
  const marker = `dog_id=${dogId}`;
  return (data ?? []).some((row) => (row.body ?? "").includes(marker));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!(await isAuthorized(req))) return json({ error: "Forbidden" }, 403);

    const now = new Date();
    const year = now.getFullYear();

    const { data: dogs, error: dogsError } = await admin
      .from("dogs")
      .select("id, name, date_of_birth, owner_id, status")
      .not("owner_id", "is", null)
      .not("date_of_birth", "is", null)
      .neq("status", "deceased");
    if (dogsError) throw new Error(dogsError.message);

    const todayDogs = (dogs ?? []).filter(
      (d) => d.date_of_birth && d.owner_id && isBirthdayToday(d.date_of_birth, now),
    );

    let sent = 0;
    const skipped: string[] = [];

    for (const dog of todayDogs) {
      try {
        if (await alreadySentThisYear(dog.owner_id!, dog.id, year)) {
          skipped.push(dog.id);
          continue;
        }

        const { data: owner } = await admin
          .from("users")
          .select("id, full_name, email")
          .eq("id", dog.owner_id!)
          .maybeSingle();
        if (!owner?.email) {
          skipped.push(dog.id);
          continue;
        }

        const { data: media } = await admin
          .from("dog_media")
          .select("url")
          .eq("dog_id", dog.id)
          .eq("type", "photo")
          .order("is_primary", { ascending: false })
          .limit(1);
        const photoUrl = media?.[0]?.url ?? null;

        const firstName = (owner.full_name ?? "there").split(" ")[0];
        const words = ageWords(dog.date_of_birth!, now);
        const subject = `Happy birthday, ${dog.name}`;
        const photoBlock = photoUrl
          ? `<p style="margin:24px 0;"><img src="${escapeHtml(photoUrl)}" alt="" width="280" style="max-width:100%; border:1px solid #C4A35A33;" /></p>`
          : "";

        const html = emailShell(
          "Happy birthday",
          `
            <p>Dear ${escapeHtml(firstName)},</p>
            <p><strong>${escapeHtml(dog.name)}</strong> turns ${escapeHtml(words)} today.</p>
            ${photoBlock}
            <p>We remember every dog we breed, and we think about where they end up. It
            means a great deal to us that this one ended up with you.</p>
            <p>We hope the year ahead is a good one for both of you.</p>
            <p style="margin-top:24px;">Kind regards<br/>Matthys Diedericks<br/>Diedericks Dobermanns</p>
          `,
        );

        await sendEmail(owner.email, subject, html);

        await admin.from("notifications_log").insert({
          recipient_id: owner.id,
          type: "dog_birthday",
          subject,
          body: `dog_id=${dog.id}`,
          status: "sent",
        });

        sent++;
      } catch (err) {
        console.error(`[send-birthday-greetings] dog ${dog.id}:`, String(err));
        skipped.push(dog.id);
      }
    }

    return json({ ok: true, candidates: todayDogs.length, sent, skipped });
  } catch (err) {
    console.error("[send-birthday-greetings] run failed:", String(err));
    return json({ error: String(err) }, 500);
  }
});
