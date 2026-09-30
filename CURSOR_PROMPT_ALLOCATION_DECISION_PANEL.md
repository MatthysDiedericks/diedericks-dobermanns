# Cursor Prompt — Allocation must show the decision, not just a dropdown

## Do this first

1. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
2. `npx tsc --noEmit` in both, plus `npm run parity`. Paste the real output.
3. Read `src/lib/waitlist/matching.ts` and `src/components/litters/LitterAllocateBoard.tsx`
   before writing anything.

---

## Bug 1 — A dead puppy is offered for allocation

Every "Allocate to a puppy…" dropdown on the Odessa × Santini litter lists **K7**. K7 is
`status='deceased'`, `outcome='stillborn'`, no collar, no birth weight.

```
K1 orange  female  live       K5 red    female  live
K2 purple  male    live       K6 peach  female  live
K3 pink    female  live       K7 —      male    DECEASED  ← in the dropdown
K4 yellow  male    live
```

The grid already filters deceased pups (`alive` in `LitterWeightGrid`). The allocation dropdown
does not. Filter it the same way, everywhere a puppy can be chosen. Allocating a client to a
stillborn puppy is a mistake there is no recovering from gracefully.

## Bug 2 — The dropdown does not say what the puppy is

It reads `K1 (orange)`. It does not say the puppy is female, black and tan. So there is nothing
on screen to check a client's stated preference against, and **sex is currently matched by
memory**.

Matt's requirement, in his words: *"we need to be very sure the client wanted a male or female
and the pup is also a male and female"*.

**Fix:** every option reads `K2 · purple · male · black & tan`, and the litter's live pups are
summarised above the queue:

```
6 live pups — 2 male (K2 purple, K4 yellow) · 4 female (K1 orange, K3 pink, K5 red, K6 peach)
All black & tan
```

## Bug 3 — The client row does not say what the client asked for

Today a row shows `Quote Sent · male · black tan · natural`. That is not enough to allocate on.
Matt needs, per his list: **which tier they wanted (elite or standard)**, **docked or natural**,
and **special requirements or notes**.

All of it is already in `waiting_list` and simply not rendered: `preferred_category`,
`tail_preference`, `ear_preference`, `registration_type`, `preference_notes`, `hold_reason`,
`hold_until`, `admin_notes`.

**Fix — each queue row shows:**

- **Tier**: `Elite developed` or `Standard`, as a chip. It is a price and a programme difference,
  so it must be the most prominent field after the name.
- **Sex · colour · tail · ears**, each labelled, with `No preference` written out rather than
  left blank. A blank field and "they don't mind" must not look the same.
- **Notes**, shown in full, not truncated. See Bug 4 for why.
- **Hold**, if set — `On hold until 29 Dec 2026` plus the reason (Alyssa Buxmann has one now).
- Days waiting and stage, as now.

## Bug 4 — The decisive information is in free text, and nobody sees it

This is the one that will bite. Two live examples from the current queue:

**Wanda Von Mollendorff** — structured fields say `standard · female · black tan · docked`,
deposit paid, 14 days waiting. Her note says:

> *"Ons wil graag 2 tewe bestel, en op waglys wees vir Oktober 2027 aangesien ons perseel eers
> dan gereed gaan wees."*

She wants **two females**, and she wants to wait until **October 2027**. Nothing in the
structured fields says either. As the screen stands today she is a normal candidate for this
litter, and allocating her a puppy would be wrong twice over.

**Xana Garcia Garcia** — `ear_preference` is `no_preference`, but her note reads *"We would
prefer ear cropping if possible."*

So: **show `preference_notes` in full on every row, never collapsed behind a "more" link**, and
flag rows whose notes contain a future date, a year, a quantity, or words like *later*, *wait*,
*next litter* — as a **"Read the note"** marker. A heuristic flag is fine and appropriate here;
it prompts a human to read, it does not decide anything.

Then give Matt a one-click way to promote what he reads into structure: **Set hold** (writing
`hold_reason` + `hold_until`, as Alyssa's was) and **Set preference**. Wanda's October 2027 belongs
in `hold_until`, not only in a paragraph of Afrikaans.

## Bug 5 — Matching must be checkable, not trusted

For each client row against each live puppy, show the match as **explicit per-attribute ticks**,
not a single score:

```
K2 purple male black&tan
Sex      ✓ wants male
Colour   ✓ wants black & tan
Tail     ⚠ wants docked — not yet decided on this puppy
Tier     ⚠ wants Elite developed — puppy not yet tiered
```

**A mismatch on sex is a hard block**, not a warning: if the client asked for a male, a female
puppy cannot be selected for them without an explicit override that states what is being
overridden. Sex is the one preference nobody changes their mind about quietly, and it is the one
Matt named.

`tail_type` and `programme_tier` are **null on all six puppies**. So those rows must read *"not
yet set on this puppy"* — never a tick, and never a silent pass. `statedPreferencesMet` in
`matching.ts` currently requires sex AND colour AND tail, which means with tail null it matches
nobody; that is why matching "returns almost nothing". Treat an unset attribute on the **puppy**
as *unknown*, not as *fails* — and say so on screen.

## The picture Matt cannot currently see

With 16 active waiting-list entries and 6 live puppies:

| | |
|---|---|
| Want a **male** | **8** |
| Want a **female** | **8** |
| **Males available** | **2** (K2, K4) |
| **Females available** | **4** |
| Want **Elite developed** | 7 |
| Want **Standard** | 9 |
| All six puppies are | black & tan |

Eight people are waiting for one of two males. Put that summary at the top of the allocation
screen. It is the single most useful thing the page could tell him, and right now he has to work
it out in his head every time.

Colour demand includes `brown_tan` (Jocelyn, Reef, Timothy, Samantha, Henko, Ronel, Alyssa) and
this litter has none — those rows should show colour as a mismatch, clearly, rather than being
silently offered.

---

## Already done — do not redo

- **Felicia Nell's waiting-list entry was deleted** on 29 Sep 2026 (test data, Matt's
  instruction), backed up in `dbp_import.litter_data_fixes`. Her **application, quote and client
  user account still exist** — Matt has not said to remove those. Leave them.
- Alyssa Buxmann's hold is set in the database (`hold_reason`, `hold_until` 29 Dec 2026). The UI
  to display it is Bug 3 above and is not built yet.
- Active waiting-list count is now **16**.

## Do not

- Do not offer deceased or stillborn puppies for allocation anywhere.
- Do not let a sex mismatch through without an explicit, recorded override.
- Do not truncate `preference_notes`.
- Do not auto-write a hold from a note. Flag it for Matt; he confirms.
- Do not treat a null `tail_type` or `programme_tier` on a puppy as a failed match.
- Do not create test waiting-list entries in production. Felicia's was one, and it reached the
  live allocation screen.

## Report

1. The allocate dropdown with **K7 absent** and each option reading sex and colour. Screenshot.
2. A queue row showing tier, all four preferences, full notes, and — for Alyssa — the hold.
3. **Wanda Von Mollendorff's row carrying a "Read the note" flag**, and her October 2027 promoted
   into `hold_until` through the UI.
4. An attempted sex-mismatched allocation being blocked, and the override path when forced.
5. The supply-and-demand summary showing 8 waiting for 2 males.
6. `npx tsc --noEmit` clean in both repos, `npm run parity` clean.
