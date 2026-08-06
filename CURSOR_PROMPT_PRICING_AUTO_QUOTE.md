# CURSOR PROMPT — Admin-Managed Pricing + Auto-Generated Quotes from Applications

## 0. READ THIS FIRST — WHAT ALREADY EXISTS

**Do NOT rebuild the quote system. It already exists and works.** Your job is to add a pricing
layer underneath it and an auto-generation path into it.

Already built and working (do not recreate, do not "improve" unasked):

| Thing | Where | Notes |
|---|---|---|
| `quotes` table | `supabase/migrations/0039_quote_system.sql` | Columns incl. `quote_number`, `client_id`, `historical_client_name`, **`application_id` (FK to applications — EXISTS but nothing populates it yet, this is your hook)**, `status`, `currency`, `subtotal`, `discount`, `total`, `notes`, `valid_until`, `converted_invoice_id`, `created_by` |
| `quote_items` table | same migration | `quote_id`, `item_type` (dog/delivery/board_train/training/transport/accessory/other), `dog_id`, `description`, `quantity`, `unit_price`, `line_total` (GENERATED column — never insert into it), `sort_order` |
| Auto quote numbering | `quote_number_seq` + `trg_assign_quote_number` trigger | Format `QTE-0001`. **Server-side. Never set `quote_number` from client code.** |
| `createQuote(header, items)` | `lib/finance/quoteQueries.ts:122` | Already accepts `application_id` in `QuoteHeaderInput`. Already computes subtotal/total. **Use this — do not write a second insert path.** |
| `updateQuote`, `updateQuoteStatus`, `convertQuoteToInvoice` | `lib/finance/quoteQueries.ts` | Leave alone |
| Manual quote builder UI | `app/(admin)/quotes/new.tsx`, `[id].tsx`, `index.tsx` | **Must keep working exactly as it does today** |
| Waitlist→quote prefill | `hooks/useQuotePrefillMatch.ts` | Different path, don't touch |
| Application review | `reviewApplication(id, status, adminNotes)` in `lib/admin/mutations.ts:217` | This is where you hook the auto-quote |

**Latest migration is `0042_public_litter_pages_rls.sql`. Your new migration is `0043_pricing_tiers.sql`.**

Repos (TWO separate repos, different roots):
- App (Expo): `diedericks-dobermanns/`
- Website (Next.js): `diedericksdobermann-web/`

Supabase project: `nlmwxodvquwbjinhhbmr`

---

## 1. WHAT WE ARE BUILDING AND WHY

Matt (owner) currently has no place to set prices. Dog prices live per-dog on `dogs.price`;
everything else is typed by hand into each quote. Applicants see "Standard Puppy / Elite /
Open" with no numbers.

Three changes:

1. **A pricing table Matt controls from the admin app.** One price per tier — Standard Puppy,
   Elite Developed Puppy, Fully Trained Protection Dog. Flat tier pricing, no per-dog override
   logic, no sex/colour modifiers. Keep it simple; he'll adjust the quote by hand for exceptions.
2. **Those prices show publicly** on the website application form's Budget step, so applicants
   pick a budget knowing the real numbers.
3. **When Matt approves an application, a DRAFT quote is auto-generated** from that
   application's `dog_interest`, pre-filled with the right tier price, linked via
   `quotes.application_id`. It is a DRAFT — it is never sent automatically. Matt opens it,
   edits if needed, and sends it himself. Manual quote creation from scratch must still work
   untouched.

---

## 2. DATABASE — migration `0043_pricing_tiers.sql` (app repo)

