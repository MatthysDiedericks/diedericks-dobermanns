# CURSOR PROMPT — Delivery must be decided on every quote, and repo hygiene

Quote DD-1135 went to a client with no delivery line. The line was silently dropped (since fixed),
but the underlying risk remains: **delivery is easy to forget, because nothing asks about it.**

Matt prices delivery case by case — a Pretoria handover, a 600 km drive and an airline crate are
different every time. **So there is no rate card to build, and none should be invented.** What is
needed is a step that cannot be skipped, and a memory of what was charged before.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Do not build a rates table

An earlier draft of this prompt specified `delivery_rates`. **Ignore that. Do not create it.**
Fixed rates would be wrong more often than right, and a wrong preset that looks deliberate is
worse than a blank field.

---

## Migration `0067_quote_delivery_decision.sql`

Check the migrations folder and use the next free number — there is existing inconsistency between
the repos (`0059_contacts_dedupe.sql` in the app, `0061_contacts_dedupe.sql` on the website,
neither applied). Do not renumber those; just avoid colliding.

```sql
alter table public.quotes
  add column if not exists delivery_decision text
    check (delivery_decision is null or delivery_decision in
      ('collection','included','charged','to_be_confirmed','not_applicable')),
  add column if not exists delivery_note text;

comment on column public.quotes.delivery_decision is
  'How delivery is handled on this quote. NULL means undecided — a quote cannot be sent while it is NULL. Delivery is priced case by case; there is deliberately no rate card.';
```

Back-fill existing quotes to `null`, **not** to a default. A default would silently mark DD-1135
as decided when nobody decided anything, and would hide the exact gap this exists to close.

Add `quotes.delivery_decision` and `delivery_note` to the audit trail — they already ride along on
the existing `trg_audit` for `quotes`, so just confirm that.

---

## The rule: a quote cannot be sent with delivery undecided

In the quote builder, a **Delivery** block that must be answered before Send becomes available:

- **Collection from us** — buyer collects. No line added.
- **Included in the price** — no separate charge. Adds a zero-amount line so the client can see it was considered: *"Delivery — included"*.
- **Charged separately** — adds a `delivery` line; Matt types the amount and a description.
- **To be confirmed** — adds a line with no amount. **Blocks sending** until priced: *"The delivery amount still needs confirming before this quote goes out."*
- **Not applicable** — e.g. a training-only quote. Requires a short note.

Blocking the send is the point. **Do not make this a warning that can be clicked past** — a
dismissible warning is how the delivery line was lost in the first place.

### Default from the programme tier — the rule that makes this mostly automatic

Delivery is **included in the price of a Standard Puppy**. It is **not** included on the two elite
tiers, where it must be priced.

Read `dogs.programme_tier` for the dogs on the quote, against `pricing_tiers.tier_key`:

| Tier on the quote | Default decision |
|---|---|
| `puppy` (Standard Puppy, R20 000) | **`included`** — pre-selected |
| `elite_developed` (Elite Developed Puppy, R60 000) | **`charged`** — amount required |
| `protection_dog` (Fully Trained Protection Dog, price on request) | **`charged`** — amount required |
| mixed tiers on one quote | leave undecided; Matt chooses |
| no dog line, or tier unset | leave undecided |

**Default it, never lock it.** Matt overrides for a specific arrangement, and the override is the
normal case often enough that it must be one click.

On the elite tiers, `charged` with no amount behaves exactly like `to_be_confirmed` — **the quote
cannot be sent.** That is the whole point of this feature: the R55 000 quote that went out with no
delivery line was an `elite_developed`.

**Watch the international case.** A Standard Puppy defaulting to "included" is right for a South
African buyer and wrong for one in Malawi or Europe — export crates, vet certificates and airline
freight are not absorbed in a R20 000 price. When the client's country is **not South Africa or
Eswatini**, do not silently default to `included`. Leave it undecided and say why:
*"This buyer is in Malawi — confirm whether delivery is included or charged."* Read the country
from the linked contact, falling back to the application.

Saving a draft with delivery undecided is fine; only **sending** is blocked. Matt should be able to
put a quote down half-finished.

The `delivery_note` field carries what was agreed in plain words — *"Meeting halfway at
Middelburg, R1 500 toward fuel"* — and prints on the quote under the line. **That sentence is what
prevents an argument at handover**, far more than the number does.

---

## Show what was charged before

This is the part that replaces a rate card. When adding a delivery line, show Matt his own recent
delivery charges as reference, pulled from history — no new table, just a query:

