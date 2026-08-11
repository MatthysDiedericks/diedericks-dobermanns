# CURSOR PROMPT — Quote Acceptance + Proof of Payment in the Client Portal

Closes the loop from approved application to money received:

**approve → quote → client accepts in their portal → client uploads proof of payment →
admin sees it and confirms.**

**Repo:** `diedericksdobermann-web`. **Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`, Cinzel headings.

---

## What already exists — reuse, do not rebuild

- **Admin quotes list** at `src/app/admin/(panel)/quotes/page.tsx` — already built. Extend it
  (see Part 1), do not create a second list.
- `convert_quote_to_invoice(p_quote_id uuid)` — **existing Postgres RPC**. Enforces admin,
  refuses double-conversion, refuses drafts. Call it; never reimplement conversion.
- `src/lib/notifications/email.ts`, `applicantEmails.ts`, `log.ts` — the mail + logging
  helpers built for the application workflow. Reuse them.
- Portal document signing: `src/lib/portal/documents.ts` already issues short-lived signed
  URLs from the private `documents` bucket.
- `src/components/ui/ImageUploader.tsx` — preview-and-confirm uploader.

### Live schema facts

```
quotes.status  CHECK IN ('draft','sent','accepted','declined','expired','cancelled')
documents.entity_type CHECK includes 'client'
documents.category    CHECK has 33 values but NO proof-of-payment value
```

`quotes` already has `accepted`/`declined` — **do not add new statuses**. You do need to
record *who* accepted and *when*, and you need a document category for the payment proof.

---

## Part 0 — Migration (write it, then TELL MATT IT NEEDS APPLYING)

Cursor cannot reach Supabase. Migrations 0050, 0051 and 0052 were each written and left
unapplied, and 0052 would have broken the site at runtime. Write the migration, then state
clearly at the end of your run: **"migration 00NN needs to be applied before deploying."**

`diedericks-dobermanns/supabase/migrations/0053_quote_acceptance_and_payment_proof.sql`:

```sql
-- Who accepted the quote and when, so acceptance is evidence, not just a status.
alter table public.quotes
  add column if not exists accepted_by uuid references public.users(id) on delete set null,
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_reason text,
  add column if not exists sent_at timestamptz;

-- Payment proof is a client-uploaded document. Widen the category constraint.
alter table public.documents drop constraint if exists documents_category_check;
alter table public.documents add constraint documents_category_check
  check (category in ( ...all 33 existing values..., 'proof_of_payment' ));
```

Also add a `payment_proof` link so a document can be tied to the quote/invoice it pays:

```sql
alter table public.documents
  add column if not exists related_quote_id uuid references public.quotes(id) on delete set null,
  add column if not exists related_invoice_id uuid references public.invoices(id) on delete set null;