```sql
-- Admin-managed price list. One row per product tier. Deliberately flat:
-- no per-dog overrides, no modifiers — exceptions are handled by editing the
-- quote by hand, which the quote builder already supports.
--
-- tier_key intentionally mirrors applications.dog_interest's check-constraint
-- values ('puppy' | 'elite_developed' | 'protection_dog') so an application can
-- be mapped to a price with a direct key lookup and no translation table.
create table if not exists pricing_tiers (
  id uuid primary key default gen_random_uuid(),
  tier_key text not null unique
    check (tier_key in ('puppy', 'elite_developed', 'protection_dog')),
  display_label text not null,
  description text,
  price numeric not null default 0 check (price >= 0),
  currency text not null default 'ZAR',
  -- When false the tier still prices quotes but its number is hidden on the
  -- public website (shows "Contact us" instead). Lets Matt take a tier off
  -- public display without deleting its price.
  is_public boolean not null default true,
  sort_order int not null default 0,
  updated_by uuid references users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_pricing_tiers_sort on pricing_tiers (sort_order);

-- RLS: anyone (incl. anonymous website visitors) may READ; only admins write.
-- Public read is required — the website application form renders these prices
-- for logged-out visitors using the anon key.
alter table pricing_tiers enable row level security;

create policy "Anyone can view pricing tiers" on pricing_tiers
  for select using (true);

create policy "Admins can manage pricing tiers" on pricing_tiers
  for all using (is_admin()) with check (is_admin());

-- Seed the three tiers at 0.00 — Matt sets real prices in the admin screen.
-- Do NOT invent prices here.
insert into pricing_tiers (tier_key, display_label, description, price, sort_order)
values
  ('puppy',           'Standard Puppy',                 'Health-tested, temperament-evaluated puppy from a planned litter.', 0, 1),
  ('elite_developed', 'Elite Developed Puppy',          '8–16 week structured development programme included.',              0, 2),
  ('protection_dog',  'Fully Trained Protection Dog',   'Fully trained personal / family protection dog.',                   0, 3)
on conflict (tier_key) do nothing;

-- Keep updated_at honest.
create or replace function public.touch_pricing_tiers()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_pricing_tiers on pricing_tiers;
create trigger trg_touch_pricing_tiers
  before update on pricing_tiers
  for each row execute function public.touch_pricing_tiers();
```

After applying: regenerate types in the app repo (`npm run gen:types`) so
`pricing_tiers` appears in `types/database.types.ts`. **Do not hand-write the type or cast
with `as any`.**

---

## 3. APP (Expo) — admin pricing management

### 3a. Data layer — `lib/finance/pricingQueries.ts` (NEW)

```ts
import { requireSupabase } from '@/lib/supabase';
import type { Tables, TablesUpdate } from '@/types/database.types';

export type PricingTier = Tables<'pricing_tiers'>;

/** All tiers in display order. Used by admin pricing screen and auto-quote. */
export async function fetchPricingTiers(): Promise<PricingTier[]> { /* ... */ }

/** Single tier by its key — used when pricing a quote from an application. */
export async function fetchPricingTier(tierKey: string): Promise<PricingTier | null> { /* ... */ }

/** Admin-only. Updates price / label / description / is_public. */
export async function updatePricingTier(
  id: string,
  patch: Pick<TablesUpdate<'pricing_tiers'>, 'price' | 'display_label' | 'description' | 'is_public'>,
): Promise<void> { /* ... */ }
```

Follow the existing error convention in `lib/finance/quoteQueries.ts` exactly
(`if (error) throw new Error(error.message)`).

### 3b. Hook — `hooks/usePricing.ts` (NEW)

`usePricing()` → `{ tiers, loading, error, refresh, save }`. JSDoc it. Match the shape of
existing hooks in `hooks/useQuotes.ts`. Loading + error + empty states are mandatory.

### 3c. Screen — `app/(admin)/settings/pricing.tsx` (NEW)

- Lists the three tiers as cards: label, description, current price (large, gold), public toggle.
- Tap a card → edit price + label + description + is_public. Numeric keyboard for price.
- Validate: price must be ≥ 0 and a valid number. Reject negatives client-side with a clear message.
- Show "Last updated <date>" per tier.
- Save shows a loading state and disables the button (no double-submit).
- Success/failure toast, never a raw error string.
- Link it from the existing admin settings screen (`app/(admin)/settings/`) — find the existing
  settings index and add a row, matching how other settings rows are rendered. Do not invent a
  new nav pattern.
- Admin-only: this sits under `(admin)`, which is already gated. Do not add a second auth check,
  but DO confirm the route group's guard covers it.

Keep the file under 200 lines — extract the edit form into
`components/admin/PricingTierEditor.tsx` if it grows.

---

## 4. APP (Expo) — auto-generate the draft quote on approval

### 4a. New function — `lib/finance/autoQuoteFromApplication.ts` (NEW)

```ts
/**
 * Builds a DRAFT quote from an approved application.
 *
 * Deliberately draft-only: the quote is never sent to the client automatically.
 * Matt reviews and sends it from app/(admin)/quotes/[id].tsx.
 *
 * Returns the new quote id, or null if a quote already exists for this
 * application (idempotency — approving twice must not create two quotes).
 */
export async function createDraftQuoteFromApplication(
  applicationId: string,
): Promise<{ quoteId: string | null; error: string | null }>
```

