# CURSOR PROMPT — Quote catalogue: quote for more than just the dog

**This supersedes `CURSOR_PROMPT_DELIVERY_RATES.md`. Do not build `delivery_rates`.** Delivery is
one item among many, not a special case deserving its own table.

Quote DD-1135 went out with only the puppy on it. But a real sale is rarely only a puppy — an
export needs a crate, a health certificate, a rabies titre and airline freight; a local sale may
need delivery, a microchip or a starter pack. Every one of those is currently typed from memory
into a blank line, or forgotten.

This builds a catalogue of what Matt sells, so quoting becomes picking items and setting amounts.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## The principle: fixed names, variable prices

Matt prices case by case. **The catalogue holds what he sells, not what he charges.** An item may
carry a default price where one genuinely exists, but most will be marked "price varies" and the
amount is entered per quote.

This is the right split. The thing that gets forgotten is the *item* — nobody forgets to charge
for the puppy, they forget the crate. Fixing the names fixes the forgetting; fixing the prices
would only create wrong numbers that look official.

---

## Migration `0067_quote_catalogue.sql`

Check the folder and take the next free number — there is existing inconsistency between the repos
(`0059_contacts_dedupe.sql` in the app, `0061_contacts_dedupe.sql` on the website, neither
applied). Do not renumber those.

```sql
create table public.catalogue_items (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,        -- 'export_crate', stable, used in code
  label           text not null,               -- 'Export crate', what Matt sees
  item_type       text not null,               -- maps to quote_items.item_type
  category        text not null check (category in
                    ('dog','logistics','export','health','training','accessory','other')),
  default_price   numeric(10,2),               -- null = price varies
  price_varies    boolean not null default true,
  description_template text,                   -- prefills the line description
  notes           text,                        -- internal: what it covers, who supplies it
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  updated_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint catalogue_price_consistent
    check (price_varies or default_price is not null)
);
create index catalogue_items_active_idx on public.catalogue_items(is_active, category, sort_order);
```

`item_type` must match the values `quote_items.item_type` already uses — currently `dog`,
`delivery`, `board_train`, `training`, `transport`, `accessory`, `other`. Read the type union in
`src/types/quotes.ts` and use exactly those; do not introduce new ones here.

### Seeding — names only, never prices

Seed this starter list with **`default_price = null` and `price_varies = true` on every row**. It
is a checklist so the catalogue is not empty on day one, not a price list.

```
export       Export crate                          transport
export       Airline freight                       transport
export       Export permit / documentation         other
health       Health certificate (state vet)        other
health       Rabies titre test                     other
health       Vaccination course                    other
health       Microchip                             other
logistics    Delivery / travel                     delivery
logistics    Collection from kennel                delivery
accessory    Puppy starter pack                    accessory
training     Board & train                         board_train
training     Private training session              training
```

**Add a visible banner on the settings screen until Matt has reviewed them:** *"These are starting
suggestions — edit, price or deactivate them to match what you actually sell."* Some of these may
be wrong for his business, and a catalogue he did not choose is one he will not trust.

RLS: signed-in users read active items (the quote builder needs them); `is_admin()` writes. Add to
`trg_audit` — a changed default price changes what clients are charged.

### Delivery decision on the quote

Carried over from the superseded prompt, still required:

```sql
alter table public.quotes
  add column if not exists delivery_decision text
    check (delivery_decision is null or delivery_decision in
      ('collection','included','charged','to_be_confirmed','not_applicable')),
  add column if not exists delivery_note text;
```

Back-fill to `null`, **not** a default — **DD-1135 must read as undecided**, because nobody decided.

---

## Quoting from the catalogue

**Add item** opens a picker grouped by category, searchable, showing label and either the default
price or *"price varies"*. Choosing one fills `item_type`, description (from
`description_template`) and the default price where there is one. **Everything stays editable.**

Keep the existing free-text line as well. A one-off must never require creating a catalogue entry
first — that is how people end up not quoting for things.

**Recent charges as a memory aid.** Beside the amount, show what Matt last charged for this same
`code`, from history — no new table:

```sql
select qi.line_total, q.quote_number, q.created_at,
       coalesce(c.city, c.country) as destination
from quote_items qi
join quotes q on q.id = qi.quote_id
left join contacts c on c.id = q.client_id
where qi.catalogue_code = $1
order by q.created_at desc
limit 6;
```

Add `catalogue_code text` to `quote_items` and `invoice_items` (nullable — free-text lines have
none) so this lookup is possible at all.

Render as *"Last charged: R2 500 (Pretoria, 4 Aug) · R4 000 (Cape Town, 12 Jul)"*. **Label it as
history with dates, never as "suggested"** — Matt is being reminded what he did, not told what to
charge. Clicking one copies the amount in, still editable.

Empty state: *"Not charged before."* Nothing more.

---

## The delivery rule

Delivery is **included in the price of a Standard Puppy** and **not** on the elite tiers. Read
`dogs.programme_tier` against `pricing_tiers.tier_key`:

