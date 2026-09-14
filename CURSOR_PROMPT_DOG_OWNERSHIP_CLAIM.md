# Cursor Prompt — Claim dogs on registration, lock down prices and microchips, show only the current litter

## Do this first, before reading the rest

1. Read this whole file before changing anything.
2. Make the changes in **both** repos: `diedericks-dobermanns` (app) and `diedericksdobermann-web` (website).
3. Put any migration file in **both** `supabase/migrations/` folders, byte-identical, same filename.
4. Do **not** apply anything to the live database. Matt applies it, in the order given in Task 3.
5. Do **not** write test rows into the database. No VERIFY dogs, no test contacts.
6. **Order matters in Task 3.** Doing those steps out of order takes the public website down or leaks prices. Read Task 3 fully before starting it.
7. When done, run `npx tsc --noEmit` in both repos and paste the actual output.

Four tasks. Task 1 is a bug fix, Tasks 2 and 3 are privacy, Task 4 is content.

---

# Task 1 — Link dogs to the buyer when they register

## What is broken

When a buyer registers on the portal, `public.claim_my_records()` connects their new login to records created before they had an account.

Today it claims: applications, contacts, quotes, invoices, documents, waiting list, contracts.

**It never claims dogs.**

So a buyer registers and sees everything except the actual dog they bought. Their puppy is invisible.

This already hit two clients (Leo Middelberg, Gabrielle Kruger — fixed by hand 4 Sep 2026). **20 more dogs are in the same state**, waiting to fail the moment their owner registers.

The dog is linked to a *contact card* (`dogs.owner_contact_id`) but not to a *login* (`dogs.owner_id`). Row-level security scopes dogs by `owner_id` — see `public.dog_ids_for(uuid)` — so `owner_contact_id` alone gives the buyer nothing.

## The rule, and why it is narrow

Link a dog to a user **only** when all of these hold:

- `dogs.owner_id` is null (not already claimed)
- `dogs.owner_contact_id` points to a contact whose `user_id` is now this user
- that contact is not a merged-away alias (`merged_into_contact_id is null`)
- there is **no owner/buyer conflict** (below)

**Do not link on `buyer_contact_id`.** The buyer is whoever paid; the owner is whoever keeps the dog. They are often different people — gifts, family purchases, agents. Linking on buyer hands a dog's records to someone who is not its owner.

**Skip conflicts.** Where `owner_contact_id` and `buyer_contact_id` are both set and point to *different* contacts, the record is ambiguous and a human must resolve it. There is exactly **1** such dog right now (Puppy 9 "Yellow" — owner says Shanel Halgreen, buyer says Elrid Gerber). Auto-linking it could expose one client's records to another. Leave it alone.

## Migration

Create `supabase/migrations/<next_number>_claim_dogs_on_registration.sql` in **both** repos.

`CREATE OR REPLACE FUNCTION public.claim_my_records()` — preserve every existing claim block exactly as it is — and:

- add a `d integer := 0;` counter alongside the existing `a`, `q`, `w`, `c`
- change the signature to `RETURNS TABLE(applications integer, quotes integer, waitlist integer, contracts integer, dogs integer)`
- insert the dogs block **after** the existing contacts block (it depends on `contacts.user_id` already being set) and **before** the final `return query`
- change the last line to `return query select a, q, w, c, d;`

```sql
  update public.dogs dg
     set owner_id = v_uid
   where dg.owner_id is null
     and dg.owner_contact_id in (
       select ct.id from public.contacts ct
        where ct.user_id = v_uid
          and ct.merged_into_contact_id is null
     )
     and not (
       dg.buyer_contact_id is not null
       and dg.buyer_contact_id is distinct from dg.owner_contact_id
     );
  get diagnostics d = row_count;
```

Note `is distinct from`, not `<>`. A null-unsafe `<>` has already caused a live security bug on this project — comparing against null returns null, not true, and the row slips through the filter.

Keep the existing `SECURITY DEFINER` and `SET search_path TO 'public'`. Do not change them.

## Callers

Search both repos for `claim_my_records` and update every caller for the new fifth column. `types/database.types.ts` needs regenerating in both repos after Matt applies the migration — flag that as a follow-up, do not hand-edit the types.

---

# Task 2 — Microchip numbers: fix the right file

A microchip number is a permanent identity number tied to the owner's name and address in the national registry.

**`DOG_LIST_SELECT` is already clean — do not touch it.** It does not contain `microchip_number`.

The leak is **`DOG_DETAIL_SELECT`** in `diedericks-dobermanns/hooks/useDogs.ts` (line 29 onward). It includes `microchip_number`, and `useDog(id)` at line 110 runs it with only `.eq('id', id)` — no `is_public` filter. Row-level security is the sole gate, so for any public dog an anonymous visitor gets the microchip.

Verified live: **an anonymous visitor can currently read 18 microchip numbers.**

**Remove `microchip_number` from `DOG_DETAIL_SELECT`** and from the equivalent public dog-detail select in the website repo.

If a public-facing component renders it, remove the render too — do not leave a placeholder that still ships the value into the DOM.

**Do not remove it from** `usePortal.ts`, `useKennelDogs.ts`, `useAdmin.ts`, `lib/contracts/renderSaleContract.ts`, `lib/contracts/tokens.ts`, `lib/reports/litterReportPdf.ts`, `useLitterReports.ts`, `useLitterPuppySearch.ts`, `lib/dogs/search.ts`. Those are owner-only or admin-only and are correct.

Good news, verified live: **owner names, phones, emails and WhatsApp numbers are NOT exposed.** `DOG_DETAIL_SELECT` embeds `owner_contact`, but row-level security on `contacts` blocks anonymous reads, so the embed returns null. Leave the contacts policies alone.

---

