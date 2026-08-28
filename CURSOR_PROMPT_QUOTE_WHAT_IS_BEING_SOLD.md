# CURSOR PROMPT — Quote a specific puppy, a future litter, or nothing in particular

A quote line can only point at a **specific existing puppy** (`quote_items.dog_id`). That covers
one of the three things Matt actually sells, and not the most common one.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## The three things being sold

**1. A specific puppy** — it exists, it has a collar, the buyer has chosen it.
Currently 8 available across Claire × Santini (6), Cyrus × Hunter-King (1), Cendra × Dharka (1).
Works today.

**2. A place in a future litter** — the litter exists and is expected; **no puppies exist yet**.
Odessa × Santini due 26 Sep and Hannah × Hunter-King due 1 Oct both have **0 puppies recorded**.
**This cannot be quoted at all right now**, and it is what the waiting list is waiting for.

**3. A puppy of a given tier, litter not yet decided** — still a real product with a real price:
a **Standard Puppy at R20 000** or an **Elite Developed Puppy at R60 000**. What is missing is only
the litter and the individual pup. Possible today only as free text, which means it is invisible to
every report.

**This is not a blank line.** The tier and the price are always required. The buyer is buying a
Dobermann of a stated standard at a stated price; the only open question is which litter it comes
from. A line with no tier must not be saveable.

---

## Migration `0075_quote_line_subject.sql`

Check the folder and take the next free number.

```sql
alter table public.quote_items
  add column if not exists litter_id uuid references public.litters(id) on delete set null,
  add column if not exists subject_kind text not null default 'unallocated'
    check (subject_kind in ('dog','litter','unallocated'));

create index if not exists quote_items_litter_id_idx
  on public.quote_items(litter_id) where litter_id is not null;

-- The subject must match what is actually attached, or a quote can claim a
-- specific puppy while pointing at nothing.
alter table public.quote_items
  add constraint quote_items_subject_consistent check (
    (subject_kind = 'dog'         and dog_id is not null) or
    (subject_kind = 'litter'      and litter_id is not null and dog_id is null) or
    (subject_kind = 'unallocated' and dog_id is null and litter_id is null)
  );
```

**Back-fill:** existing lines with a `dog_id` become `'dog'`; everything else `'unallocated'`.
The four existing quotes all have `dog_id = null`, so they become `unallocated` — which is the
truth about how they were written.

---

## The line editor

One control at the top of the line: **What is this for?**

| Choice | Then | Description becomes |
|---|---|---|
| **A specific puppy** | Puppy picker, grouped by litter, showing collar colour, sex and colour | *"Puppy 3 (Gold) — Claire × Santini, male, black & tan, docked"* |
| **A future litter** | Litter picker: expected and planned litters, with dam × sire and due date | *"Standard Puppy from Odessa × Santini, expected 26 Sep 2026"* |
| **A puppy — litter not yet decided** | **Tier picker, required** | *"Standard Puppy — litter to be confirmed"* / *"Elite Developed Puppy — litter to be confirmed"* |

Label that third option **"A puppy — litter not yet decided"**, never "none" or "nothing". It is a
real product at a real price; only the litter is open. **The tier is mandatory on all three
options** — a line without one cannot be saved, and the message says *"Choose Standard or Elite —
this sets the price."*

**Default sensibly from the application.** `litter_interest_id` set → future litter, that litter
preselected. `specific_dog_id` set → that puppy. Otherwise **litter not yet decided**, with the
tier taken from the application's `dog_interest` — the honest default, because most buyers are
quoted before a puppy exists.

Pricing is unchanged and already correct: dog's own price → dog tier → litter default tier →
application `dog_interest`. **Keep showing where the price came from.**

## What each one means when accepted — this is the part that matters

These are not cosmetic labels. They mean different things commercially, and the system must not
blur them.

- **Specific puppy** — on deposit, that puppy is reserved and comes off the available list. Nobody else can be sold it.
- **Future litter** — on deposit, the buyer holds a **place in that litter**, not a puppy. Nothing is reserved, because there is nothing to reserve. When the litter is born and matching runs, that place resolves to an actual puppy.
- **Unallocated** — on deposit, a place on the waiting list, matched to a litter later.

**Never let a future-litter or unallocated quote mark a dog as reserved.** Overselling a puppy that
does not exist is the worst failure this system could produce, and the constraint above makes it
structurally impossible rather than merely unlikely.

Say it plainly on the quote and in the PDF, so the buyer knows what they have paid for:

> *"This reserves a place in the Odessa × Santini litter, expected 26 Sep 2026. Your specific puppy
> is chosen once the litter is born and assessed."*

## When the litter is born

On the litter's puppy-allocation screen, show the quotes holding a place in that litter — buyer,
deposit paid, date, and their stated preferences. That is the queue for that litter, and it should
be sitting there when Matt opens it, not something he has to reconstruct.

Allocating a puppy to one of those buyers updates the line from `litter` to `dog` with the real
`dog_id`, keeping the same quote and the same money. **Do not create a second quote** — the buyer
already has one and a second document is a second price to argue about.

---

## Clean up the litter picker first

Three litters have no name, no dam, no sire and no date — visible as `? — due ?` and `a — due ?`.
They would appear in the picker as blank rows.

**Report them and stop. Do not delete anything.** They may be tests, or they may be half-entered
real litters. List their ids, creation dates and any linked records, and let Matt decide. The
picker meanwhile shows only litters with a dam and a sire.

---

## The app

Same three-way choice in the app's quote builder, same defaults, same wording on the PDF. Matt
quotes from his phone; a mode that only exists on the website will not get used.

---

## Rules

- The subject constraint is enforced in the database, not only in the UI.
- A future-litter or unallocated line never reserves a dog.
- Allocation updates the existing line; it never creates a second quote.
- Every quote states in words what the buyer is getting.
- Do not change the pricing rules or the delivery decision — this is about what is being sold.
- Do not delete the malformed litters. Report them.
- No file over 300 lines. `requireAdmin()` on admin actions.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify

- [ ] **Apply the migration and confirm the columns exist in the live database before reporting done.** Migration `0074` was written and deployed but never applied, and the quote builder would have failed on first save. Do not repeat that.
- [ ] A line can be saved against a specific puppy, against Odessa × Santini (which has no puppies), and as a tier-only line with no litter.
- [ ] A tier-only line still carries the tier and its price — "Standard Puppy — litter to be confirmed" at R20 000, not a blank product.
- [ ] A line with no tier cannot be saved, on any of the three options, and the message explains why.
- [ ] The database rejects a line claiming `subject_kind = 'dog'` with no `dog_id`.
- [ ] The database rejects a `litter` line that also carries a `dog_id`.
- [ ] Quoting Odessa × Santini and taking a deposit reserves **no** dog — verify by SQL that no `dogs.status` changed.
- [ ] Quoting a specific puppy and taking a deposit **does** reserve that puppy.
- [ ] The PDF states plainly which of the three the buyer is getting.
- [ ] An application with `litter_interest_id` set defaults to that litter.
- [ ] The litter's allocation screen lists buyers holding a place in it.
- [ ] Allocating a puppy converts the line to `dog` and keeps the same quote number and total.
- [ ] The litter picker shows no blank rows, and the three malformed litters are reported to Matt, not deleted.
- [ ] The app offers all three modes.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**.
- [ ] App: `npx tsc --noEmit` exits 0.

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