| Tier on the quote | Default decision |
|---|---|
| `puppy` (Standard Puppy) | **`included`** — pre-selected, zero-amount line so the client sees it was considered |
| `elite_developed` | **`charged`** — amount required |
| `protection_dog` | **`charged`** — amount required |
| mixed tiers, or tier unset | leave undecided |

**A quote cannot be *sent* while `delivery_decision` is null, or while a `charged` /
`to_be_confirmed` line has no amount.** Saving a draft undecided is fine — only sending is blocked.
**Not a dismissible warning**: a warning that can be clicked past is how the line was lost.

**International exception:** when the client's country is not South Africa or Eswatini, do **not**
default a Standard Puppy to `included` — export crates, certificates and freight are not absorbed
in R20 000. Leave it undecided and say why: *"This buyer is in Malawi — confirm whether delivery is
included or charged."* Read the country from the linked contact, falling back to the application.

**Suggest the export items in that case.** When the buyer is international, prompt once with the
`export` and `health` category items: *"International buyer — consider: export crate, health
certificate, rabies titre, airline freight."* Suggest, never auto-add. This is exactly the gap that
made Daron's approval email promise export papers with nothing on the quote to cover them.

`delivery_note` carries the plain-words agreement — *"Meeting halfway at Middelburg, R1 500 toward
fuel"* — and prints under the line. That sentence prevents more disputes at handover than the
number does.

---

## Settings screen — both repos

`/admin/settings/catalogue` and the app equivalent beside pricing.

- List grouped by category; add, edit, reorder, **deactivate (never delete)** — an item referenced by an old quote must stay explicable.
- Show usage: *"on 12 quotes"*.
- Toggling `price_varies` off requires a default price; the constraint enforces it, so surface that as a helpful message rather than a raw database error.
- The app screen must genuinely add and edit, not just display. Matt quotes from his phone.

Invoices use the same catalogue, and a quote converting to an invoice carries `catalogue_code`,
`delivery_decision`, `delivery_note` and every line across.

---

## Rules

- Seed names only. **No seeded prices, anywhere.**
- The catalogue fills a line; it never locks it. Free-text lines stay possible.
- Past charges are labelled as history with dates, never as recommendations.
- Deactivate, never delete.
- The delivery decision blocks **send**, never **save**.
- Money as `numeric`, never floats. Format `R1 234,56` — space thousands, comma decimal.
- `requireAdmin()` on every write action. No file over 300 lines.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify

- [ ] The catalogue seeds with every row `price_varies = true` and `default_price` null, and the "starting suggestions" banner shows.
- [ ] Adding a catalogue item to a quote fills type, description and price, and all three remain editable.
- [ ] A free-text line still works without touching the catalogue.
- [ ] `catalogue_code` is stored on the line and the "last charged" lookup returns real past figures with dates.
- [ ] An item never charged before shows "Not charged before", not a blank or a zero.
- [ ] A **Standard Puppy** quote defaults delivery to `included` with a visible zero-amount line.
- [ ] An **Elite Developed** or **Protection Dog** quote defaults to `charged` and cannot be sent without an amount.
- [ ] A Standard Puppy for a buyer outside SA/Eswatini stays undecided and explains why, and prompts the export items.
- [ ] The export prompt suggests only — it never adds a line by itself.
- [ ] A mixed-tier quote stays undecided.
- [ ] Existing quotes are null, not defaulted — **DD-1135 reads as undecided**.
- [ ] Deactivating an item removes it from the picker but old quotes still render.
- [ ] Turning off `price_varies` without a price shows a clear message, not a database error.
- [ ] Adding lines updates `quotes.subtotal` and `total` **in the database** — verify by SQL.
- [ ] Converting to an invoice carries codes, decision, note and lines.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**.
- [ ] App: `npx tsc --noEmit` exits 0, and `types/database.types.ts` is roughly its previous size, not double.

### Build the commit, not the working tree

```powershell
git clone --no-hardlinks . ../_buildcheck
cd ../_buildcheck; git checkout <commit you are about to push>
npm ci; npx next build
cd ..; Remove-Item -Recurse -Force _buildcheck
```

- [ ] The clean checkout builds. A working-tree build cannot see a file missing from the commit.
- [ ] After pushing, report the Vercel deployment status. **Do not request GitHub or Vercel authentication** — Matt reads the dashboard.

## Repo hygiene — do this first

Both working trees have many uncommitted modified files and an untracked dedupe migration each.
This is the pool this morning's three failed deploys came from.

1. Group every modified and untracked file as **intentional work**, **incidental noise**, or **unclear**.
2. Commit the intentional work; commit both dedupe migrations.
3. **Report the "unclear" group and stop. Discard nothing on your own judgement.**

## Commit

Two repos, separate commits: hygiene, then the feature. **Website:** from
`diedericksdobermann-web/`. **App:** repo root is the **parent** folder. Push both, then
`git log origin/main -1` in each and confirm it matches `HEAD`.

Do not touch `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/lib/issues/capture.ts`,
`src/components/layout/WhatsAppButton.tsx`, or `scripts/import-dbp-contacts.mjs`.
