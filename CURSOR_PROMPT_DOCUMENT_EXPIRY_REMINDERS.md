# Cursor Prompt — Document Expiry Reminders (Email + In-App)

## Context

Diedericks Dobermanns app. Supabase project `nlmwxodvquwbjinhhbmr`. Postgres, no `pg_cron` extension enabled yet (confirmed — `cron.job` relation does not exist) and no scheduled-job pattern exists anywhere in this repo yet. This will be the **first** scheduled automation in the project — set the pattern carefully since future automations (e.g. heat-cycle reminders, vaccination due dates) will likely follow it.

**Already built — do not rebuild:**
- `documents` table already has `expiry_date`, `entity_type` (`'dog'|'litter'|'puppy'|'client'|'application'|'training'|'contract'|'kennel'|'health'|'show'`), `entity_id`, `document_name`, `category`, `uploaded_by`. RLS already correct — admins manage, clients/trainers view relevant docs, public docs visible to all. Do not touch RLS.
- `lib/documents/expiry.ts` — `expiryStatus()`, `expiryLabel()`, `expiryColor()` — computes status **client-side, on read**. Reused for reminder logic below, don't duplicate the day-math.
- `hooks/useDocuments.ts` — already has `useExpiringDocuments`, `useExpiringDogDocuments`.
- `app/(admin)/documents/index.tsx` — full list/filter/search/upload UI, including a `'kennel'` entity type + `KENNEL_DOCUMENT_ENTITY_ID` sentinel UUID (`00000000-0000-0000-0000-000000000001`) already reserved for kennel-wide company documents (licences, breed society registration, vet agreements). This is where the DogBreederPro company documents (Welcome Letter, Schedule of Fees, KUSA registration, etc.) will be imported as data — that import is a separate manual/data task, not part of this Cursor prompt.
- `notifications_log` table (`recipient_id, type, subject, body, status, sent_at`) — read by `hooks/useNotifications.ts`.
- `supabase/functions/send-email/` — existing Edge Function, already wired to send email. Reuse its pattern/config (Resend), do not create a second email-sending mechanism.

**Decision (confirmed with Matt):** reminders fire **2 weeks before `expiry_date`**, delivered via **email + in-app notification** (not WhatsApp for this feature).

---

## Task 1 — New Edge Function: `check-document-expiry`

Create `supabase/functions/check-document-expiry/index.ts` (keep it focused — under 200 lines; extract a shared query/formatting helper into `supabase/functions/check-document-expiry/lib.ts` if it grows past that):

- Runs as a scheduled job (see Task 2), not user-triggered — no client ever calls this directly, so it can use the service-role key server-side (standard for Edge Functions — never expose this key client-side).
- Query: all `documents` rows where `expiry_date` is exactly 14 days from today (use a date-range match, not exact-timestamp equality, to avoid timezone edge cases — e.g. `expiry_date between (today+13d) and (today+14d)`), AND that haven't already had a reminder sent (see Task 1a for how to track this).
- **Task 1a — dedupe column:** add a migration (Task 3) adding `documents.expiry_reminder_sent_at timestamptz null`. Only select documents where this is null, and set it once the reminder is sent — this is what prevents the same document firing every day for two weeks straight if the cron runs daily.
- For each matching document:
  - Insert one row into `notifications_log` per admin/management recipient (`type: 'document_expiry'`, `subject`, `body` naming the document and days remaining) — this satisfies the "in-app notification" channel; the existing notification bell UI (`useNotifications.ts`) already reads this table, so no new UI is needed for the in-app half.
  - Call the existing `send-email` function (or its underlying send logic directly, whichever is the established internal pattern in this codebase — check how `notify`/`send-broadcast` currently invoke `send-email` and follow that, don't invent a new invocation style) to email each admin/management user, subject like "Document expiring in 2 weeks: {document_name}".
  - Update `expiry_reminder_sent_at = now()` on the document row.
- Who is "admin/management"? Query `users` (or whatever the existing roles table/column is — check how `is_admin()` / role checks are done elsewhere, e.g. in RLS policies or `notify`, and reuse that exact role definition rather than guessing a new one) for admin + super-admin roles.
- Wrap the whole run in a try/catch that logs failures clearly (Edge Function logs) without silently swallowing errors — if the email send fails for one document, log it and continue to the next document rather than aborting the whole batch.

## Task 2 — Scheduling

`pg_cron` is not enabled on this project. Two ways to trigger this on a schedule — pick based on what's actually available:

1. **Preferred if available:** enable `pg_cron` + `pg_net` extensions via a migration, then `select cron.schedule('check-document-expiry-daily', '0 7 * * *', $$ select net.http_post(url:='<function-url>', headers:='{"Authorization":"Bearer <service-role-key-as-secret>"}'::jsonb) $$);` — runs daily at 07:00. Store the URL/key reference via Supabase Vault or a secure config pattern, never hardcode the service-role key into a migration file that goes into git.
2. **If `pg_cron`/`pg_net` cannot be enabled on this project tier:** use Supabase's built-in Cron feature in the dashboard (Project → Integrations → Cron), which schedules Edge Function invocations without needing the Postgres extensions at all — this is the simpler, more maintainable option and should be preferred if it's available on Matt's plan. Note in your summary which path you used and why, so this is documented for future reminder features (this sets the pattern).

## Task 3 — Migration

`supabase/migrations/00XX_document_expiry_reminders.sql` (check the latest existing migration number and increment):
- `alter table documents add column if not exists expiry_reminder_sent_at timestamptz;`
- If using the `pg_cron` path: the `cron.schedule(...)` call, extension enables, and any Vault secret setup.
- Comment explaining the purpose at the top of the file, per project convention.

## Task 4 — Manual trigger button (admin convenience)

On `app/(admin)/documents/index.tsx`, add a small "Check Now" action (admin-only) that invokes the Edge Function directly via `supabase.functions.invoke('check-document-expiry')` — useful for testing and for Matt to force a check without waiting for the schedule. Show a toast with the result count ("3 reminders sent").

---

## Critical warnings

- Never expose the service-role key in any client-side (`EXPO_PUBLIC_...`) variable — it's server-side only, inside the Edge Function.
- Do not touch existing RLS policies on `documents`.
- Do not duplicate the day-math from `lib/documents/expiry.ts` — reuse the same "days until expiry" logic so the admin UI badge and the reminder trigger agree with each other.
- If the email send fails for one recipient/document, log and continue — don't let one failure block the whole batch.

## Testing checklist

- [ ] Manually set a test document's `expiry_date` to 14 days from today, trigger via the "Check Now" button, confirm one email arrives and one `notifications_log` row appears
- [ ] Re-trigger immediately after — confirm it does NOT send a second reminder (dedupe via `expiry_reminder_sent_at` works)
- [ ] A document expiring in 20 days does NOT trigger
- [ ] A document with no `expiry_date` is never selected
- [ ] Non-admin users cannot invoke the Edge Function (check auth inside the function, not just RLS)
- [ ] `npx tsc --noEmit` passes cleanly
