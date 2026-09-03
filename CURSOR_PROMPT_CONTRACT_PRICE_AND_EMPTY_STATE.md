# CURSOR PROMPT — Contract price must come from the invoice, and say why the contract isn't there yet

Two small, unrelated fixes found while reviewing how contracts reach the buyer portal.

**Repos:** `diedericksdobermann-web` (source of truth for both). Check `diedericks-dobermanns` for a
duplicate empty-state string and match it if one exists — no contract-creation logic lives in the app.
**Supabase:** `nlmwxodvquwbjinhhbmr`. No migration needed — both fixes are logic/copy only.

---

## 1. `createSaleContract` prices the agreement off the wrong record

`src/lib/contracts/createSale.ts`, lines ~118–133. Today:

```ts
let purchasePrice = dog.price ?? null;
...
if (quoteId) {
  const { data: quote } = await supabase.from("quotes").select("quote_number, total")...
  if (quote) {
    quoteNumber = quote.quote_number;
    purchasePrice = quote.total;       // ← overwrites dog.price
  }
}
if (invoiceId) {
  const { data: invoice } = await supabase.from("invoices").select("invoice_number")...
  invoiceNumber = invoice?.invoice_number ?? "—";   // ← total_amount never fetched, price never touched
}
```

The contract is generated *after* the quote has been converted to an invoice
(`createContractsForPaidQuote` only runs on payment confirmation), so the invoice is always the more
current, more correct source — it can differ from the quote by design (delivery fees, adjustments,
partial items). Carina Le Roux's invoice DD-2026-0013 is the live example: R4,000 total (R3,000
board & train + R1,000 once-off delivery) against a quote that was R3,000. A contract generated from
her record today would silently under-state the price.

**Fix the precedence to invoice → quote → dog, invoice wins:**

```ts
let purchasePrice = dog.price ?? null;
const quoteId = input.quoteId ?? party.quoteId;
const invoiceId = input.invoiceId ?? party.invoiceId;

if (quoteId) {
  const { data: quote } = await supabase
    .from("quotes")
    .select("quote_number, total")
    .eq("id", quoteId)
    .maybeSingle();
  if (quote) {
    quoteNumber = quote.quote_number;
    purchasePrice = quote.total;
  }
}
if (invoiceId) {
  const { data: invoice } = await supabase
    .from("invoices")
    .select("invoice_number, total_amount")
    .eq("id", invoiceId)
    .maybeSingle();
  if (invoice) {
    invoiceNumber = invoice.invoice_number ?? "—";
    if (invoice.total_amount != null) purchasePrice = invoice.total_amount; // invoice wins
  }
}
```

`amountPaid: purchasePrice` a few lines below already inherits from the same variable — leave it,
it's correct once `purchasePrice` itself is correct.

## 2. The portal empty state doesn't explain the wait

`src/app/portal/(panel)/contracts/page.tsx`, line 28. Today it just says documents will appear "once
your reservation is confirmed" — vague, and not actually what gates it. A contract is only created
once a specific dog is **allocated** to the client (`createSaleContract` requires `dog_id`), which can
be well after a deposit is paid on a litter reservation. Change the copy to say that plainly:

```tsx
<p className="mt-2 text-sm text-subtle">
  Your agreement will appear here once a puppy has been allocated to you.
</p>
```

Check `diedericks-dobermanns` for the same string (likely `app/(portal)/contracts.tsx` or similar) and
match it if the app renders its own empty state rather than a shared component.

---

## Rules
- Do not touch the invoice/quote/contract *tables* — this is read/derive logic only.
- Do not change how or when contracts are created — only what price they're created with.
- `ls` any app file you touch and paste the output.

## Verify — paste output, not descriptions
- [ ] Pick a client whose invoice total differs from their quote total (Carina Le Roux, DD-2026-0013
      vs DD-1151). Trigger contract creation for her in a transaction, confirm the agreement's price
      token reads **R4,000**, not R3,000. Roll it back — do not leave a real contract on her account
      from a test.
- [ ] Confirm a client with **no** invoice (quote-only) still prices correctly off the quote.
- [ ] Confirm a client with neither quote nor invoice still falls back to `dog.price`.
- [ ] Screenshot the new empty-state copy on the portal contracts page for a client with no contract yet.
- [ ] `npx tsc --noEmit` clean; `npm run preflight` passes.

### Prove it reached the remote
- [ ] `git log origin/main -1` matches `HEAD` — paste the hash.
- [ ] Vercel **Ready** on `diedericksdobermanns-web-v145`.

## Commit
Website: from `diedericksdobermann-web/`. If the app string changed too, separate commit from the
repo root (parent folder).

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`,
`scripts/send-portal-invite-emails.mjs`.
