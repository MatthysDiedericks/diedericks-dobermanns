# CURSOR PROMPT — Quick quote by email, quote types, and recurring training invoices

Three connected problems, all triggered by one real case: **a client who already bought a dog now
wants board & train for the next period.** She does not need a second relationship with the
business, Matt should not have to make her sign up before he can quote her, and her training money
must not disappear into the same pile as puppy sales.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato. Rands.
**Next free migration: `0144`.** `0142` is reserved by the portal-members prompt and `0143` by the
pedigree prompt. Do not reuse either.

---

## Ground truth — I checked the live database before writing this

```
130 sold dogs, but only   2 have owner_id pointing at a portal account
 95 contacts have an email and NO account · 17 are linked to one
 17 quotes exist ·  5 already sit on contact_id with client_id NULL
catalogue_items already has item_type 'board_train' and 'training'
recurring exists ONLY on expenses (is_recurring, recurrence_interval, recurrence_end_date)
quotes has NO type/category column · invoices has NO type and no recurring support
```

Two things follow, and they shape everything below.

**Quoting a contact who has no portal account already works and is already normal** — 5 of 17
quotes do it. So the answer to "do I make her create a profile first?" is **no**. Never gate a sale
on the client doing admin. Quote the contact; if she ever registers with that email,
`claim_my_records()` attaches the quote, the invoice and the documents to her account
automatically. That function is live and I verified it today — it matches quotes via `contact_id`
on a lowercased email.

**The app's quick quote cannot capture an email at all.** `components/finance/AppQuoteBuilder.tsx`
has `walkinName` and writes it to `quotes.historical_client_name` — a legacy import field. No email,
no contact row, so there is nothing to send the quote to and nothing to link later. That is the
actual bug behind "I need to be able to do a quick email add, and send."

---

## 1. Quick quote — capture the email, create the contact, send

### Replace the walk-in name with a real contact capture

In `AppQuoteBuilder.tsx` (app) and the equivalent web quote builder, the "walk-in" path becomes:

- **Name** (required)
- **Email** (required to send; a quote with no email can still be saved as a draft and printed)
- **Phone** (optional)

On save, **create-or-find a `contacts` row** on `lower(trim(email))` and set `quotes.contact_id`.
Do not write `historical_client_name` any more for new quotes — leave the column alone for the
imported history that already uses it.

Matching rules, in order:
1. An existing `contacts` row with the same lowercased email → reuse it. **Do not create a
   duplicate.** There are already 95 unlinked contacts and a dedupe migration in the history
   (`0068_contacts_dedupe.sql`); do not add to the problem.
2. Otherwise create a contact with `source = 'manual'`.
3. If that email belongs to a `users` row, set `quotes.client_id` **as well** so it lands straight
   in her portal.

Rule 3 is the case in the brief: she bought a dog, so she may well already have an account. **Look
her up before treating her as new.** The builder should show, inline and before saving, either
"Existing client — this will appear in her portal" or "New contact — she has no portal account yet",
so Matt can see which is happening.

### A contact picker that is actually fast

Typing an email should search existing contacts as he types and offer them. Three taps to quote a
returning client is the target. Search `contacts` on email and full name, most recently used first.

### Send
Reuse the existing quote send path (`sendQuoteToRecipient` and `src/lib/notifications/quoteSentEmail.ts`).
Do not write a second sender.

> **Matt's standing rule: nothing is emailed without his explicit press.** The builder may prepare
> and preview the mail, but the send is always a deliberate action on a screen he is looking at.
> No auto-send on save, no background send, no "send on schedule".

---

## 2. Quote and invoice types — keep training money out of the puppy pile

### Migration `0144`

```sql
alter table public.quotes
  add column quote_type text not null default 'dog_sale'
  check (quote_type in ('dog_sale','training','board_train','stud_fee','other'));

alter table public.invoices
  add column invoice_type text not null default 'dog_sale'
  check (invoice_type in ('dog_sale','training','board_train','stud_fee','other'));

create index quotes_type_idx   on public.quotes (quote_type, created_at desc);
create index invoices_type_idx on public.invoices (invoice_type, issue_date desc);
```

**Backfill deliberately, do not guess.** Every existing row defaults to `dog_sale`. Before
finalising, run the check below and report it — if any existing quote is plainly training, tell Matt
and let him decide rather than reclassifying revenue history yourself:

