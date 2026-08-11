# CURSOR PROMPT — Application Review Workflow (first real application is in)

The first genuine public application arrived 7 Aug 2026 (Daron Marshall Naidoo, Malawi) and
exposed four problems. Fix all four.

**Repo:** `diedericksdobermann-web`. **Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`, Cinzel headings.

---

## Problem 1 — the immediate "new application" alert never fires

`notifications_log` contains **20 rows, every one `type = 'application_reminder'`** (the daily
cron, which works). There is **not a single `new_application` row**, including for the 7 Aug
submission. So the instant alert in `POST /api/apply` is silently failing.

The call is fire-and-forget:

```ts
void sendNewApplicationAlert(supabase, { ... });
```

Two faults:

1. `void` with no `.catch()` — a rejected promise is swallowed with no trace. On Vercel the
   serverless function may also freeze before the async work completes.
2. Nothing is written to `notifications_log` for this type, so a failure is invisible.

**Fix:**

- `await` the alert inside the route, wrapped in try/catch, so it completes before the
  response is returned. Never let a mail failure fail the applicant's submission — catch,
  log, and still return success to the applicant.
- Log **every** attempt to `notifications_log` with `type = 'new_application'`, including
  failures (`status = 'failed'` plus the error), so the next silent failure is visible.
- Add a `console.error` with the full error object on failure.

## Problem 2 — the admin cannot read most of the application

`src/app/admin/(panel)/applications/[id]/page.tsx` renders **20 fields**. The table has
**37 more**, and they are the ones that actually matter for vetting:

| Group | Missing fields |
|---|---|
| Applicant | `date_of_birth`, `occupation`, `employer`, `facebook_profile`, `instagram_handle` |
| Home & lifestyle | `yard_size`, `hours_alone_per_day`, `exercise_level`, `sleeping_arrangement` |
| Experience | `why_dobermann`, `dobermann_experience_level`, `previous_dog_fate`, `training_planned` |
| Preferences | `preferred_sex`, `preferred_colour`, `tail_preference`, `preferred_timeline`, `budget_range`, `special_requests` |
| Awareness | `aware_of_dcm`, `aware_of_costs`, `aware_of_commitment`, `delivery_acknowledged` |
| **Agreements** | `agreed_to_terms`, `agreed_no_breeding_rights`, `agreed_no_resale`, `agreed_right_of_recall`, `agreed_microchip_policy`, `agreed_welfare_commitment` |
| Linkage | `specific_dog_id`, `litter_interest_id`, `user_id` |
| Audit | `reviewed_by`, `reviewed_at`, `reminder_count`, `last_reminder_sent_at` |

**Fix:** render every field, grouped as above. Requirements:

- Booleans as **Yes / No**, never `true`/`false` or a blank.
- The six **agreements** get their own visually distinct block — these are the legal
  commitments and must be scannable at a glance. Any unticked agreement shows in red.
- `specific_dog_id` and `litter_interest_id` render as **links** to that dog/litter, not raw UUIDs.
- Empty fields show "—", never a blank cell, so it is obvious the applicant left it out
  rather than the page failing to load it.
- Keep the page under 300 lines — extract an `ApplicationFieldGroup` component.

## Problem 3 — `reference_code` is NULL on every application

Both existing applications have `reference_code = NULL`. The applicant is shown a `DD-XXXXXXXX`
reference on submission, but it is never persisted — so when they quote it in an email, it
cannot be looked up.

**Fix:** generate and store `reference_code` in `POST /api/apply` on insert. Display it on
the admin list and detail pages, and make the list searchable by it. Back-fill the two
existing rows from their `id` prefix using the same `DD-` + first 8 chars uppercase rule.

## Problem 4 — the review workflow is a bare status toggle

`ApplicationActions` offers only: Approve / Waitlist / Reject / Reset to Pending, plus a
notes box. Nothing tells the applicant anything, and there is no route to a quote.

**Build the full workflow:**

1. **Request more information** — a new status `info_requested` plus a free-text message.
   Emails the applicant that message. Records it in `admin_notes` with a timestamp and the
   sending admin. Reuse the `send-email` Edge Function; log to `notifications_log`.
2. **Approve** — sets `approved`, stamps `reviewed_by` / `reviewed_at`, emails the applicant
   a confirmation, then offers **Create Quote**.
3. **Reject** — requires a reason, emails a courteous decline.
4. **Create Quote from application** — opens `/admin/quotes/new` prefilled with the
   applicant's name, email, and `application_id`, and with a line item derived from the
   dog or tier they applied for, priced from `pricing_tiers`.
   `diedericks-dobermanns/lib/finance/autoQuoteFromApplication.ts` already does this in the
   app — port that logic, do not invent a second version.
5. **Send Quote** — from the quote detail page, sets status `sent` and emails the applicant
   a link. Conversion to invoice continues to use the existing
   `convert_quote_to_invoice(p_quote_id uuid)` RPC. **Do not reimplement conversion.**

Every status change must be visible on the application detail page as a timeline: what
changed, when, by whom.

## Critical warnings

- **`pricing_tiers` are all still R0.** A quote built today produces a zero figure. Show a
  clear warning on the Create Quote screen when the tier price is 0, rather than silently
  generating a R0 quote.
- `requireAdmin()` in every server action; return `{ error }`, never throw.
- Applicant emails contain personal data — never log full bodies to `notifications_log`,
  only subject and status.
- Do not use `createAdminClient()` outside the public API route that needs it.
- No file over 300 lines. Every Supabase call checks `error`.

## Verify

- [ ] Submit a test application → a `new_application` row appears in `notifications_log`
      for **each** admin, and the mail arrives.
- [ ] Force a mail failure (bad address) → submission still succeeds, and a `failed` row is logged.
- [ ] The detail page shows every field above, agreements clearly, booleans as Yes/No.
- [ ] `reference_code` is stored on new submissions and back-filled on the two existing rows.
- [ ] Request-info sends the applicant the message and records it.
- [ ] Approve → Create Quote → prefilled correctly → Send → Convert to Invoice all work end to end.
- [ ] `npx tsc --noEmit` exits 0; `npx next build` succeeds.

## Commit

From `diedericksdobermann-web/`, `git add -A`, one commit, after confirming
`git ls-files --others --exclude-standard src/` is empty.
