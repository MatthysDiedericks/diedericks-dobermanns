# CURSOR PROMPT — Buyer pipeline breadcrumb and puppy matching

Matt's process is: **application → quote → payment → invoice → waiting list with requirements →
match born puppies to the right buyer.**

Most of the schema for this already exists and is well built. **Three things block it**, and the
first is the reason matching cannot work today.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Blocker 1 — three colour vocabularies that do not match

```
dogs.colour                       black_rust | red_rust
applications.preferred_colour     black_tan  | brown_tan | no_preference
waiting_list.preferred_colour     black      | brown        (free text, NO constraint)
```

**Nothing joins.** `black_rust` ≠ `black_tan` ≠ `black`. A buyer who asked for black & tan can never
be matched to a black puppy, because the two words are different strings. Any matching built on top
of this silently returns nothing, or worse, matches on a fallback and gets it wrong.

## Blocker 2 — puppies have no tail field

`dogs` has `ear_type` (all null) and **no tail column at all**. Buyers state a tail preference on
the application — `docked` / `natural` / `no_preference` — and there is nothing on the puppy to
match it against. Docking is decided in the first days of life and is irreversible; it is one of
the two things a buyer actually cares about.

## Blocker 3 — the pipeline never advances by itself

`waiting_list.pipeline_stage` already allows exactly the stages Matt described:

```
enquiry → application → approved → quote_sent → deposit_paid → matched → reserved → handover_complete
                                              (+ on_hold, do_not_sell, withdrawn)
```

But nothing moves it. All five current rows sit at `reserved`, and preferences captured on the
application are not copied onto the waiting-list entry — so the requirements exist in one table and
the matching would run against another.

---

## Migration `0069_pipeline_and_matching.sql`

Number after the de-duplication migration renamed to `0068`. Check the folder; do not collide.

### 1. One colour vocabulary

Canonical values: **`black_tan`**, **`brown_tan`**, and `no_preference` for preferences only.

Use the application's vocabulary — it is client-facing and already correct in three places. Add a
column comment recording that the FCI breed standard calls this marking **"rust"**, and that
`black_rust` / `red_rust` were the previous internal terms for the same two colours, so nobody
"corrects" it back later.

```sql
update public.dogs set colour = 'black_tan' where colour = 'black_rust';
update public.dogs set colour = 'brown_tan' where colour = 'red_rust';

update public.waiting_list set preferred_colour = 'black_tan' where preferred_colour in ('black','black_rust');
update public.waiting_list set preferred_colour = 'brown_tan' where preferred_colour in ('brown','red','red_rust');
update public.waiting_list set preferred_colour = 'no_preference' where preferred_colour is null or preferred_colour = '';

alter table public.dogs add constraint dogs_colour_check
  check (colour is null or colour in ('black_tan','brown_tan'));
alter table public.waiting_list add constraint waiting_list_preferred_colour_check
  check (preferred_colour is null or preferred_colour in ('black_tan','brown_tan','no_preference'));
```

**Report the row counts changed.** If any `dogs.colour` value falls outside those two, stop and
list them rather than forcing the constraint — an unexpected colour is information, not an error.

Put the display labels in one shared constants module per repo: `black_tan` → "Black & Tan",
`brown_tan` → "Brown & Tan". **Never hard-code a colour label in a component.**

### 2. Tail on the puppy

```sql
alter table public.dogs
  add column if not exists tail_type text
    check (tail_type is null or tail_type in ('docked','natural')),
  add column if not exists tail_docked_date date;
```

Null means not yet decided or unknown — **do not default it**. A puppy wrongly showing as docked
would be matched to a buyer who wanted natural, and that cannot be undone.

### 3. Preferences flow from application to waiting list

When an application is approved and a waiting-list entry is created or linked, copy
`preferred_sex`, `preferred_colour`, `tail_preference`, `budget_range` and `preferred_timeline`
across. Do this in the approval action, not a trigger — it needs to be visible and overridable in
the UI, because Matt often learns the real preference on a phone call.