```sql
select q.id, q.quote_number, q.total, string_agg(distinct ci.item_type, ',') as item_types
from quotes q
join quote_line_items li on li.quote_id = q.id
left join catalogue_items ci on ci.id = li.catalogue_item_id
group by q.id, q.quote_number, q.total
having string_agg(distinct ci.item_type, ',') like '%train%';
```

### Default the type from the line items
`catalogue_items.item_type` already carries `board_train` and `training`. When the quote's lines are
predominantly training items, default `quote_type` accordingly — but leave it **editable**, and
never silently change a type Matt has set by hand. A mixed quote (puppy + board & train) stays
`dog_sale`; the dog is the headline.

### Carry the type through conversion
When a quote becomes an invoice, `invoice_type` inherits `quote_type`. A training quote that becomes
a `dog_sale` invoice makes the revenue split useless.

### Where the type shows up
- **Quote list and invoice list**, web and app: filter chips — `All · Dogs · Training · Other`.
  Remember the last choice in `localStorage` / async storage. This is the "hiddable" ask: Matt
  wants to look at dog quotes without training clutter and vice versa. Default the filter to **All**
  so nothing is invisible by surprise — a hidden quote that gets forgotten is worse than a busy list.
- **A type badge on every row.** Filtering is useless if you cannot tell what you are looking at
  once the filter is off.
- **Finance reports:** split revenue by type. This is the real prize — Matt currently cannot answer
  "what did training earn last quarter?" separately from puppy sales. Add the split to the existing
  reports rather than building a new screen.

---

## 3. Recurring invoices — for the training block

### Follow the pattern that already exists
`expenses` already has `is_recurring`, `recurrence_interval`, `recurrence_end_date`, and the app has
`app/(admin)/finance/expenses/recurring.tsx`. **Mirror that shape and that screen** rather than
inventing a second vocabulary for the same idea. Money out and money in should read the same way.

```sql
create table public.recurring_invoices (
  id uuid primary key default gen_random_uuid(),

  client_id  uuid references auth.users(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  dog_id     uuid references public.dogs(id) on delete set null,

  invoice_type text not null default 'training'
    check (invoice_type in ('dog_sale','training','board_train','stud_fee','other')),

  description text not null,
  amount numeric not null check (amount >= 0),
  currency text not null default 'ZAR',

  -- Same vocabulary as expenses.recurrence_interval. Read that column's values
  -- and reuse them exactly; do not invent 'monthly' if expenses says 'month'.
  recurrence_interval text not null,
  next_issue_date date not null,
  recurrence_end_date date,
  occurrences_remaining integer,

  is_active boolean not null default true,
  last_generated_invoice_id uuid references public.invoices(id) on delete set null,
  last_generated_at timestamptz,

  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint recurring_invoice_has_a_recipient
    check (client_id is not null or contact_id is not null)
);

alter table public.invoices
  add column recurring_invoice_id uuid references public.recurring_invoices(id) on delete set null;
```

That last constraint matters: a schedule with no recipient generates invoices addressed to nobody.

### The generator — drafts, never sends

A daily cron picks up rows where `is_active` and `next_issue_date <= current_date`, creates an
invoice with `status = 'draft'`, stamps `recurring_invoice_id`, advances `next_issue_date`, and
decrements `occurrences_remaining`. Then it **stops** and notifies Matt that a draft is waiting.

> **It must not email the client. Ever.** Matt's rule is absolute and it is also simply correct
> here: a board & train invoice that goes out automatically while the dog is not actually booked in
> is a refund and an awkward phone call. Generate the draft, tell Matt, let him press send.

Deactivate the schedule when `recurrence_end_date` passes or `occurrences_remaining` hits zero.
Model the cron on `notify-pending-applications`, which already exists and works.

**Idempotency.** If the cron runs twice in a day it must not produce two invoices. Guard on
`last_generated_at::date = current_date` for that schedule, and say in your report how you tested a
double run.

### UI
- Admin screen **Finance › Recurring invoices**, web and app, mirroring the recurring expenses
  screen: list, create, pause, resume, end.
- On creating one, show the next three issue dates in plain language — *"Issues 1 Oct, 1 Nov, 1 Dec,
  then stops"*. A recurrence rule nobody can read is a recurrence rule that bills wrong.
