# CURSOR PROMPT — Edit and resend quotes, with a revision trail

Quote **DD-1135** went to a client short a delivery line and there is currently no way to correct
it. `updateQuote()` exists in `src/app/admin/(panel)/quotes/actions.ts` and works — **but nothing
calls it.** There is no edit route; `/admin/quotes/[id]/page.tsx` never touches `QuoteBuilder`.

This wires it up, adds resending, and makes sure a changed quote leaves a record of what the
client was originally shown.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## The rule: a quote already sent is a document, not a draft

DD-1135 has been in the client's inbox since last night. Silently changing the numbers behind a
document someone is holding is how a disagreement becomes an argument with no way to settle it.
**Every edit after sending must leave the previous version intact and retrievable.**

This is not bureaucracy — it is the thing that lets Matt say *"you were sent revision 1 at R55 000,
here it is, and revision 2 at R58 500 followed on the 12th"* and be believed.

---

## Migration `0066_quote_revisions.sql`

```sql
alter table public.quotes
  add column if not exists revision integer not null default 1,
  add column if not exists last_sent_revision integer,
  add column if not exists reopened_at timestamptz,
  add column if not exists reopened_by uuid references auth.users(id),
  add column if not exists reopen_reason text;

create table public.quote_revisions (
  id            uuid primary key default gen_random_uuid(),
  quote_id      uuid not null references public.quotes(id) on delete cascade,
  revision      integer not null,
  snapshot      jsonb not null,   -- full header + items as sent
  subtotal      numeric not null,
  discount      numeric not null default 0,
  total         numeric not null,
  sent_at       timestamptz,
  sent_to       text,
  change_note   text,             -- what changed and why, for the next revision
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);
create unique index quote_revisions_key on public.quote_revisions(quote_id, revision);
create index quote_revisions_quote_idx on public.quote_revisions(quote_id, revision desc);
```

**Snapshot on send, not on edit.** A revision is "a version a client actually received". Snapshot
every draft edit and you get noise nobody will read; snapshot on send and every row corresponds to
something in someone's inbox.

RLS: `is_admin()` writes. Clients read revisions **of their own quotes only** — a buyer being able
to see what they were sent is the point. Route it through the same ownership check the portal
already uses for quotes; do not invent a second one.

Add `quote_revisions` to `trg_audit`. **No update or delete policy for anyone** — a revision
history that can be edited is not a history.

---

## Status rules — decide before building the UI

| Status | Edit | On save |
|---|---|---|
| `draft` | free | no revision, no warning |
| `sent` | allowed, with warning | revision bumps on **resend**, not on save |
| `accepted` | **blocked** until reopened | reopening requires a reason, drops status to `sent` |
| `converted` (has `converted_invoice_id`) | **blocked** | direct to the invoice |
| `declined` / `expired` / `cancelled` | allowed | returns to `draft`, keeps its number |

**Blocking an accepted quote matters.** The client agreed to a price; quietly changing it removes
their agreement from the record. Reopening is fine — it just has to be a deliberate act with a
reason attached, not a side effect of opening a form.

When a quote has a contract or payment against it, say so plainly before allowing an edit:
*"This quote has a signed contract and R10 000 received. Changing it will not change either."*

---

## Website

### 1. `/admin/quotes/[id]/edit`

Reuse `QuoteBuilder` — do not build a second editor. Prefill from the existing quote and its items.
Call the existing `updateQuote()`.

**One thing to fix in `updateQuote()`:** it deletes every `quote_items` row and re-inserts. That is
acceptable, but it means the audit log records the whole set as deleted and recreated on every
save. Add a `change_note` parameter written to the audit context, so the log says *"edited to add
delivery line"* rather than fourteen anonymous row operations.

Guard it server-side against the status table above. **Do not rely on the button being hidden** —
a blocked status must be rejected in the action, because the URL is guessable.

### 2. Resend

`sendQuoteToRecipient()` exists — reuse it. On resend of a quote already sent:

- Write a `quote_revisions` row snapshotting what is about to go out, with `revision = quotes.revision + 1`.
- Increment `quotes.revision`, set `last_sent_revision`, stamp `sent_at`.
- The PDF header shows **`DD-1135 · Revision 2`**. Same quote number — a client should not receive a second reference for the same puppy.
- The email says plainly that this replaces the earlier version, and why, using `change_note`: *"Revised to include delivery. This replaces the quote sent on 11 August."* An unexplained second PDF makes people think they are being double-charged.
- Ask for the change note **before** sending, not after. Default it to a summary of what changed (lines added/removed/repriced) and let Matt edit it.

Also fix: `sent_at` is reportedly not always stamped by `sendQuoteToRecipient` — there is an open
task on it. Verify it stamps on every path, including first send.

### 3. Revision history on the quote page

A panel listing each revision: number, date sent, recipient, total, change note, and a link to
re-download that revision's PDF from its snapshot. **Render the PDF from the stored snapshot, not
from current data**, or the history shows today's numbers under yesterday's date and is worthless.