Logic, in order:

1. **Idempotency guard first.** `select id from quotes where application_id = <id> limit 1`.
   If a row exists, return `{ quoteId: existing.id, error: null }` and do nothing else.
   Approving an application twice must never produce two quotes.
2. Fetch the application: `id, user_id, full_name, email, phone, dog_interest, specific_dog_id,
   litter_interest_id, preferred_sex, preferred_colour, tail_preference`.
3. Look up the tier: `fetchPricingTier(application.dog_interest)`.
   - If no tier row found, or `tier.price === 0`, still create the quote but with
     `unit_price: 0` and append a note: *"Pricing not yet configured for this tier — set the
     amount before sending."* Do not silently abort; Matt needs to see the draft.
4. Build ONE line item:
   - `item_type: 'dog'`
   - `dog_id`: `application.specific_dog_id ?? null`
   - `description`: the tier's `display_label`, plus the applicant's preferences appended in
     brackets when present, e.g. `"Standard Puppy (Male, Black & Tan, docked)"`. Use the
     existing `labelFor()` helper in `components/forms/ApplicationForm/labels.ts` for
     human-readable values — do not re-implement the label mapping.
   - `quantity: 1`, `unit_price: tier.price`
5. Call the EXISTING `createQuote()` from `lib/finance/quoteQueries.ts` with:
   - `client_id: application.user_id ?? null`
   - `historical_client_name: application.user_id ? null : application.full_name`
     (covers applicants with no app account)
   - `application_id: applicationId`
   - `status: 'draft'`
   - `valid_until`: 30 days from today (ISO date string)
   - `notes`: `"Auto-generated from application <reference_code or short id>."` plus the
     pricing warning from step 3 if it applied.
6. Wrap everything in try/catch. Return `{ quoteId: null, error: message }` on failure.

### 4b. Hook it into approval — `lib/admin/mutations.ts`

In `reviewApplication()`, after the status update succeeds and inside the existing
`if (app.user_id && status === 'approved')` area — but **note the guard must change**: an
applicant with no `user_id` should still get a quote. Restructure to:

```ts
if (status === 'approved') {
  // Draft quote is best-effort: a failure here must never make the approval
  // itself look like it failed — the application IS approved at this point.
  void createDraftQuoteFromApplication(id).then(({ error: qErr }) => {
    if (qErr) console.error('[reviewApplication] auto-quote:', qErr);
  });

  if (app.user_id) {
    void callNotify({ /* existing notification, unchanged */ });
  }
}
```

Do not make the approval await the quote creation. Do not change the rejection branch.

### 4c. Surface it in the UI — `app/(admin)/applications/[id].tsx`

- After approving, show a confirmation that includes "Draft quote created" and a button/link
  that navigates to the new quote (`/(admin)/quotes/[id]`).
- If the application already has a linked quote (query `quotes` by `application_id`), show a
  "View quote QTE-XXXX" row on the application detail screen permanently, not just right after
  approval.
- If auto-quote failed, do NOT block or hide the approval success — show a subtle
  "Quote could not be created automatically — create one manually" line.

### 4d. Show the link from the other side — `app/(admin)/quotes/[id].tsx`

If `quote.application_id` is set, show a "From application" row linking back to
`/(admin)/applications/[id]`. Read-only, no new mutations.

---

## 5. WEBSITE (Next.js) — show tier prices on the Budget step

### 5a. Fetch prices server-side

The apply page is already a server component that loads dogs and litters
(`src/app/(site)/apply/page.tsx` — verify the exact path). Add a `pricing_tiers` query there:

```ts
const { data: tiers } = await supabase
  .from("pricing_tiers")
  .select("tier_key, display_label, price, currency, is_public")
  .order("sort_order");
```

Pass it down to `ApplicationForm` as a prop, then to `Step4Preferences`. **Do not fetch
client-side** — this is public data available at render time and should be part of the initial
HTML for SEO and speed.

### 5b. Render prices in the budget options

`src/components/forms/ApplicationForm/Step4Preferences.tsx` currently builds budget options via
`optionsFor("budget_range")` from the static `labels.ts` map. Change the `budget_range`
`OptionGroup` only (leave every other OptionGroup on the static map) so its labels become:

- `standard` → `Standard Puppy — R25 000` (formatted from the `puppy` tier)
- `elite` → `Elite / Developed Programme — R45 000` (from `elite_developed`)
- `open` → `Open — best available option` (no price, unchanged)

