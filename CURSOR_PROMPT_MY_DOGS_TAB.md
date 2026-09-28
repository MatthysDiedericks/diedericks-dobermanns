# Cursor Prompt — A "My dogs" tab on the dogs screen

## Do this first

1. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
2. `npx tsc --noEmit` in both when done. Paste the real output.

---

## The problem

`/admin/dogs` lists **184 dogs** — every puppy ever bred, most of them sold years ago. Matt's own
kennel is **15 animals**. To look at his own dogs he searches a 184-row directory, and the three tabs
he has (Directory, Unallocated, Ancestor photos) do not include the one view he wants most.

DogBreederPro does have this screen ("My Dogs (14)") and he wants ours to match it and beat it.

## What "my dogs" means here — do not guess this

**`ownership_status` cannot answer it.** Checked on the live database: there is **no row anywhere with
`ownership_status = 'kennel'`**. The values actually in use are `unknown`, `lost_contact`, `deceased`,
`with_owner`, `returned`. The field describes dogs that have *left*, not dogs that are here.

The kennel's own dogs are identified by **`status`**:

```sql
status in ('keep', 'stud', 'in_training', 'available')
```

which returns exactly these 15 — 9 females, 6 males:

| Females | Males |
|---|---|
| Cendra, Claire, Cleopatra, Cyrus, Hailey, Hannah, Kim, Odessa (keep) · Jazzmine (in training) | Dharka, Hunter-King, Santini (stud) · Bruce, Eben (in training) · Zues (available) |

Put that predicate in **one exported function** — `isKennelDog()` in `src/lib/dogs/kennel.ts` — and
have every consumer use it. It will be wrong one day and there must be a single place to fix it.

**Do not filter on `programme_tier`.** Only 2 of the 15 have one.

---

## Task

### 1. The tab

Add **My dogs** to the existing tab strip on `/admin/dogs`, as the **first** tab and the default
landing view. Route `/admin/dogs/mine`. Keep Directory, Unallocated and Ancestor photos exactly as
they are.

Heading line, same style as the current one: `15 dogs · 9 females · 6 males`.

### 2. The cards

Two sections, **Females** then **Males**, each with its count in the heading. Cards in a responsive
grid — 3 across on desktop, 2 on tablet, 1 on mobile.

Each card:

- **Photo** — use `profilePhoto.ts`, the resolver that already exists. Pinned cover if set, otherwise
  the daily rotation. A dog with no photo gets a clean initial block, never a broken image.
- **Call name**, large. **Registered name** underneath in smaller type, only when it differs.
- **Sex and status** as one chip: *Stud*, *Brood*, *In training*, *Available*.
- **Age** computed from `date_of_birth` — `7y 5m`, with the date beneath.
- **Microchip** when present.
- **Colour and collar colour** when present.

Then one line that earns its place, different per sex:

- **Females** — last heat date and days since, from `heat_cycles`. If a next date is predicted, show
  it. This is the line Matt looks at most and DogBreederPro does not have it.
- **Males** — progeny count, using `progenySummary.ts` which already exists. *"14 pups bred"*.

**Clicking anywhere on the card opens that dog's full profile.** The whole card is the link, not a
small "view" button.

### 3. Four things that make it better than the screen we are copying

1. **No scrollbars inside cards.** The DogBreederPro cards have their own inner scrollbar and the
   registered name is cut off mid-word. Fix the card height and let long names wrap to two lines,
   truncating with an ellipsis after that. Anything that does not fit belongs on the profile.
2. **Show what is missing.** Four of the fifteen have no microchip and several have no papers. Put a
   quiet amber flag on the card — *No microchip*, *No photo*, *No papers* — so the gaps are visible
   where the dog is, not only in a summary count at the top of the directory. Never a red alarm; this
   is a nudge, not a fault.
3. **Deceased are out by default, with a toggle to show them.** Matching the "Not Deceased" filter
   DogBreederPro defaults to. Retired or deceased dogs appear greyed with their dates when toggled on.
4. **Sort control** — name, age, or status. Default: status then name, so studs and brood bitches
   group together rather than scattering alphabetically.

### 4. The app

Same screen in `diedericks-dobermanns` — a My dogs tab on the dogs screen, same sections, same card
content, same tap-through. Cards stack one per row on a phone.

### 5. Tests

- `isKennelDog` returns true for the four kennel statuses and false for `sold`, `deceased`, `reserved`
- The tab shows 15 today, split 9 and 6
- A dog with no photo renders the initial block rather than a broken image
- A dog with no microchip shows the flag; one with a microchip does not
- Deceased are excluded until the toggle is on
- Clicking a card lands on `/admin/dogs/[id]`

---

## Do not

- Do not filter on `ownership_status`. No dog has `kennel` and the field means something else.
- Do not filter on `programme_tier` — 13 of the 15 have none.
- Do not build a second photo resolver. `profilePhoto.ts` exists.
- Do not build a second progeny counter. `progenySummary.ts` exists.
- Do not change the Directory, Unallocated or Ancestor photos tabs.
- Do not create test dogs in production.

---

## Report

1. `kennel.ts` with `isKennelDog`, and its tests.
2. The tab rendered, with the counts, both sections and the flags visible.
3. One female card showing the heat line and one male card showing the progeny count.
4. A card for a dog with no photo and no microchip.
5. The same screen in the app repo.
6. `npx tsc --noEmit` clean in both repos.