### 4. Bigger description field

`QuoteLineItems.tsx` uses a single-line `<input>` for `description`. Replace with a **textarea**:

- 2 rows by default, auto-growing to about 6, then scrolling.
- Allow line breaks. Soft cap ~500 characters with a counter appearing past 400.
- Keep the grid layout working on mobile — the description should take the full width on narrow screens rather than being squeezed into a column.

**Then check the PDF actually wraps it.** `buildQuotePdf.ts` already has a `splitLines()` helper
for the address block — the line-item description must use the same treatment, and the row height
must grow with the text. A three-line description that renders as one clipped line, or overlaps
the amount column, is worse than the single-line field it replaced. Test with a genuinely long
description and look at the output before calling it done.

Do the same for invoice line items so quotes and invoices do not diverge.

### 5. Delivery presets — stop retyping the price from memory

The delivery line that went missing from DD-1135 had to be typed by hand, amount and all. Add an
admin-managed list so it becomes a pick, not a recollection.

Reuse the existing `pricing_tiers` pattern rather than inventing a new table — a small
`delivery_rates` table (label, amount, notes, active, sort_order) managed under admin settings,
or `pricing_tiers` rows with a `kind = 'delivery'` if that fits the existing shape better. Decide
by reading what is there; do not add a second pricing concept.

On the quote line, selecting item type `delivery` offers those presets and fills the description
and amount, still editable. **Seed the table empty with a clear empty state** — *"No delivery rates
set yet. Add one in Settings → Pricing."* Matt has not given the figures, and inventing a rate that
goes to a client on a quote is worse than an empty dropdown.

---

## App — `diedericks-dobermanns`

Matt quotes from his phone.

- Edit an existing quote reusing the app's quote builder, with the same server-side status guards.
- Resend with the change-note prompt.
- Revision history as a read-only list on the quote screen.
- Multi-line description input, growing with content.
- The **client portal** in both repos shows the current revision and, where more than one exists, a short line: *"Revised 12 Aug — replaces the version sent 11 Aug."* A buyer holding two PDFs needs to know which one counts.

---

## Rules

- Status guards enforced in the server action, never only in the UI.
- Revisions are append-only. No edit, no delete, for anyone.
- Historic PDFs render from their snapshot.
- The quote number never changes across revisions.
- No file over 300 lines — split the edit page from the builder.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.
- Do not revoke EXECUTE from PUBLIC on any function used by a policy — that caused a 6.7-hour outage in July.

## Verify

- [ ] Editing a `draft` quote changes nothing about revisions.
- [ ] Editing a `sent` quote warns first, and the revision only increments when it is **resent**.
- [ ] An `accepted` quote cannot be edited, including by going to the `/edit` URL directly.
- [ ] Reopening an accepted quote requires a reason, records who did it, and drops the status to `sent`.
- [ ] A quote converted to an invoice cannot be edited at all.
- [ ] Resending writes a `quote_revisions` row whose totals match the PDF that went out.
- [ ] Downloading revision 1 after revision 2 exists shows **revision 1's** numbers.
- [ ] Nobody, including an admin, can update or delete a `quote_revisions` row.
- [ ] A client can see revisions of their own quote and none of anyone else's — verify with a real client JWT.
- [ ] A 400-character description saves, wraps in the PDF, does not overlap the amount column, and the row grows to fit. Look at the rendered PDF.
- [ ] `sent_at` is stamped on first send and on every resend.
- [ ] **End to end on DD-1135**: add the delivery line, resend with a change note, confirm revision 2 exists, revision 1 is still retrievable, and the new total equals the sum of its lines in the database.
- [ ] A `delivery` line offers the preset list, and shows the "none set yet" empty state until Matt adds rates.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds** — build, not just types.
- [ ] App: `npx tsc --noEmit` exits 0, and `types/database.types.ts` is roughly its previous size, not double.

### Build the commit, not the working tree — this is not optional

**This morning's deploy failed three times** because `RegisterForm.tsx` imported five modules under
`src/lib/errors/` that were on disk but **not in the commit**. The local `npx next build` passed,
because it builds what is on disk. Vercel cloned the repo, found five imports pointing at nothing,
and failed.

So before pushing, verify the commit is self-contained:

```powershell
git clone --no-hardlinks . ../_buildcheck
cd ../_buildcheck; git checkout <the commit you are about to push>
npm ci; npx next build
cd ..; Remove-Item -Recurse -Force _buildcheck
```

- [ ] The clean checkout builds. **A build in the working tree does not count** — it cannot see a missing file that is sitting untracked next to it.
- [ ] After pushing, report the Vercel deployment status. Do not call this done on a green local build.

## Commit

Two repos, two commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Push both, then `git log origin/main -1` in each and confirm it matches `HEAD`.

Do not touch `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/lib/issues/capture.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`, or
`supabase/migrations/0061_contacts_dedupe.sql`.
