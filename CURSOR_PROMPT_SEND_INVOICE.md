# Cursor Prompt — Send an invoice to the client

## Do this first

1. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
2. `npx tsc --noEmit` in both when done. Paste the real output.

---

## The gap

A quote can be sent to its recipient. **An invoice cannot.** `InvoiceDetailClient.tsx` offers exactly
one action — *Download PDF*. There is no send, no email, no record that the client was ever told.

The invoice does reach the portal: the portal reads invoices scoped by `client_id`, so a client with
an account sees it the moment it is created. **But nobody tells them it is there.** Matt raises an
invoice and then has to remember to email or WhatsApp it himself, and nothing in the system records
that he did.

`invoices` has no `sent_at`, `sent_by` or `sent_to` column. So "has this been sent?" is currently
unanswerable.

Match what quotes already do — `sendQuoteToRecipient` is the pattern to follow, not to reinvent.

## Task

### 1. Migration, both repos

End with `notify pgrst, 'reload schema';`.

```sql
alter table public.invoices
  add column if not exists sent_at    timestamptz,
  add column if not exists sent_by    uuid references auth.users(id),
  add column if not exists sent_to    text,
  add column if not exists send_count integer not null default 0;

comment on column public.invoices.sent_at is
  'When the invoice was last emailed to the client. Null means the client has never been told it exists.';
```

`send_count` because resending is normal — a client loses the mail, the address was wrong — and the
count is how Matt sees that a chase has already happened.

### 2. A Send invoice action

On the invoice screen, beside *Download PDF*. A server action that:

1. Renders the same PDF `exportPDF.ts` produces for download — **the same bank-block routing must
   apply**, so an international client's emailed PDF carries the Discovery account and the Nelspruit
   beneficiary address, exactly as the downloaded one does. Call the same code path; do not build a
   second renderer.
2. Emails it to the client, using the same mail transport the quote send uses.
3. Stamps `sent_at`, `sent_by`, `sent_to`, and increments `send_count`.
4. Returns a success message naming the address it went to: **"Invoice DD-xxxx emailed to
   xana…@gmail.com"**.

**Confirm before sending.** A dialog showing the recipient address and the total, with Send and
Cancel. An invoice going to the wrong address is worse than one not sent, and this is the last point
at which a typo in a contact record is catchable.

**Never send automatically on invoice creation.** Matt decides when a client is told.

### 3. Show the state on screen

- Never sent → *Not sent yet*, and the Send button reads **Send invoice**
- Sent → *Sent 18 Sep 2026 to xana…@gmail.com*, button reads **Resend**, and resending needs a second
  confirm naming the send count: *"This invoice has been sent twice already. Send again?"*

Add a **Sent** column to the invoices list so Matt can see at a glance which ones the client has never
been told about. That list is the follow-up queue.

### 4. Tell the portal user too

If the invoice has a `client_id` with a portal account, write the same in-app notification the quote
flow writes, linking to the invoice in the portal. The email and the portal notification are one
action, not two.

**If there is no `client_id` or no portal account**, the send still works by email — say so in the
result — and the UI must not imply a portal link the client cannot open.

### 5. Email content

Short and plain: invoice number, total, due date, the reference to quote on payment, and the PDF
attached. **The bank details live in the PDF, not the email body** — one place, so a change to the
banking settings can never leave a stale account number in an email template.

Subject: `Invoice DD-1170 — Diedericks Dobermanns`.

### 6. Tests

- Sending stamps all four columns and increments the count
- A second send increments to 2 and does not overwrite the first `sent_at`… decide: keep `sent_at` as
  *last* sent and say so in the comment, or add `first_sent_at`. **State which you chose.**
- The emailed PDF for a Namibian client contains `16916528231` and the Nelspruit address
- An invoice with no `client_id` sends by email and creates no portal notification
- A failed email does **not** stamp `sent_at` — a half-send that looks successful is the worst
  outcome here

---

## Do not

- Do not send automatically when an invoice is created or when a quote converts.
- Do not build a second PDF renderer or a second bank-details path.
- Do not put bank details in the email body.
- Do not stamp `sent_at` unless the mail transport confirmed the send.
- Do not email anyone while testing. Use a dry-run flag or a local transport, and say which.
- Do not create test invoices, contacts or clients in production.

---

## Report

1. The migration, with the columns read back from the live database.
2. The confirm dialog and the sent-state UI, both states.
3. A dry-run send of DD-1170 showing the recipient, the stamped columns, and the bank block in the
   attached PDF.
4. Your decision on `sent_at` versus `first_sent_at`.
5. What happens when the mail transport fails.
6. `npx tsc --noEmit` clean in both repos.