```sql
select qi.description, qi.line_total, q.quote_number, q.created_at,
       coalesce(c.city, c.country, c.full_name) as destination
from quote_items qi
join quotes q on q.id = qi.quote_id
left join contacts c on c.id = q.client_id
where qi.item_type in ('delivery','transport')
order by q.created_at desc
limit 8;
```

Render as a quiet reference list beside the amount field: *"Recent: R2 500 Pretoria · R4 000 Cape
Town · R1 200 Nelspruit"*. Clicking one copies its amount and description into the line, still
fully editable.

**This is a memory aid, not a price list.** Label it as past charges with their dates — never
"suggested" or "recommended". Matt is being reminded what he did, not told what to charge.

Empty state on a fresh system: *"No previous delivery charges yet."* Nothing more.

---

## Also apply to invoices

An invoice converted from a quote must carry `delivery_decision`, `delivery_note` and the line
across. A quote that considered delivery and an invoice that forgot it is the same failure one
step later.

---

## Repo hygiene — do this first, it is the real risk

**Both working trees have many uncommitted modified files**, and both hold an untracked dedupe
migration (`0059_contacts_dedupe.sql` in the app, `0061_contacts_dedupe.sql` on the website).

This is exactly the pool this morning's failure came from: `RegisterForm.tsx` was committed while
the five `src/lib/errors/` modules it imported were not. Three production deploys failed and a
client stayed locked out for another hour.

Before starting the feature:

1. List every modified and untracked file in both repos, grouped as **intentional work**, **incidental noise** (formatter, lockfile, editor config), and **unclear**.
2. Commit the intentional work as its own commit.
3. Commit both dedupe migrations — unapplied, but they must not be lost.
4. **Report the "unclear" group and stop for a decision. Discard nothing on your own judgement** — some of those changes may be Matt's.

Report counts before and after.

---

## Rules

- No rate card, no seeded amounts, no suggested prices anywhere.
- The delivery decision blocks **send**, never **save**.
- Past charges are labelled as history with dates, never as recommendations.
- Money as `numeric`, never floats. Format `R1 234,56` — space thousands, comma decimal.
- `requireAdmin()` on every write action.
- No file over 300 lines.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify

- [ ] A new quote cannot be sent until delivery is decided, and the message says what to do.
- [ ] A draft saves fine with delivery undecided.
- [ ] A quote for a **Standard Puppy** defaults to `included` and shows the zero-amount line.
- [ ] A quote for an **Elite Developed Puppy** or **Fully Trained Protection Dog** defaults to `charged` and **cannot be sent without an amount**.
- [ ] A Standard Puppy quote for a buyer **outside South Africa or Eswatini** does not default to `included` — it stays undecided and explains why.
- [ ] A quote mixing tiers stays undecided rather than guessing.
- [ ] Every default can be overridden in one click.
- [ ] "To be confirmed" blocks sending until an amount is entered.
- [ ] "Included" puts a visible zero-amount line on the PDF, so the client sees it was considered.
- [ ] "Not applicable" requires a note.
- [ ] The recent-charges list shows real past delivery lines with dates and is labelled as history.
- [ ] Clicking a past charge fills the line and the line stays editable.
- [ ] On a system with no past delivery lines, the empty state appears and nothing is suggested.
- [ ] `delivery_note` prints on the quote PDF under the delivery line and wraps if long.
- [ ] Converting to an invoice carries the decision, the note and the line.
- [ ] Existing quotes are `null`, not defaulted — **DD-1135 must read as undecided**.
- [ ] Changing the decision writes an `audit_log` row.
- [ ] Adding the line updates `quotes.subtotal` and `total` **in the database** — verify by SQL.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**.
- [ ] App: `npx tsc --noEmit` exits 0, and `types/database.types.ts` is roughly its previous size, not double.

### Build the commit, not the working tree

```powershell
git clone --no-hardlinks . ../_buildcheck
cd ../_buildcheck; git checkout <commit you are about to push>
npm ci; npx next build
cd ..; Remove-Item -Recurse -Force _buildcheck
```

- [ ] The clean checkout builds. A working-tree build cannot see a file that is missing from the commit.
- [ ] After pushing, report the Vercel deployment status. **Do not request GitHub or Vercel authentication** — Matt reads the dashboard and will tell you.

## Commit

Two repos, separate commits: hygiene first, then the feature. **Website:** from
`diedericksdobermann-web/`. **App:** repo root is the **parent** folder. Push both, then
`git log origin/main -1` in each and confirm it matches `HEAD`.

Do not touch `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/lib/issues/capture.ts`,
`src/components/layout/WhatsAppButton.tsx`, or `scripts/import-dbp-contacts.mjs`.
