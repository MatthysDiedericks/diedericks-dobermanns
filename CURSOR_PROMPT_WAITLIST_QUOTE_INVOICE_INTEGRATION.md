# Cursor Prompt — Wire Waiting List to Quotes + Invoices (End-to-End Sales Process), Plus a Manual Fast-Track Path

## Context

Diedericks Dobermanns app. Supabase project `nlmwxodvquwbjinhhbmr`. Brand: `#111008` bg / `#C4A35A` gold / `#F5F0E8` text.

**The intended business process:** applicant fills the public application form → admin reviews it → admin sends a quote → client pays a deposit → they're on the waiting list, matched to a puppy → at handover, they receive an invoice for the balance due on delivery. Separately, there needs to be a **fast-track path** for leads that never fill out a full application: admin manually creates a quote, sends it by email or WhatsApp, and if the client pays, they go straight onto the waiting list.

**What's already built and correct — do not rebuild:**
- `lib/waitlist/constants.ts`'s `PIPELINE_STAGES` (`enquiry → application → approved → quote_sent → deposit_paid → matched → reserved → handover_complete`) already matches this process almost exactly.
- `app/(admin)/applications/[id].tsx` — full review screen, Approve/Waitlist/Reject actions, and an "Add to Waiting List" button that calls `createWaitlistFromApplication()` once approved. This already correctly bridges "receive form → review it → onto waiting list." Don't touch it.
- The Quote System (migration `0039_quote_system.sql`, `lib/finance/quoteQueries.ts`, `hooks/useQuotes.ts`, `app/(admin)/quotes/*`) — fully built, live, correct. Real `quotes`/`quote_items` tables, auto-numbering, RLS, and a `convert_quote_to_invoice` RPC that atomically turns a quote into a real invoice. Use this as-is; do not create a second quote system.
- `app/(admin)/waitlist/[id].tsx` and `components/waitlist/StageSelector.tsx` — the waitlist entry detail screen and stage-mover modal. Keep the overall screen structure; you're extending the stage-change behavior, not rewriting the screen.

**The actual gap — why "Quote Sent" and "Deposit Paid" currently do nothing real:** `StageSelector.tsx` is just a bare list of stage names — tapping "Quote Sent" only changes `waiting_list.pipeline_stage` to the string `'quote_sent'`. It never touches the `quotes` table. Same for "Deposit Paid" — no invoice, no payment record, nothing. The waitlist entry's `quoted_price`, `quote_sent_date`, `quote_expires_date`, `deposit_amount`, `deposit_paid_date`, `deposit_invoice_id` columns all already exist on `waiting_list` — they're just never written to by any UI action today. This prompt connects the two systems.

**A live bug found while reviewing this — fix it:** `lib/waitlist/mutations.ts`'s `createWaitlistEntry()` defaults `source` to `'manual'` when not provided (`input.source ?? 'manual'`). But `waiting_list`'s `source` CHECK constraint only allows `'app', 'website', 'instagram', 'facebook', 'whatsapp', 'referral', 'show', 'other'` — `'manual'` isn't in that list. Any call relying on this default currently fails with a constraint violation. Fix the default to `'other'`.

---

## Task 1 — Migration: link waiting_list to quotes and add a balance-invoice column

`supabase/migrations/00XX_waitlist_quote_invoice_link.sql` (check `list_migrations` via the Supabase MCP for the real next number before naming — this project's local filenames and live-applied migrations have drifted before):

```sql
alter table waiting_list add column if not exists quote_id uuid references quotes(id) on delete set null;
alter table waiting_list add column if not exists balance_invoice_id uuid references invoices(id) on delete set null;
```

`deposit_invoice_id` already exists on `waiting_list` from an earlier migration but has never been written to by any code — Task 3 below is the first thing that will actually set it.

## Task 2 — Fix the `source` default bug

In `lib/waitlist/mutations.ts`, change `source: input.source ?? 'manual'` to `source: input.source ?? 'other'` in `createWaitlistEntry()`.

## Task 3 — "Quote Sent" opens the real Quote Builder, linked back to the waitlist entry

Edit `components/waitlist/StageSelector.tsx`: when the selected stage is `'quote_sent'`, instead of calling `moveWaitlistStage()` directly, close the modal and navigate to `/(admin)/quotes/new` with the waitlist entry's context passed as params — `waitlistId`, plus `clientId` (if `entry.client_id` is set) or `walkinName`/`walkinContact` (from `entry.enquirer_name`/`enquirer_email`/`enquirer_phone` if not), and `dogId`/`litterId` if `entry.assigned_dog_id`/`assigned_litter_id` are already set (pre-adds that dog/litter as a line item via the existing "Quick add a dog" mechanism in `new.tsx` — check how it currently adds a dog line item and reuse that, don't build a second path).