```

**RLS — the part that matters.** A client must be able to insert a `proof_of_payment`
document against **their own** quote, and read it back, but must never publish it or see
anyone else's. Extend the existing `documents` policies:

- INSERT allowed when `entity_type='client'`, `entity_id = auth.uid()`,
  `category='proof_of_payment'`, `is_public = false`, and `related_quote_id` belongs to a
  quote whose `client_id = auth.uid()`.
- SELECT allowed for the owning client and for `is_admin()`.
- **Never** widen an existing policy to make this work — add a new one. Revoking or
  loosening policies has taken this site down before.

---

## Part 1 — Admin: quote list you can work from

Extend `admin/(panel)/quotes/page.tsx`:

- Columns: quote number, client, total, **status**, sent date, accepted date, valid-until, age.
- **Filter tabs by status** with live counts: All / Draft / Sent / Accepted / Declined / Expired.
- Highlight: `sent` and older than 7 days = amber "awaiting client"; past `valid_until` = red.
- **Payment column**: shows a paperclip when the client has uploaded proof, linking straight
  to the document. This is the thing you will scan the list for.
- Sort by newest first; allow sort by status and by total.

## Part 2 — Releasing a quote emails the client

On **Send Quote** (existing action, extend it):

1. Set `status='sent'`, `sent_at=now()`.
2. Email the client. Subject: `Your application was successful — quote DD-xxxx`.
   Body must state plainly: the application was **approved**, the quote total, what it covers,
   and that they should **sign in to their profile to accept it**. Include a direct link to
   `/portal/quotes/<id>`.
3. If the applicant has **no user account yet**, the email must instead invite them to
   register with the same email address, and explain the quote will be waiting. Say this
   explicitly rather than sending a link that lands on a login wall with no explanation.
4. Log to `notifications_log` as `quote_sent`, including failures.

## Part 3 — Client portal: view and accept the quote

New `src/app/portal/(panel)/quotes/page.tsx` (list) and `quotes/[id]/page.tsx` (detail).
Add "Quotes" to the portal nav with a badge when one is awaiting action.

Detail page shows: quote number, date, valid-until, every line item with quantity and price,
subtotal, discount, total, and notes. Then:

- **Accept Quote** — confirmation step first ("Accepting is your agreement to purchase at
  this price"). Sets `status='accepted'`, `accepted_by=auth.uid()`, `accepted_at=now()`.
  Emails the kennel. Then immediately shows the payment step (Part 4).
- **Decline** — asks for an optional reason into `declined_reason`, sets `declined`.
- Once accepted or declined, buttons are replaced by a clear status line with the date.
  An expired quote (`valid_until` past) cannot be accepted — say so and invite them to contact you.

**RLS does the scoping.** Use the request-scoped client from `@/lib/supabase/server`.
**Never** use `createAdminClient()` in a portal route.

## Part 4 — Client uploads proof of payment

On the accepted quote, and on `/portal/documents`:

- Upload control accepting PDF/JPG/PNG, max 10MB, using `ImageUploader` with
  `confirmBeforeUpload` so they see what they are sending.
- Stores to the **private `documents` bucket**, inserts a `documents` row with
  `entity_type='client'`, `entity_id=auth.uid()`, `category='proof_of_payment'`,
  `related_quote_id`, `is_public=false`, `uploaded_by=auth.uid()`.
- Optional reference/amount/date fields go in `description`.
- After upload: "Received — we will confirm once checked." Client can see and re-download
  their own upload, and add another (part payments are normal).
- Emails the kennel that proof was uploaded, with a link to the admin quote.

## Part 5 — Admin sees and confirms the payment

- On the admin quote detail: a **Payment** section listing every uploaded proof with a
  signed-URL link, uploader, timestamp and description.
- **Confirm Payment** action → calls the existing `convert_quote_to_invoice` RPC and links
  the invoice. Record a payment against the invoice using the existing finance flow.
- Admin can also mark proof as **rejected/unclear** with a reason, which emails the client
  asking for a clearer copy.
- Only `admin` / `super_admin` see these documents. Verify this holds by signing in as a
  client and confirming another client's proof is not visible.

---

## Critical warnings

- **`pricing_tiers` are still R0.** A quote sent today is a R0 quote. Block **Send** with a
  clear error when the total is 0, rather than emailing a client a zero-rand quote.
- Money is `numeric`. Never float arithmetic.
- Proof of payment contains bank details — it is **private**. Never `is_public=true`,
  never in a public bucket, always via a short-lived signed URL.
- `requireAdmin()` on every admin action; return `{ error }`, never throw.
- No file over 300 lines. Loading, empty and populated states everywhere.
- Every Supabase call checks `error` and surfaces it.

## Verify

- [ ] Send a quote → client receives the approval email naming the total, with a working link.
- [ ] Client with no account gets the register-first variant instead.
- [ ] Client accepts → status, `accepted_by`, `accepted_at` all set; kennel emailed.
- [ ] Client uploads proof → appears on the admin quote; **another client cannot see it**.
- [ ] Expired quote cannot be accepted.
- [ ] Confirm Payment converts to invoice via the RPC; converting twice is refused.
- [ ] Sending a R0 quote is blocked with an explanation.
- [ ] `npx tsc --noEmit` exits 0; `npx next build` succeeds.

## Commit

From `diedericksdobermann-web/`, `git add -A`, one commit, after confirming
`git ls-files --others --exclude-standard src/` is empty. The migration lives in the **app**
repo (`diedericks-dobermanns/supabase/migrations/`) — commit it there, and say clearly that
it still needs applying.