- On the invoice itself, a quiet line: *"From the recurring schedule: Board & train — monthly."*
  linking back to the schedule.

---

## 4. Files

Read first:
- `diedericks-dobermanns/components/finance/AppQuoteBuilder.tsx` — the `walkinName` path being replaced
- `diedericks-dobermanns/lib/finance/commitAppQuote.ts`, `buildAppQuotePrefill.ts`, `appQuoteBuilderSeed.ts`
- `diedericks-dobermanns/app/(admin)/quotes/new.tsx` — passes `walkinName` / `walkinContact` params
- `diedericks-dobermanns/app/(admin)/finance/expenses/recurring.tsx` — the pattern to mirror
- `src/lib/finance/quoteBuilderSave.ts`, `src/app/admin/(panel)/quotes/send-actions.ts`
- `src/lib/notifications/quoteSentEmail.ts`
- `claim_my_records()` in the database — understand how a contact-only quote later attaches to an
  account, and do not break it. It matches on `lower(trim(email))`.

## 5. Rules
- No file over 300 lines. TypeScript strict, no `any`. Regenerate `database.types.ts` after `0144`.
- Migration byte-identical in **both** repos' `supabase/migrations/` — they are at 139 matching
  files and must stay that way.
- Website and app parity is a standing rule on this project. Both, or it is not done.
- Never create a duplicate contact for an email that already exists.
- Nothing sends automatically. Ever.
- `ls` each app file you touch and paste the output. **Do not rely on grep — it has returned false
  negatives on this filesystem.**

## 6. Verify — paste output, not descriptions

**Quick quote**
- [ ] On the **app**, quote a brand-new person by typing name + email. Paste the created `contacts`
      row and the `quotes` row showing `contact_id` set and `historical_client_name` null.
- [ ] Quote the **same email again**. Confirm **no** second contact row is created. Paste the count
      before and after.
- [ ] Quote an email that belongs to an existing `users` account. Confirm `client_id` is set too,
      and that the quote appears in that client's portal. Screenshot the portal.
- [ ] Confirm the builder tells Matt which case he is in before he saves. Screenshot both states.
- [ ] Send a quote from the app and confirm the email arrives. Confirm it only went when the send
      button was pressed.

**Types**
- [ ] Paste the result of the training-item backfill query above. State what you did about any rows
      it returned — do not silently reclassify.
- [ ] Build a quote from `board_train` catalogue items. Confirm `quote_type` defaults to training and
      is still editable. Screenshot.
- [ ] Convert it to an invoice. Confirm `invoice_type` inherited. Paste both rows.
- [ ] Filter chips on quotes and invoices, web and app. Screenshot each of `All / Dogs / Training`.
- [ ] Confirm the default filter is **All** and that no quote is invisible by default.
- [ ] Finance report shows revenue split by type. Screenshot.

**Recurring**
- [ ] Create a monthly board & train schedule for a real contact. Paste the row and screenshot the
      "next three dates" preview.
- [ ] Run the generator. Confirm exactly one **draft** invoice, `recurring_invoice_id` stamped,
      `next_issue_date` advanced. Paste before and after.
- [ ] **Run the generator twice in the same day. Confirm one invoice, not two.** Paste the proof.
- [ ] Confirm **no email was sent** to the client by the generator. Paste `notifications_log` for
      that window showing nothing went out.
- [ ] Let a schedule reach `recurrence_end_date`. Confirm it deactivates and stops generating.
- [ ] Confirm a schedule cannot be saved with neither `client_id` nor `contact_id`. Paste the
      constraint violation.

**Regression**
- [ ] Existing quotes still open, send and convert. The 5 quotes already on `contact_id` with a null
      `client_id` must be untouched — paste them before and after.
- [ ] `npx tsc --noEmit` clean in both repos. `npm run preflight` passes on the website.
- [ ] App: both screens on a device. Say which device.

### Prove it reached the remote
- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes. The website repo
      was found one commit ahead of `origin/main` on 31 Aug — committed, never pushed, so nothing
      deployed. Check this before saying you are done.
- [ ] Vercel reaches **Ready** on **`diedericksdobermanns-web-v145`** — the project bound to the live
      domain. The other three are duplicates; ignore them.
- [ ] Migration `0144` applied live and present in both repos.

## 7. Commit
Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`,
`scripts/send-portal-invite-emails.mjs`.