In `app/(admin)/quotes/new.tsx`: accept an optional `waitlistId` param. On successful `createQuote()`, if `waitlistId` is present, also update that waiting list entry: `pipeline_stage: 'quote_sent'`, `quote_id: <new quote id>`, `quoted_price: <quote total>`, `quote_sent_date: today`. Do this as a follow-up `updateWaitlistEntry()` call after the quote insert succeeds — if it fails, the quote itself still exists and isn't lost, just log the error and let the admin manually reconcile (don't roll back a successfully created quote over a failed stage update).

Do the same in reverse on `app/(admin)/quotes/[id].tsx`'s existing "Convert to Invoice" flow: if the quote has a linked `waiting_list_id` (query `waiting_list` where `quote_id = quote.id`), moving the quote to `'accepted'` should also be reflected — but don't over-engineer this; converting to invoice is a separate, later action (see Task 5), not part of this task.

## Task 4 — "Record Deposit" action, replacing the bare "Deposit Paid" stage option

There is currently no UI anywhere that actually records a deposit — `payment_status`/`deposit_amount`/`deposit_paid_date` are raw columns nobody writes to except this new action.

In `StageSelector.tsx`: when the selected stage is `'deposit_paid'`, instead of an instant stage change, show a small inline form (amount, defaulting to the entry's `quoted_price` if set, editable; payment method/reference optional) with a "Record Deposit" confirm button. On confirm:
1. Create a real invoice for the deposit amount via the existing invoice-creation path (`lib/finance/queries.ts` / `lib/finance/mutations.ts` — check the exact function name and reuse it, don't hand-roll a second insert), linked to the client and dog/litter, `status: 'paid'` (it's being recorded as already received), with a payment record via whatever the existing "record a payment against an invoice" flow already does.
2. Update `waiting_list`: `pipeline_stage: 'deposit_paid'`, `payment_status: 'deposit_paid'`, `deposit_amount`, `deposit_paid_date: today`, `deposit_invoice_id: <new invoice id>`.

This is the first thing that will ever populate `deposit_invoice_id` — it's existed unused since an earlier migration.

## Task 5 — WhatsApp and Email send buttons on the quote detail screen

On `app/(admin)/quotes/[id].tsx`, add two buttons next to the existing "Convert to Invoice" button (only show them while `status` is `'draft'` or `'sent'` — no point sending an already-accepted or declined quote):

- **"Send via WhatsApp"**: builds a `wa.me/<digits-only phone>?text=<url-encoded message>` link (strip all non-digit characters from the client's phone; if there's no phone on file — e.g. a `historical_client_name`-only quote with no contact captured — disable the button with a tooltip/caption explaining why) and opens it with `Linking.openURL()`. Message text: a plain-text summary — client name, each line item with price, total, valid-until date. No PDF attachment needed for v1 (WhatsApp deep links can't attach files without the user manually picking one) — this is a deliberate scope cut, not an oversight.
- **"Send via Email"**: reuses the existing notification pattern from `hooks/useApplications.ts`'s `logClientNotification()` / the `notifications_log` table if the quote has a linked `client_id` with an app account. For a `historical_client_name`-only quote (no account, no `client_id`), there's nothing in this codebase that sends arbitrary outbound email today — use a `mailto:` link instead (`Linking.openURL('mailto:...')`), pre-filled with subject and the same plain-text summary as the WhatsApp message. Check whether the client has an email on file before enabling either path.

After either send action, update `quotes.status` to `'sent'` if it was `'draft'`.

## Task 6 — Auto-generate the balance invoice at Handover

When a waiting list entry's `pipeline_stage` moves to `'handover_complete'` (via `StageSelector`), automatically create the balance-due invoice: `quoted_price - deposit_amount` (guard against negative/null — if there's no `quoted_price` on file, or the deposit already covers the full amount, skip invoice creation and just log a note, don't create a zero/negative invoice). Use the same invoice-creation path as Task 4, `status: 'draft'`, `due_date` = the handover date (balance is due on delivery, i.e. today), linked to the client/dog/litter. Store the result on `waiting_list.balance_invoice_id` (added in Task 1).

Show both `deposit_invoice_id` and `balance_invoice_id` as tappable links (to their respective invoice detail screens) on the waitlist entry's Overview tab in `app/(admin)/waitlist/[id].tsx`, once set.

## Task 7 — Manual fast-track entry point (the additional path, no application required)

Add a "+ New Lead" button to `app/(admin)/waitlist/index.tsx` (the Kanban board) that opens a small inline form: name, phone, email, preferred category/sex/colour (optional), notes. On submit, calls `createWaitlistEntry()` (already exists, fixed in Task 2) with `pipeline_stage: 'enquiry'`, `source: 'other'` (or let the admin pick a more specific source from the existing valid list — `website`/`instagram`/`facebook`/`whatsapp`/`referral`/`show`/`other` — via a small picker, since "how did this lead find us" is useful data you don't currently capture anywhere for manual entries), no `application_id`.

After creation, navigate straight to that entry's detail screen. From there, the admin uses the exact same "Quote Sent" → Task 3's Quote Builder → Task 5's WhatsApp/Email send → Task 4's "Record Deposit" flow as an application-sourced lead. No separate code path — the whole point is that after this one new entry point, it's the same pipeline as everyone else.

---

## Critical warnings

- Do NOT build a second quote or invoice system. Every task here reuses `lib/finance/quoteQueries.ts` and whatever the existing invoice-creation function is in `lib/finance/mutations.ts` — find and reuse them, don't duplicate.
- Do NOT let a failed `waiting_list` update roll back or delete an already-created quote/invoice (Task 3's note applies everywhere in this prompt) — money-adjacent records should fail safe, not disappear.
- The WhatsApp send is a `wa.me` deep link only for this prompt — do not integrate a WhatsApp Business API provider (Twilio, 360dialog, etc.) without a separate, explicit decision; that's a real ongoing cost and business-verification commitment, not a drop-in.
- Confirm the real next migration number via the Supabase MCP before naming Task 1's file.
- `quote_items.line_total` and `invoice_items`-equivalent generated columns can't be written to directly in an INSERT (same caveat as the quote system prompt).

## Testing checklist

- [ ] Moving a waitlist entry to "Quote Sent" opens the Quote Builder pre-filled with the right client and dog/litter (when assigned), and saving the quote updates the waitlist entry's stage, `quote_id`, and `quoted_price`
- [ ] "Record Deposit" creates a real paid invoice, sets `deposit_invoice_id`, and moves the stage to "Deposit Paid"
- [ ] "Send via WhatsApp" opens WhatsApp with a correctly formatted message and the right phone number; disabled gracefully when no phone is on file
- [ ] "Send via Email" works for both app-account clients and historical/walk-in clients (via mailto fallback)
- [ ] Moving a waitlist entry to "Handover" auto-creates a balance invoice for exactly `quoted_price - deposit_amount`, and skips cleanly if there's no quoted price
- [ ] "+ New Lead" creates a waitlist entry with no `application_id`, and it can be walked through the entire quote → deposit → handover flow identically to an application-sourced entry
- [ ] `createWaitlistEntry()` no longer defaults to the invalid `'manual'` source value
- [ ] `npx tsc --noEmit` passes cleanly
- [ ] No file over 300 lines