Back-fill the five existing rows where the linked application has values and the waiting-list entry
does not. **Do not overwrite anything already set by hand.**

---

## The breadcrumb — make the pipeline advance on real events

Each stage moves when the thing actually happens, recorded with `stage_updated_at` and
`stage_updated_by`:

| Event | Stage becomes |
|---|---|
| Application submitted | `application` |
| Application approved | `approved` |
| Quote sent (`quotes.sent_at` stamped) | `quote_sent`, store `quote_id` |
| Deposit payment recorded | `deposit_paid`, store `deposit_invoice_id` |
| Puppy allocated | `matched`, store `assigned_dog_id` |
| Contract signed / reservation confirmed | `reserved` |
| Handover completed | `handover_complete` |

**Never move a stage backwards automatically.** If a quote is cancelled or a payment reversed, flag
it for Matt rather than silently reversing — a buyer who has paid and been un-paid by a trigger is
a phone call nobody wants.

`on_hold`, `do_not_sell` and `withdrawn` are manual only, and each requires a reason.

**Show the breadcrumb** on the waiting-list detail, the client's portal, and the app: the seven
stages with the current one highlighted, the date each was reached, and one line on what happens
next. On the client's side it answers "where am I?" without an email to Matt — which is the whole
point.

---

## The matching engine

When puppies are registered against a litter, produce a ranked list of waiting buyers per puppy.
**It suggests. It never assigns.**

### Hard filters — exclude, do not score

- `pipeline_stage` in `approved`, `quote_sent`, `deposit_paid` (already `matched`/`reserved`/`handover_complete` are done; `on_hold`, `do_not_sell`, `withdrawn` are out)
- `preferred_category` matches the puppy's `programme_tier`, or is `any`
- Puppy status is `available`

### Soft score — 100 points

| Criterion | Points | Rule |
|---|---|---|
| Sex | 30 | exact match, or preference is `any` |
| Colour | 30 | exact match, or preference is `no_preference` |
| Tail | 25 | exact match, or preference is `no_preference` |
| Waiting time | 15 | scaled across the current queue — longest waiting gets the full 15 |

A `no_preference` scores full marks — a buyer with no preference is genuinely satisfied by any
puppy, and should not be penalised for being easy to please.

### Ranking

**Perfect fits first** (every stated preference met), then by score, then by `date_added` ascending
so **the longest wait wins any tie**. Matt's `priority` field (`high`/`normal`/`low`) overrides
within the same fit band — it is his manual thumb on the scale and must not be outranked by the
algorithm.

Show, per candidate: name, days waiting, what matches, and **what does not** — *"Wants natural
tail, this puppy is docked"*. The mismatch line matters more than the score. Matt will overrule the
ranking regularly and needs to see why, not a number.

Also surface the reverse view — per waiting buyer, which puppies in the current litter fit. Both
directions are useful: "who gets this puppy" and "is there anything here for Deon".

### Allocation stays manual

Selecting a buyer calls the existing `allocateDogToClient` / `allocateDogFromWaitlist` path — do
not write a second allocation route. Confirm with what will happen: *"Puppy 3 (Gold) → Deon Vlok.
This sets the puppy to reserved and moves Deon to matched."*

**No automatic emails.** Nothing in this feature messages a client.

---

## Waiting list screen

- Sorted by pipeline stage, then longest waiting.
- Each row: name, days waiting, stage, and preferences as compact chips — *"Elite · Male · Black & Tan · Docked"*.
- Filter by stage, category, and "has unmet preferences".
- **Prominent days-waiting.** Someone at 180 days should be visually loud. Matt asked for longest-waiting to be visible as priority, and a number in a column is not visible enough.
- The client's own portal shows their position and preferences but **never the rest of the list** — the existing rule that a buyer cannot see other buyers stands.

