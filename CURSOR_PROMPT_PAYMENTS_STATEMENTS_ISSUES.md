# CURSOR PROMPT — Payments, client statements, and problem reporting

Three things: record money properly, let a client download a statement, and make sure a
broken page is noticed by someone other than the person it broke for.

**Repo:** `diedericksdobermann-web` (mirror to the app per the standing parity rule).
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## The schema is already applied — do not create these

Applied to the live database on 11 Aug 2026.

```
payments(id, invoice_id, client_id, amount, paid_at, method, reference,
         proof_document_id, notes, recorded_by, created_at)
    method: eft | cash | card | other

issue_reports(id, source, severity, status, title, detail, page_path,
              user_agent, reported_by, reporter_role, error_message,
              error_stack, fingerprint, occurrence_count, last_seen_at,
              screenshot_document_id, admin_notes, resolved_by, resolved_at,
              created_at)
    source: reported | captured
    severity: low | normal | high | critical
    status: open | investigating | resolved | wont_fix | duplicate
```

**`invoices.amount_paid`, `amount_outstanding`, `status` and `paid_date` are now
maintained by a database trigger** (`sync_invoice_payment_totals`) that recomputes them
from the payments ledger on every insert, update and delete.

**Never write to those four columns from application code.** Insert a payment row and let
the trigger do it. Two places holding the same truth is how "paid" and "outstanding"
start disagreeing, and a statement that contradicts an invoice is worse than no statement.

---

## 1. Record a payment

On the admin invoice detail page, a **Record payment** panel:

- Amount, date paid, method (EFT / cash / card / other), reference, notes.
- Default the amount to the outstanding balance — most payments settle the invoice, and
  the common case should be one click.
- Show the running ledger beneath: every payment against this invoice, with a total and
  the remaining balance.
- Editing or deleting a payment is allowed for admins and must recompute correctly. The
  trigger handles it; do not adjust the invoice by hand.

**Link it to the proof.** When payment is confirmed from a quote's proof-of-payment
(`confirmQuotePayment`), create the payment row with `proof_document_id` set to that
proof. A statement line should be traceable back to the screenshot it was accepted on.

**Do not let a client record a payment.** RLS is read-only for them; the UI must not
offer it either.

### Overpayment

If a payment would take the total above the invoice amount, warn but allow — deposits get
rounded up and clients pay in odd amounts. `amount_outstanding` floors at zero. Show the
credit plainly rather than hiding it.

## 2. Client statements

A statement answers one question: *what have I been charged, what have I paid, what do I
owe?*

### The screen — `portal/(panel)/invoices` (extend, do not replace)

Above the invoice list, a statement summary:

- Total invoiced, total paid, balance outstanding.
- A chronological ledger: invoices raised and payments received, interleaved by date,
  with a running balance.
- A date-range filter, defaulting to everything.

### The download

**Download statement** producing a PDF on the same letterhead as the quote. Reuse
`buildQuotePdf`'s approach and the shared `CompanyProfile` — one visual identity across
quotes, invoices and statements.

The statement shows:

- Kennel and client details, statement date, period covered.
- The ledger: date, description (`Invoice DD-INV-1133` / `Payment received — EFT`),
  charge, payment, running balance.
- Closing balance, prominently.
- Banking details **only when a balance is outstanding**. A statement showing nothing owed
  should not look like a demand for money.

Admins get the same statement for any client from the client detail page — that is what
gets emailed when someone asks "what do I still owe?".

### Rules that matter

- Money is `numeric`. Format with `formatAmount`. Never float arithmetic.
- The running balance must be computed in order of `paid_at` / `issue_date`, not insertion
  order.
- A client sees only their own. RLS enforces it; do not pass a client id from the URL.
- Historical invoices (`source = 'historical_import'`, prefixes `HIST-` and `DBP-`) must
  appear. Those are real sales and a client asking for a statement will expect them.

## 3. Problem reporting and error capture

### a) Report a problem

- Discreet **Report a problem** link in the admin footer and the portal footer.
- Modal: what were you doing, what happened, optional screenshot.
- Captures `page_path` and `user_agent` automatically — the reporter should not have to
  know or explain where they were.
- Writes `issue_reports` with `source = 'reported'`, `reported_by` set to the signed-in
  user, `reporter_role` to their role.
- Emails admins through the existing `kennelAlerts` fan-out.
- Confirm receipt plainly: *"Thank you — we have logged this."*

### b) Automatic capture

This is the part that matters. Three failures today went unnoticed for weeks because
nothing recorded them.

- A global error boundary and a server-side handler that write `issue_reports` with
  `source = 'captured'`, the message, the stack, the path and the user.
- **Group repeats with `fingerprint`** — a stable hash of the error message plus the
  route. One broken page must be one row with `occurrence_count` climbing and
  `last_seen_at` moving, not four hundred rows. There is already a unique index on
  `fingerprint`; use it with an upsert.
- Email admins on the **first** occurrence of a fingerprint and on escalation to
  `critical`. Never on every occurrence — an inbox full of the same error is an inbox
  nobody reads.
- Capturing an error must never itself throw. Wrap it; if logging fails, log to console
  and move on.

### c) Admin view — `/admin/issues`

- Open issues first, ordered by severity then most recent.
- Filter by status, severity and source.
- Each row: title, path, occurrence count, first and last seen, who reported it.
- Change status, add notes, mark resolved.
- A badge in the admin sidebar showing the open count.

---

## Rules

- `requireAdmin()` on every admin action. Portal routes use the request-scoped client so
  RLS applies. No `createAdminClient()` in a portal route.
- Never throw in a portal page — return an empty state and log.
- Loading, empty and populated states everywhere.
- No file over 300 lines.
- Mirror the portal screens into the app repo.

## Verify

- [ ] Recording a payment updates the invoice's paid and outstanding totals without any code touching those columns.
- [ ] Two part-payments settle an invoice and set its status to paid.
- [ ] Deleting a payment restores the correct outstanding balance.
- [ ] Confirming a quote's proof of payment creates a payment row linked to that proof document.
- [ ] The client statement's closing balance matches the sum of their invoices minus payments.
- [ ] Historical `HIST-` and `DBP-` invoices appear on the statement.
- [ ] The statement PDF renders on the same letterhead as a quote, and omits banking details when nothing is owed.
- [ ] A second client sees none of the first client's invoices, payments or statement.
- [ ] The same error hit ten times produces one `issue_reports` row with `occurrence_count` 10, and one email.
- [ ] A failure inside the error capture itself does not break the page it was reporting on.
- [ ] `npx tsc --noEmit` exits 0; `npx next build` succeeds.

## Commit

From `diedericksdobermann-web/`, `git add -A`, one commit, after confirming
`git ls-files --others --exclude-standard src/` is empty. Then `git push origin main`.
No migration is needed — the schema is already live.

Do not touch `src/lib/portal/dogs.ts` or `src/lib/portal/training.ts` — the ownership
scoping in those was a security fix and must not be reverted to relying on RLS alone.
