# CURSOR PROMPT — Website Client Portal + Automated Application Alerts

Two related features for **`diedericksdobermann-web`** (Next.js 15 App Router) plus one
Supabase edge function. Read Part 0 fully before writing anything.

---

## 0. GROUND TRUTH — verify before you build

Supabase project: `nlmwxodvquwbjinhhbmr`

**Already exists — do NOT rebuild:**

| Thing | Where | Note |
|---|---|---|
| Admin login | `src/app/admin/login/` | Working. Copy its Supabase SSR auth pattern. |
| Admin auth guard | `src/lib/admin/auth.ts` (`requireAdmin()`) | Reuse the shape for `requireClient()`. |
| Supabase server client | `src/lib/supabase/server.ts` | Cookie-based SSR client. |
| `send-email` edge function | `diedericks-dobermanns/supabase/functions/send-email/` | **Read it first.** Reuse it — do not add a second mail path. |
| Daily cron precedent | `cron.job` id 1, `check-document-expiry-daily`, `0 7 * * *` | Uses `net.http_post` + a key from `vault.decrypted_secrets`. **Copy this exact pattern.** |
| Mobile client portal | `diedericks-dobermanns/app/(portal)/` | The behaviour to mirror. Read these screens before designing pages. |

**Relevant tables (confirmed live):** `users` (role: visitor/client/trainer/admin/super_admin),
`dogs`, `dog_media`, `applications`, `deworming_records`, `puppy_health_records`, `vaccinations`,
`health_tests`, `training_bookings`, `training_booking_media`, `training_logs`,
`training_session_types`, `training_availability`, `notifications_log`, `documents`, `contracts`,
`invoices`.

**Before writing any query, run it against the live DB and confirm the columns exist.**
Several tables in this project have columns that differ from what the name suggests.

**Two known traps in this codebase:**
1. `dogs.mother_id`/`father_id` are SELF-referencing FKs. PostgREST cannot resolve them by
   constraint name — embed the column directly: `mother:mother_id(...)`. See
   `src/app/(site)/dogs/[slug]/page.tsx`.
2. Never assume a check-constraint's allowed values. Query `pg_constraint` first. An invalid
   `gallery_items.category` silently broke uploads for months.

---

# PART A — CLIENT PORTAL ON THE WEBSITE

## A1. Why

Clients can currently only log in through the mobile app, which is not published yet. Owners of
a Diedericks dog have no way to see their dog's records on the web. This portal mirrors the app's
client experience for the web.

## A2. Auth

- New route group `src/app/(portal)/` with its own layout, separate from `(site)` and `admin`.
- Login at `/portal/login`, using the **same Supabase SSR pattern as `admin/login`**.
- `requireClient()` in `src/lib/portal/auth.ts` — mirrors `requireAdmin()`:
  - not signed in → redirect to `/portal/login`
  - signed in but `users.role = 'visitor'` → friendly "no dogs linked yet" state, NOT an error
  - `client`, `trainer`, `admin`, `super_admin` all allowed through
- Password reset flow must work (reuse whatever `admin/login` does).
- **Never** use the service role key in any portal page. Client data access is enforced by RLS.

## A3. Pages (mirror the app portal — read those screens first)

```
/portal                    Dashboard: my dogs, next health action due, open training bookings
/portal/dogs/[id]          Dog detail: photos, details, pedigree, health summary
/portal/health/[dogId]     Vaccinations, dewormings, health records, WHAT IS DUE NEXT
/portal/training           Book a session, see upcoming/past bookings
/portal/training/[id]      Booking detail: trainer notes/updates + CLIENT REPLY
/portal/documents          Their documents and contracts
/portal/application        Application status (if they have one)
```

**Only show dogs the signed-in user owns** (`dogs.owner_id = auth.uid()`), plus dogs linked via
an approved application/reservation if that relationship exists — check before assuming.

### Health schedule (A3.1) — the part Matt specifically asked for
Read `diedericks-dobermanns/hooks/useDogHealthSchedule.ts` and reuse its logic exactly; do not
invent a second scheduling rule. It must show **next deworming due** and **next vaccination due**
prominently, with overdue clearly flagged.

### Training replies (A3.2) — also specifically asked for
Clients must be able to reply on a training booking. Check whether `training_logs` or
`training_booking_media` already carries messages; if there is no client-reply column, add a
migration for a minimal `training_booking_messages` table:
`id, booking_id, sender_id, body, created_at` with RLS: client sees/writes only their own
booking's messages; trainer/admin sees all.

## A4. RLS — non-negotiable