---

---

## Litter list — sort and filter

29 litters going back to 2019 and the list has no ordering control. Both repos.

**Sort:** newest first / oldest first. **Default newest first** — the current litter is almost
always the one wanted, and today it is not guaranteed to be at the top.

**Filter by dam.** Only females that have actually whelped, each with its litter count, ordered by
count then name. From the live data:

```
Cyrus (6) · Cuba (4) · Odessa (4) · Cait (3) · Claire (3) · Hailey (3) · Hannah (2) · Cendra (1)
```

Build the list from a query, not a hard-coded array — it changes with every litter.

**Filter by year**, from the litter's `actual_date`, falling back to `expected_date`. Show the
count per year so an empty year is visibly empty rather than looking broken.

- Filters combine (dam **and** year), and there is a visible **Clear filters** when any is active.
- **Persist the choice** — `localStorage` on the website, `AsyncStorage` in the app. Re-selecting "newest first" on every visit is the kind of small friction that makes a screen feel unfinished.
- The empty state names the active filters: *"No litters for Hailey in 2024."* Never a bare "No results" — the user needs to know it is the filter, not missing data.
- Expected litters (`status = 'expected'`) sort by `expected_date` and stay visible under both sort orders. A litter due in six weeks must not disappear because it has no `actual_date`.

## Rules

- One colour vocabulary, one shared constants module, no hard-coded labels.
- Dam and year filter lists are queried, never hard-coded.
- Never default `tail_type`.
- The pipeline never auto-reverses.
- Matching suggests; a human allocates.
- Nothing here sends a message to a client.
- `requireAdmin()` on every admin page and action. No file over 300 lines.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify

- [ ] `select distinct colour from dogs` returns only `black_tan` and `brown_tan`.
- [ ] No waiting-list row has a `preferred_colour` outside the three allowed values.
- [ ] A puppy with `tail_type` null is never matched to a buyer who asked for docked or natural — it appears with an explicit "tail not recorded" note.
- [ ] Approving an application copies the four preference fields onto the waiting-list entry and does not overwrite hand-entered values.
- [ ] Sending a quote moves the entry to `quote_sent` and stores `quote_id`.
- [ ] Recording a deposit moves it to `deposit_paid`.
- [ ] Cancelling a quote does **not** move the stage backwards — it raises a flag.
- [ ] Two buyers with identical preferences rank by `date_added`, longest waiting first.
- [ ] A `no_preference` buyer scores full marks on that criterion.
- [ ] A `high` priority buyer outranks a `normal` one **within the same fit band**, not across bands.
- [ ] Every candidate row shows what does not match, in words.
- [ ] Litters default to newest first; the sort toggle reverses them.
- [ ] The dam filter lists exactly the eight dams with their counts, built from a query.
- [ ] Dam and year filters combine, and Clear filters appears when either is active.
- [ ] The sort and filter choice survives leaving the screen and coming back, in both repos.
- [ ] An expected litter (Odessa × Santini, Hannah × Hunter-King) stays visible under both sort orders.
- [ ] The empty state names the active filters.
- [ ] Allocating goes through the existing allocation path — no second route.
- [ ] A client sees their own position and never another buyer's entry. Verify with a real client JWT.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**.
- [ ] App: `npx tsc --noEmit` exits 0, types file not double size.

### Build the commit, not the working tree

```powershell
git clone --no-hardlinks . ../_buildcheck
cd ../_buildcheck; git checkout <commit you are about to push>
npm ci; npx next build
cd ..; Remove-Item -Recurse -Force _buildcheck
```

- [ ] The clean checkout builds.
- [ ] After pushing, report Vercel status. **Do not request GitHub or Vercel authentication** — Matt reads the dashboard.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Push both, then `git log origin/main -1` in each and confirm it matches `HEAD`.

Do not modify (committing is fine): `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/lib/issues/capture.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
