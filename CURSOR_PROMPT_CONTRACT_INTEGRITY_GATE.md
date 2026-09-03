# CURSOR PROMPT — A contract with a blank price must not be sendable

Two buyers have now signed agreements stating **Purchase price R 0,00**.

- **DD-AGR-1137** — Jannecke Smit, signed 26 Aug. Real price R55 000.
- **DD-AGR-1138** — Gabrielle Kruger, **signed 1 Sep at 12:16**. Real price R20 000.

Gabrielle signed hers *on the same afternoon the pricing bug was being fixed*. Both documents also
print raw template tokens where the dog's microchip and the buyer's ID number belong — literally
`{{dog_microchip}}` in a signed sale agreement. Both are legal records now and cannot be edited.

The pricing fix in `2bd84c4` was correct but it only fixed **new** contracts. Nothing stops a stale
or broken one being sent, signed and enforced. **That is what this prompt fixes: the gate, not the
generator.**

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Brand `#111008 / #1C1A0E / #C4A35A / #F5F0E8`, Cinzel/Lato.
**Next free migration: `0151`.**

---

## 1. Fix the null hole in the pricing rule first

`src/lib/contracts/createSale.ts`:

```ts
let purchasePrice = dogPrice ?? null;
if (quote) purchasePrice = quote.total;                              // ← no null check
if (invoice && invoice.total_amount != null) purchasePrice = invoice.total_amount;
```

The invoice branch guards against null. The quote branch does not. **A quote row with a null total
therefore wipes out `dog.price` and returns null**, which is exactly how a contract prints R 0,00.
The asymmetry looks accidental — the two branches were clearly meant to behave the same way.

```ts
if (quote && quote.total != null) purchasePrice = quote.total;
```

Add the case to `createSale.price.test.ts`: a quote with `total: null` must fall through to
`dog.price`, not to null.

## 2. The gate — nothing incomplete leaves the building

Add `src/lib/contracts/contractReadiness.ts`, a **pure function** over a contract row:

```ts
export type ContractBlocker =
  | 'zero_price' | 'unresolved_tokens' | 'no_dog' | 'no_buyer_identity';

export function contractBlockers(contract: {
  body_html: string | null;
  dog_id: string | null;
  client_id: string | null;
  contact_id: string | null;
}): ContractBlocker[]
```

- **`unresolved_tokens`** — `body_html` still matches `/\{\{[a-z_]+\}\}/`. Return the token names so
  the UI can say *which* fields are missing, not just that something is.
- **`zero_price`** — the rendered purchase price is `R 0,00`, absent, or a dash.
- **`no_dog`** — `dog_id` is null on a sale agreement.
- **`no_buyer_identity`** — neither `client_id` nor `contact_id`.

Pure and exported so it can be unit tested without a database. Put its own test beside it.

**Wire it as a hard block, not a warning:**

- The **Send** action on a contract refuses and returns the blocker list. Not a confirm dialog — a
  refusal. A dialog is a thing people click through at 22:00.
- `/sign/[token]` and the portal signing screen refuse to render the sign button, and show the buyer
  a plain line: *"This agreement is being finalised. Matt will send it through shortly."* **Never
  show a buyer the token names** — that is our problem, not theirs.
- The DB is the real gate: a trigger on `contracts` that raises when `status` moves from `draft` to
  `sent`/`signed_client`/`signed_both` while `body_html ~ '\{\{[a-z_]+\}\}'`. **UI validation alone
  is not enough** — both bad contracts were signed through paths that looked fine.

Migration `0151`:

```sql
create or replace function public.trg_contract_must_be_complete()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status
     and new.status in ('sent','signed_client','signed_both')
     and new.body_html ~ '\{\{[a-z_]+\}\}' then
    raise exception
      'CONTRACT_INCOMPLETE: % still contains unfilled template fields. Regenerate it before sending.',
      coalesce(new.contract_number, new.id::text)
      using errcode = 'P0001';
  end if;
  return new;
end $$;
```

Do **not** back-fill or block the two already-signed contracts. They are legal records. The trigger
only fires on a status transition, so they are untouched sitting where they are.

## 3. Regenerate — because the data usually arrives late

This is the actual root cause. Contracts are generated at payment confirmation, but microchips,
colours, registration numbers and ID numbers are captured **afterwards**. The document snapshots a
moment when the record was half-empty and then never catches up.

Six of nine dogs in the Claire × Santini litter now **have** microchip numbers in the database. Their
contracts still print `{{dog_microchip}}` because they were generated before the numbers were
entered. The data is there. The document is stale.

Add **Regenerate from current data** on the contract detail screen:

- Only enabled on `status = 'draft'`. Refuse on anything sent or signed, in the action and in the DB.
- Re-runs the same merge `createSaleContract` uses — do not write a second merge path that will
  drift from the first.
- Shows a before/after diff of the changed fields and asks for confirmation. Matt should see
  "Purchase price: R 0,00 → R 20 000,00" before he commits it.
- Records a `contract_event` of type `regenerated` with the fields that changed.

## 4. Show what is missing, before it matters

- On the contract list, a **Not ready** chip on any draft with blockers, with the count.
- On the contract detail, name the missing fields in plain English — "Microchip number", "Buyer ID
  number" — with a link to the dog or contact record to fill them in.
- A dashboard card: **"Contracts not ready to send"**. Right now that card would show **six**.
- App parity for the list chip and the detail panel.

---

## Rules
- **Both repos.** TypeScript strict, no `any`, no file over 300 lines.
- **Do not modify any contract whose status is not `draft`.** `DD-AGR-1137` and `DD-AGR-1138` are
  signed; `DD-AGR-1135` is sent. All three are legal records and stay byte-identical.
- Do not touch the lapse ladder (`0150`) or the hold columns (`0149`) — both verified working 1 Sep.
- `ls` every app file you touch and paste the output — grep has false-negatived on this filesystem.

## Verify — paste output, not descriptions

- [ ] `resolveSalePurchasePrice(50000, { total: null }, null)` returns **50000**, not null. Paste the
      test run.
- [ ] Attempt to send **DD-AGR-1146** (draft, contains `{{dog_microchip}}`). Confirm it is **refused**
      and the message names the missing fields. Screenshot.
- [ ] Attempt the same status change **directly in SQL**, bypassing the UI. Confirm the trigger
      raises `CONTRACT_INCOMPLETE`. Paste the error. This is the test that matters — the UI was never
      the thing that failed.
- [ ] Regenerate **DD-AGR-1146** (Josef Kotze, Puppy 1 Pink, microchip `972274200739944` is on file).
      Confirm the microchip now renders and the price is no longer R 0,00. Paste before and after.
- [ ] Confirm **DD-AGR-1137**, **DD-AGR-1138** and **DD-AGR-1135** are byte-identical before and
      after everything above. Paste a hash of each `body_html` from before and after.
- [ ] Confirm Regenerate is refused on a sent contract, in the UI **and** in SQL.
- [ ] Screenshot the "Contracts not ready to send" card showing its real count.
- [ ] `npx tsc --noEmit` clean in both repos; `npm run preflight` passes.

### Prove it reached the remote
- [ ] `git log origin/main -1` matches `HEAD` in **both** repos — paste both hashes.
- [ ] Vercel **Ready** on `diedericksdobermanns-web-v145`.
- [ ] Migration `0151` applied live and present in both repos.

## Commit
Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`,
`scripts/send-portal-invite-emails.mjs`.