Every table the portal reads must have a policy restricting rows to the owner. Audit each one
and add policies where missing. **Test by signing in as a real client account and confirming you
cannot see another client's dog.** A UI-only filter is not security.

---

# PART B — APPLICATION ALERTS + DAILY REMINDERS

## B1. Behaviour

1. A client submits an application (`POST /api/apply`, status `submitted`).
2. **Immediately**: email every admin — "New application received".
3. **Every day at 07:00 SAST**, for each application still `status = 'submitted'`:
   email all admins a reminder listing them, with age in days.
4. Reminders stop as soon as status is anything other than `submitted`
   (`under_review`, `approved`, `rejected`, `waitlisted`).

## B2. Recipients

All users with `role IN ('admin','super_admin')` — currently Matt and Felicia. Query it at send
time; do not hardcode addresses so it stays correct as staff change.

## B3. Schema

```sql
-- Track reminder sends so a retry or double-run cannot spam, and so the email
-- can say "reminder #3".
alter table applications add column if not exists last_reminder_sent_at timestamptz;
alter table applications add column if not exists reminder_count int not null default 0;

create index if not exists idx_applications_status_created
  on applications (status, created_at);
```

## B4. Immediate alert

In `src/app/api/apply/route.ts`, after the application inserts successfully:
- fire the admin notification **best-effort** — wrap in try/catch, `void` it, never let a mail
  failure turn a successful submission into an error for the applicant
- include: applicant name, email, phone, country, dog interest, reference code, and a direct
  link to `/admin/applications/<id>`

## B5. Daily reminder edge function

New function `notify-pending-applications`, modelled on `check-document-expiry`:
- select applications where `status = 'submitted'`
- skip any already reminded within the last 20 hours (guards double-runs)
- one digest email per admin listing all pending applications with age in days
- set `last_reminder_sent_at = now()`, increment `reminder_count`
- if none pending, send nothing at all (silence is the correct output)

Schedule it exactly like the existing job:

```sql
select cron.schedule(
  'notify-pending-applications-daily',
  '0 5 * * *',  -- 05:00 UTC = 07:00 SAST, matching check-document-expiry
  $$
  select net.http_post(
    url := 'https://nlmwxodvquwbjinhhbmr.supabase.co/functions/v1/notify-pending-applications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'notify_pending_applications_service_key'
      ),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Store the service key in Vault under that name — **never inline the key in SQL or code.**

## B6. Email content

Brand-consistent: dark background, gold accents, Cinzel-style headings. Subject lines:
- New: `New puppy application — {full_name}`
- Reminder: `{n} application(s) awaiting review — oldest {d} days`

Log every send to `notifications_log` so there is an audit trail.

---

## CRITICAL WARNINGS

- **Service role key must never reach the browser.** No `NEXT_PUBLIC_` prefix, ever.
- **RLS is the security boundary**, not the UI. Test cross-account access explicitly.
- **Do not touch the existing admin panel or the public site.** If `/admin/applications` or any
  public page behaves differently afterwards, you have broken something.
- **Reuse `send-email`.** Do not add another mail provider.
- **No file over 300 lines.** Extract components and hooks.
- **No `any`.** Regenerate `database.types.ts` after the migration.
- Reminders must be **idempotent** — running the cron twice in one day must not send twice.

## EXECUTION ORDER

1. Migration (B3) + any training-messages table (A3.2) → regenerate types
2. `requireClient()` + `/portal/login`
3. Portal dashboard → dog detail → health schedule → training → documents
4. RLS audit and cross-account test
5. Immediate alert in `/api/apply`
6. `notify-pending-applications` edge function → deploy → schedule cron
7. `npx tsc --noEmit` must exit 0

## TESTING CHECKLIST

**Portal**
- [ ] Client signs in and sees only their own dogs
- [ ] Second client account cannot see the first's dogs (RLS, not UI)
- [ ] Next deworming and vaccination due dates are correct and overdue is flagged
- [ ] Client can book training and reply on a booking; trainer sees the reply
- [ ] Visitor-role user gets the friendly empty state, not a crash
- [ ] Signed-out user hitting `/portal/*` lands on login
- [ ] Password reset works

**Alerts**
- [ ] Submitting an application emails all admins within a minute
- [ ] Mail failure does NOT break the applicant's submission
- [ ] Reminder fires for `submitted` only
- [ ] Changing status to `under_review` stops reminders next day
- [ ] Running the function twice in a day sends only once
- [ ] No pending applications → no email sent
- [ ] Every send appears in `notifications_log`

**Quality**
- [ ] `npx tsc --noEmit` exits 0
- [ ] Admin panel and public site unchanged
- [ ] No service role key client-side