Rules:
- Format as South African Rand with a space thousands separator: `R25 000`. Write a small
  `formatZar(n: number)` helper in `src/lib/format.ts` (check if one already exists first —
  reuse it if so).
- If a tier's `is_public` is false, or its `price` is 0, render the label WITHOUT a price
  (just `Standard Puppy`). Never show `R0`.
- If the `pricing_tiers` query fails or returns nothing, fall back to the current static labels.
  **The form must never break because pricing is unavailable.**
- Add a small note under the budget group: *"Prices shown are current as at today and exclude
  delivery. A formal quote will be issued on approval."*

### 5c. Do NOT change

- `budget_range` remains free-text `standard | elite | open` in the schema and DB. You are only
  changing the visible label, not the stored value.
- Do not add prices to the `dog_interest` group in step 4 — budget only.

---

## 6. CRITICAL WARNINGS

- **Never set `quote_number` in code.** The DB trigger owns it. If you insert a value you will
  break the sequence.
- **Never insert into `quote_items.line_total`** — it is a GENERATED column, the insert will fail.
- **Do not create a second quote-insert path.** Use the existing `createQuote()`.
- **Do not put the service role key anywhere client-side.** `pricing_tiers` has public SELECT via
  RLS — the anon key is sufficient and correct for the website read.
- **The manual quote builder must still work identically.** If `app/(admin)/quotes/new.tsx`
  behaves differently after your change, you've broken a working feature.
- **Approving an application twice must not create two quotes.** The idempotency check in 4a
  is not optional.
- **Do not seed real prices in the migration.** Seed 0 and let Matt enter them.
- **No `any`.** Regenerate `database.types.ts` after the migration and use the generated types.

---

## 7. EXECUTION ORDER

1. Write + apply migration `0043_pricing_tiers.sql` (app repo).
2. Regenerate types (`npm run gen:types`) — confirm `pricing_tiers` is in `database.types.ts`.
3. `lib/finance/pricingQueries.ts` → `hooks/usePricing.ts` → `app/(admin)/settings/pricing.tsx` + settings nav row.
4. `lib/finance/autoQuoteFromApplication.ts`.
5. Wire into `lib/admin/mutations.ts` `reviewApplication()`.
6. UI links: `applications/[id].tsx` and `quotes/[id].tsx`.
7. Website: apply page query → `ApplicationForm` prop → `Step4Preferences` labels + `formatZar`.
8. `npx tsc --noEmit` in BOTH repos — must exit 0.

---

## 8. TESTING CHECKLIST — verify every line before saying done

**Pricing admin**
- [ ] Pricing screen lists exactly 3 tiers, seeded at R0
- [ ] Editing a price saves and persists after app reload
- [ ] Negative price is rejected with a clear message
- [ ] Non-admin cannot reach the screen or write (test with a client account — RLS must block, not just the UI)
- [ ] "Last updated" reflects the edit

**Auto-quote**
- [ ] Approving an application creates exactly ONE draft quote with a `QTE-XXXX` number
- [ ] Approving the SAME application a second time creates NO second quote
- [ ] The quote's `application_id` is set and links back correctly both directions in the UI
- [ ] Line item description includes the applicant's sex/colour/tail preferences
- [ ] Unit price matches the tier price at time of approval
- [ ] Tier priced at R0 → quote still created, with the warning note
- [ ] Applicant WITHOUT a user account → quote created with `historical_client_name` set
- [ ] Rejecting an application creates no quote
- [ ] Approval still succeeds and still notifies the client even if quote creation errors

**Manual quoting (regression — must be unbroken)**
- [ ] Creating a quote from scratch in `quotes/new.tsx` works exactly as before
- [ ] Waitlist → quote prefill still works
- [ ] Quote → invoice conversion still works

**Website**
- [ ] Budget step shows real prices from the DB
- [ ] Prices render server-side (visible with JS disabled / in page source)
- [ ] Tier with `is_public = false` shows no price, form still submits
- [ ] Tier at R0 shows no price (never "R0")
- [ ] `pricing_tiers` query failing does not break the form
- [ ] Submitting still stores `budget_range` as `standard`/`elite`/`open`

**Quality**
- [ ] `npx tsc --noEmit` exits 0 in both repos
- [ ] No file over 300 lines
- [ ] No `any`, no unused imports
- [ ] No console errors in the terminal during the flows above