# Task 3 — Make it impossible to publish a price

## Why this is not just a code change

Right now **zero prices are readable publicly** — but only because no public dog has a price set. It is luck, not a control.

`price` is in **both** `DOG_LIST_SELECT` and `DOG_DETAIL_SELECT`. The moment Task 4 publishes the nine sold puppies, all nine prices ship to the public website — R15,000 to R55,000, littermates side by side, a 3.7× spread.

A code edit alone is not enough. Any future query that adds `price` back re-opens it silently. Matt asked for certainty, so lock it at the database.

## The order. Do not deviate.

Getting this backwards causes a public outage, because PostgREST returns a 403 for the whole request if a query selects a column the role cannot read.

**Step 1 — code first.** Remove `price` from `DOG_LIST_SELECT` and `DOG_DETAIL_SELECT`, and from every anon-reachable select in the website repo. Grep both repos for `price` in any query against `dogs` and list every hit you find, with a note on whether it is anon-reachable.

**Step 2 — Matt deploys that.** No database change yet.

**Step 3 — only then, the revoke.** Supply as a separate file, `supabase/migrations/<next>_revoke_public_dog_price.sql`, in both repos:

```sql
revoke select (price) on public.dogs from anon;
```

Revoke from `anon` **only**. Do **not** revoke from `authenticated` — the portal, admin screens, quotes and contracts all need `price`, and revoking there breaks Matt's own dashboard.

Include the rollback line in a comment: `grant select (price) on public.dogs to anon;`

**Step 4 — verify before publishing anything.** See acceptance checks.

## The trade-off Matt needs to know

After this, **no price can ever be shown on the public website**, including a future available puppy that Matt might want listed at a price. Most premium breeders run "enquire for pricing" and this matches that, but it is a real constraint.

If he later wants public pricing, the clean route is a separate `public_price` column that is deliberately published, keeping the real `price` private. Do not build that now. Note it as a follow-up.

---

# Task 4 — Show only the current litter publicly

## Current state, verified live

- **No born litter is public.** All 26 have `is_public = false`.
- **14 individual puppies are flagged public**, scattered across 9 old litters (4 from Jun 2024, 2 from Apr 2023, 1 from Apr 2021, and so on). Stale flags, not a curated gallery.
- 3 *expected* litters are public with no puppies attached.
- 17 adult dogs are public. Anonymous visitors see 31 dogs in total.

## What Matt wants

The public litter section shows **one litter: Claire × Santini, Jul 2026** (litter letter J, 10 pups). Everything else in the puppy area comes down.

**Adult dogs stay exactly as they are.** Do not change the 17 public adults — that is the breeding programme and stud line.

## Three rules for this litter

Every puppy in it is **sold**, and one is **deceased**.

1. **Exclude the deceased puppy** (Puppy 10). Never render a deceased puppy publicly.
2. **No prices.** Task 3 enforces this at the database. Do not add a price display to the public puppy card.
3. **Label it placed, not available.** Nine of nine are sold. Present it as a recent-litter showcase with a clear "all placed" state and a route to the waiting list — not an availability grid.

## Implementation

Prefer flipping data over hard-coding an ID. Do **not** put the litter UUID in the source.

Deliver a **separate, reversible SQL file** in both repos (`supabase/migrations/<next>_public_litter_showcase.sql`) that:

- sets `litters.is_public = true` on Claire × Santini only
- sets `dogs.is_public = true` on its 9 non-deceased pups
- sets `dogs.is_public = false` on the 14 stale public puppies in other litters
- leaves the 3 expected litters public — they drive waiting-list enquiries
- leaves all 17 adult dogs untouched

Record the previous values in a comment so it can be rolled back. Do not run it.

Then make sure the public litter and puppy views read from `is_public` on both the litter and the dog, rather than any hard-coded list, so Matt can change the showcase litter from the admin screen later without a deploy.

**This file is applied LAST**, after Task 3's revoke is live and verified.

---

## What NOT to change

The public dog list showing 31 dogs and 182 public weight readings is **correct**. That is what an anonymous visitor sees, and the weight logs draw the growth charts on the public litter pages. Do not restrict the policies `Public dogs are viewable by everyone` or `Public weight logs viewable for public dogs` — doing so blanks the public site.

Do not touch `Owners view their own dog weight logs` (added 4 Sep 2026, verified working) or any policy on `contacts`.

---

## Acceptance checks

Report the actual number for each. Do not write "done".

1. `npx tsc --noEmit` clean in **both** repos. Paste the output.
2. Every migration file exists in both `supabase/migrations/` folders and each pair is byte-identical. Show the diff result.
3. Grep both repos for `microchip_number` in any anon-reachable select — expect **zero** hits.
4. Grep both repos for `price` in any anon-reachable select against `dogs` — expect **zero** hits. List every `price` hit you found and why you judged it safe or not.
5. Grep both repos for the Claire × Santini litter UUID — expect **zero** hits outside the SQL file.
6. State how many callers of `claim_my_records` you found and updated.
7. Confirm in writing that you did not run anything against the live database.

## For Matt to run after applying, in this order

These are the live numbers to expect. If any differs, stop.

**Before publishing the litter**, as the anonymous role:

- microchips readable: **18 now → 0** after Task 2 deploys
- prices readable: **0 now, and must still be 0** after the litter is published
- contacts readable: **0** — must stay 0

**After the claim migration:**

- 20 dogs currently have `owner_id is null` with an `owner_contact_id` set
- 1 is the conflicting record and **must stay unlinked**
- 1 is claimable immediately and should link on that owner's next sign-in
- the remaining 18 link as each owner registers

**After the showcase file:**

- public puppies go from 14 scattered across 9 old litters to 9, all in Claire × Santini
- public adult dogs stay at 17
