# CURSOR PROMPT — Load a payment and its proof from the admin side

**Most of Matt's buyers send proof of payment on WhatsApp, not through the portal.** The system is
built the other way round: uploading a proof is something only a client can do. Matt can record the
money but cannot attach the evidence, so payments end up on the ledger with nothing behind them.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Currency ZAR, formatted `R1 234,56`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Verified — what exists, so you extend rather than rebuild

**Already working, do not recreate:**

- `recordLedgerPayment`, `updateLedgerPayment`, `deleteLedgerPayment` in `src/app/admin/(panel)/finance/payment-actions.ts`
- `verifyQuotePaymentProof`, `rejectPaymentProof` — the client-proof path
- `RecordPaymentPanel.tsx`, mounted through `InvoiceDetailClient.tsx` on `/admin/finance/invoices/[id]`. It shows Total paid, Remaining, a bank-reference field, and marks entries **"Recorded by staff"**
- `invoice_payments.proof_document_id` — the column already exists, and the panel **reads** it: *"Proof attached · verified on ledger"*

**The gap:** every proof component lives in `src/components/portal/` — `ProofOfPaymentUpload`,
`ProofOfPaymentCard`, `DocumentsProofSection` — and mounts only on portal pages. **`RecordPaymentPanel`
has no file input.** It can display a proof; it cannot create one.

---

## 1 · Attach a proof when recording a payment

Add a file input to `RecordPaymentPanel`. Optional — a payment with no proof must still save.

- Same rules as the portal upload: **whitelist `pdf, jpg, jpeg, png, webp, heic`, verify magic bytes, 10 MB cap.** Reuse `src/lib/uploads/magic.ts` — do not write a second validator.
- Store under the **same `documents` path convention the portal uses**, so both sources land together and the storage policy already covers them.
- Set `invoice_payments.proof_document_id` on the new payment.
- Accept a **photo taken on a phone** — a WhatsApp screenshot is the normal case, not an edge case. No minimum resolution, no PDF-only rule.

### Record who provided it — this matters

A client-uploaded proof and a screenshot Matt saved from WhatsApp are **not the same evidence.**

- Client upload → `review_status = 'verified'` after Matt verifies, source recorded as the client
- Staff upload → recorded as staff-provided, and shown that way

On the ledger, label them differently: *"Proof uploaded by client"* vs *"Proof added by staff"*.
**Never let a staff-added image present itself as something the buyer submitted.** If a payment is
ever disputed, the difference between those two is the whole argument.

## 2 · Reach Record Payment without hunting for the invoice

Today Matt must navigate to `/admin/finance/invoices/[id]`. He does not think in invoice numbers —
he thinks *"Nicolas paid his deposit."*

Add a **Record payment** action, opening the same panel, from:

- the **quote** detail page, where he already is after converting
- the **debtors** list, on each row with a balance
- the **client** record

**One panel, one action, several doors.** Do not fork the component; pass the invoice id in.

Where a client has **no invoice yet**, the action explains why rather than failing: *"Convert the
accepted quote to an invoice first — a payment has to belong to a sale."* **One invoice per sale
stays the rule.**

## 3 · Loading a backlog

Matt has several Claire × Santini deposits already paid, sitting outside the system — Nicolas Hohls
is recorded at R10 000, Deon Vlok shows R0, and others are not in the system at all.

- **Default the payment date to blank, not today.** These landed weeks ago, and a wrong date puts money in the wrong month on the cashflow forecast. Make him choose it.
- Warn, without blocking, if a date is more than 60 days old or in the future.
- After saving, show the updated balance immediately so he can move to the next buyer without reloading.

## 4 · Keep the ledger honest

- Editing or deleting a payment already writes to `audit_log` — confirm it captures the old and new amount, and who did it.
- **A payment with a proof attached cannot be silently deleted.** Require a typed reason, and keep the document.
- Recording a payment must update `amount_paid`, `amount_outstanding`, invoice `status`, the client's statement, the debtors list and the cashflow forecast — **the same single path the proof-verification flow already uses.** Two ways to record money will disagree eventually.

---

## The app

Matt is often at the kennel when a proof arrives on WhatsApp.

- **Record payment with attach from the app**, using the phone's photo library or camera.
- Same validation, same storage path, same staff-provided labelling.
- The debtors list already exists in the app — put the action on the row there too.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**

## Rules

- Proof is optional; the payment saves without it.
- Reuse `magic.ts` and the portal's storage path. No second validator, no second bucket layout.
- Staff-provided and client-provided proofs are labelled differently, always.
- One panel reused from several entry points — not forked.
- Payment date is never defaulted to today.
- One invoice per sale. No payment without an invoice.
- Deleting a payment with a proof needs a typed reason.
- No file over 300 lines. Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output, not descriptions

- [ ] Recording a payment **with** a JPEG proof sets `proof_document_id` and stores the file. Paste the payment row and the storage path.
- [ ] Recording a payment **without** a proof still saves.
- [ ] A `.exe` renamed `.jpg` is rejected on magic bytes.
- [ ] An 11 MB photo is rejected with a readable message; a 4 MB phone photo succeeds.
- [ ] The ledger shows *"Proof added by staff"* for this one, and *"Proof uploaded by client"* for Jocelyn's existing R10 000 on `DD-2026-0006`. **Both must be visible and different.**
- [ ] Record payment opens from the quote page, the debtors row and the client record — all reaching the same panel.
- [ ] A client with no invoice shows the explanation, not an error.
- [ ] The date field starts **empty** and a date 90 days old warns but saves.
- [ ] Recording R10 000 against a R55 000 balance leaves R45 000, and the client's portal statement shows it. Check the portal, not just the admin view.
- [ ] Debtors and cashflow both reflect the new payment without a manual refresh of the data.
- [ ] Deleting a payment that has a proof requires a typed reason and writes to `audit_log` with the old amount.
- [ ] **Jocelyn's existing verified proof still works** — the client path is unchanged. Re-verify one.
- [ ] App: record a payment with a photo from the phone; same result as the website. Say which device.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. App: `npx tsc --noEmit` exits 0.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel build reaches **Ready** — paste the deployment id. **Three deployments failed this way today; committing is not shipping.**

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: proof attachment, entry points, backlog handling, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
