# Cursor Prompt — Let Matt move an application between tiers

## Do this first

1. Read the whole file before changing anything.
2. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
3. Migration number: highest on disk is `0179`, so this is **0180**. Byte-identical in both folders.
4. Do not apply the migration. Matt applies it.
5. `npx tsc --noEmit` in both repos when done. Paste the real output.

---

## The situation

A client applied for a **Standard Puppy** and has since decided they want an **Elite Developed Puppy**. There is no way to change it. Matt's only options today are to ask them to apply again — which loses their place and their history — or to edit the database by hand.

This will keep happening in both directions. People trade up once they understand the development programme, and people trade down when the price lands.

**Current state, checked on 14 September 2026:**

- `applications.budget_range` holds the applicant's answer: `standard` (18), `elite` (8), `open` (1).
- `pricing_tiers` holds the money: Standard **R20,000**, Elite Developed **R60,000**, Elite Family Protection **price on request**.
- `dogs.programme_tier` uses different keys — `puppy`, `elite_developed`, `protection_dog`. 32 dogs are tagged.

**Those two vocabularies do not match, and that is part of the job.** `budget_range` says `elite`; the tier key says `elite_developed`. Map them explicitly in one place — do not let the mismatch spread further.

---

## Task 1 — Migration 0180

**Never overwrite what the applicant said.** `budget_range` is their own answer on their own form and it stays as a permanent record. Add a separate field for what was agreed afterwards.

```sql
-- 0180_application_agreed_tier.sql
-- An applicant's stated budget and the tier finally agreed are two different
-- facts. budget_range stays exactly as they submitted it. agreed_tier records
-- what Matt and the client settled on, with a reason and an audit trail.

alter table public.applications
  add column if not exists agreed_tier        text
    references public.pricing_tiers(tier_key),
  add column if not exists agreed_tier_at     timestamptz,
  add column if not exists agreed_tier_by     uuid references auth.users(id),
  add column if not exists agreed_tier_reason text;

create index if not exists applications_agreed_tier_idx
  on public.applications (agreed_tier)
  where agreed_tier is not null;

notify pgrst, 'reload schema';
```

The foreign key to `pricing_tiers(tier_key)` is deliberate — a tier that does not exist becomes impossible, and the list grows from the settings screen without a deploy.

---

## Task 2 — The change action

On the application detail screen, **both platforms**, a **Change tier** action.

- Show the applicant's original answer as read-only: *"Applied for: Standard Puppy"*.
- Choose the new tier from `pricing_tiers` where `is_public`, showing the label and the price so Matt sees the difference he is about to create.
- Require a **reason** — free text, one line. *"Client called, wants the development programme."* Six months from now that sentence is the only thing that explains the price on the invoice.
- Show the price difference plainly before saving: *"R20,000 → R60,000, an increase of R40,000."*
- On save: set `agreed_tier`, `agreed_tier_at`, `agreed_tier_by`, `agreed_tier_reason`, and write an `application_events` row.

Everywhere the tier is displayed after this, show `agreed_tier` if set, otherwise `budget_range` — and where they differ, show both: **Elite Developed** *(applied for Standard)*.

## Task 3 — What it must touch, and what it must not

A tier change is a money change. It has to reach the things that carry money, without quietly rewriting them.

**Waiting list.** If the applicant has a `waiting_list` entry, update its tier to match. **Their position must not change** — this is the same rule as the multi-dog work: changing what they want never costs them their place in the queue.

**Existing quotes.** If a quote already exists at the old tier, **do not edit it.** Flag it on screen — *"This quote was issued at the Standard price and no longer matches the agreed tier"* — with a button to create a revision. A quote already sent to a client is a document they hold; silently changing the number behind it is not acceptable.

**Invoices and payments.** Never touch them. If a deposit has been paid at the old tier, show that clearly on the change screen **before** Matt confirms: *"A deposit of R5,000 has already been received against the Standard tier."* He needs to know that before, not after.

**Allocated dog.** If a dog is already allocated and its `programme_tier` no longer matches, show a warning. Do not change the dog — the dog is what it is; the application is what moved.

## Task 4 — Tell the client, but do not send it

Generate a draft email explaining the change and the new price, and **show it to Matt to send himself**.

**Do not send automatically.** Standing rule on this project: nothing goes to a client without Matt reading it first. A price change email that goes out unreviewed is the worst possible thing to get wrong.

Keep the draft warm and factual — what they asked for, what it now includes, what it costs, what happens next. Match the tone of the existing applicant emails in `src/lib/notifications/applicantEmails.ts`.

---

## Do not

- Do not overwrite `budget_range`. It is the applicant's own answer and it is evidence.
- Do not change a waiting list position.
- Do not edit a quote that has already been sent — revise it.
- Do not touch invoices, payments or contracts.
- Do not send any email automatically.
- Do not add tier keys in code. They come from `pricing_tiers`.

---

## Report

1. `0180` in both migration folders, byte-identical. Show the diff.
2. Screenshot of the Change tier screen showing the price difference and the required reason field.
3. Screenshot of an application where the two differ, displaying **Elite Developed** *(applied for Standard)*.
4. The stale-quote warning, with the revise button.
5. The `application_events` row written by a change — paste it.
6. Confirmation that `budget_range` was not modified — show before and after.
7. `npx tsc --noEmit` clean in both repos.

**Then do the real one.** Matt has a live client who applied Standard and wants Elite Developed. Ask him which application it is rather than guessing, change it through the new screen, and show him the result. **Do not create a test application to prove this works** — use the real case, which is what the feature is for.
