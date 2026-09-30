# Cursor Prompt — The client record, and clients who pre-date the pipeline

## Do this first

1. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
2. `npx tsc --noEmit` in both, plus `npm run parity`. Paste the real output.

---

## What prompted this

Matt asked where Gerhard Nagel is — he bought Bruce for R55 000 and is "nowhere: not on the
waiting list, not in quotes, not in fulfilment, not even on applications."

He is right, and **he is not an exception.** Live counts, checked today:

| | |
|---|---|
| Contacts | 279 |
| Sold dogs | 140 |
| Sold dogs with a `buyer_contact_id` | **24** |
| Sold dogs carrying only `new_owner_name` text | **94** |
| Invoices | 186 |
| Invoices linked to a dog (`dog_id`) | **10** |
| Invoices linked to a client (`client_id`) | **11** |
| Waiting list / quotes / applications / reservations | 21 / 36 / 34 / 1 |

The application → waiting list → quote → invoice → fulfilment pipeline only ever ran for
clients who arrived *after* the platform went live. Roughly 140 historical sales sit outside
it as loose contacts and loose invoices.

**Do not fix this by back-filling fake pipeline rows.** Inventing an application Gerhard never
submitted, or a waiting-list entry he was never on, puts fiction in the audit trail and makes
every funnel and conversion number wrong. The conversion rate is already tracked and reported
in the daily health check; polluting it with 140 invented applications would be worse than the
gap.

**Fix it by making the client record work without a pipeline.** A contact, a dog and an
invoice is a complete commercial history for a pre-system sale. The UI just cannot show it.

---

## Bug 1 — The contact page has no money on it

`src/app/admin/(panel)/contacts/[id]/page.tsx` (102 lines) shows the contact form and the
dogs linked via `fetchContactDogs`. It never queries `invoices`, `invoice_payments`,
`waiting_list`, `quotes` or `applications`.

So Gerhard's page will show Bruce but not that he owes **R45 000**.

**Build a real client record on that page:**

- **Financial summary at the top**: total invoiced, total paid, **outstanding**. Outstanding in
  amber when non-zero. This is the number Matt opens the page for.
- **Invoices**, newest first, each linking to `/admin/finance/invoices/{id}`, with status chip
  and outstanding amount.
- **Payments**, with date, amount, method and reference.
- **Dogs**, as now, but showing which invoice each dog is on.
- **Pipeline section** — waiting list entries, quotes, applications — which for a historical
  client will be empty. When it is empty, say so plainly and correctly:

  > No application or waiting-list history — this sale pre-dates the online pipeline.

  Not "No records found", which reads like a bug. Decide this from the data: if the contact's
  earliest invoice pre-dates the platform and there is no pipeline row, it is a historical
  sale, not a missing record.

Query by `buyer_contact_id` **and** `owner_contact_id` on dogs, and pick up invoices both
directly and via the dog. A contact can be a buyer without being the current owner.

## Bug 2 — Invoices are not linked to dogs or clients

Ten of 186 invoices name a dog. When Matt opens invoice 1087 he cannot see it was for Bruce,
and from Bruce he cannot reach the invoice.

**Build a linking UI, not an auto-matcher:**

- On the invoice detail page, a "Link to dog" picker and a "Link to contact" picker.
- On the dog profile, show the linked invoice and its outstanding balance.
- Suggestions are allowed — offer dogs whose `new_owner_name` resembles the contact, showing
  both strings — but **a human confirms every link.** Never set `buyer_contact_id`,
  `owner_contact_id` or `client_id` from a name match.

That last rule is not negotiable. `buyer_contact_id` drives portal scoping: a wrong link means
one client sees another client's dog, and this platform has already shipped that bug once.

There are **94** sold dogs carrying only `new_owner_name`. A screen that walks Matt through
confirming them one at a time, with the contact suggestions beside each, is worth building —
as a review queue he works through, never as a batch job that runs itself.

## Bug 3 — `amount_paid` can be set with no payments behind it

Invoice 1087 was imported from the old Speed Invoice system and bulk-settled on 31 Aug 2026
with `amount_paid = 55000` and **zero rows in `invoice_payments`**. It was wrong: only a
R10 000 deposit had been received.

The trigger `sync_invoice_amount_paid` recomputes `amount_paid` from the payment rows, so the
moment a real payment was recorded the fiction collapsed and the true R45 000 outstanding
appeared. That is the trigger working correctly — the fault is that a bulk UPDATE was able to
write a paid figure the payments did not support in the first place.

**Find every other invoice in that state and show them to Matt:**

```sql
select i.invoice_number, i.issue_date, i.total_amount, i.amount_paid, i.status
from public.invoices i
where i.amount_paid > 0
  and not exists (select 1 from public.invoice_payments p where p.invoice_id = i.id)
order by i.issue_date;
```

Build this as a finance screen — **"Paid with no payment record"** — not a one-off script.
Each row needs Matt to say what actually happened, exactly as he just did for Gerhard. Do not
auto-correct them: some will be genuinely paid and merely undocumented, and zeroing those
would invent debts for clients who owe nothing.

---

## Already done — do not redo

Applied live today, backed up in `dbp_import.litter_data_fixes`:

- Bruce (`f4fb4826-cb2a-4294-9f42-ce4b6ff20348`): `status='sold'`, `price=55000`,
  `buyer_contact_id` and `owner_contact_id` → Gerhard Nagel
  (`83a7ac07-5ac9-4dee-9819-7a683c5f574e`), `ownership_status='with_owner'`.
- Invoice **1087** linked to Bruce via `dog_id`.
- Payment recorded: **R10 000, 9 Jun 2026, EFT**. Invoice is now `partially_paid`,
  **R45 000 outstanding**. Matt confirmed this on 29 Sep 2026.

Gerhard already existed as a contact with the correct phone number — no duplicate was created.
Check for an existing contact before creating one; there are already 279 and a duplicates
screen exists because this has gone wrong before.

**`invoices.client_id` references `users`, not `contacts`.** Gerhard has no portal account, so
his invoice cannot carry a `client_id` at all. Any client-record query that joins only through
`client_id` will miss every historical client. Join through the contact and through the dog.

If Matt later wants Gerhard in the portal, that is an invite flow creating a `users` row linked
to his contact — not something to fabricate here.

---

## Tests

- Gerhard's contact page shows R55 000 invoiced, R10 000 paid, **R45 000 outstanding**, Bruce,
  invoice 1087, and the 9 Jun payment.
- His pipeline section reads as a pre-system sale, not as an error.
- A contact with no invoices shows zeros, not a crash.
- Linking an invoice to a dog is reversible and audited.
- No code path sets `buyer_contact_id`, `owner_contact_id` or `client_id` without an explicit
  human confirmation.
- The "paid with no payment record" screen lists invoice 1087 as resolved and shows the rest.

## Do not

- Do not create applications, waiting-list entries, quotes or reservations for historical
  clients.
- Do not auto-link contacts to dogs or invoices by name.
- Do not auto-correct `amount_paid` on the invoices found by Bug 3.
- Do not create test contacts, invoices or payments in production.

## Report

1. Gerhard's contact page showing R45 000 outstanding. Screenshot.
2. The invoice↔dog link working in both directions.
3. The "paid with no payment record" list, with its row count.
4. Proof no automatic name-based linking exists — show the confirmation step.
5. `npx tsc --noEmit` clean in both repos, `npm run parity` clean.
