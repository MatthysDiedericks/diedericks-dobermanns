> # ⛔ SUPERSEDED — DO NOT RUN
>
> Replaced by **`CURSOR_PROMPT_DOG_PROFILE_AND_SEARCH.md`**, which contains everything
> below plus the search consolidation and the lineage strip. Running both would build
> the litter-table work twice. Kept only as a record of what was asked on 14 Sep 2026.

# Cursor Prompt — Make every puppy reachable, and make the litter table readable

## Do this first

1. Read the whole file before changing anything.
2. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
3. **No migration.** Everything below already exists in the database.
4. `npx tsc --noEmit` in both repos when done. Paste the real output.

---

## What is actually wrong

Matt asked for this before and it was built — which is the problem. `LitterPuppyTableRow.tsx` line 81 already renders a link to `/admin/dogs/{id}` labelled **Profile**, and that page already loads documents, media, vaccinations, achievements and health reminders.

**It is 10px uppercase text in a muted gold under the puppy's name. Nobody sees it.**

And the table around it is unusable. On Matt's screen, in a real litter:

- **Status** renders as `sc` — it is `sold`
- **Programme tier** renders as `Elite deve` — it is `Elite developed`
- **Reserved for** renders as `Jacoline Pretoriu` — her surname is cut off
- **Sex** appears blank even though every puppy has one recorded

Nothing is missing from the data. The columns are too narrow and the text is clipped, so the screen reads as empty when it is full.

Verified on the Claire × Santini litter, 10 puppies: every one has 10 weight logs, a vaccination, media, a buyer, a birth weight and a collar colour.

---

## Task 1 — Make the puppy's name the way in

The **name is the link**, not a separate word underneath. Standard, obvious, and how every other list on this platform behaves.

- Puppy name → `/admin/dogs/{id}`, styled as a link, at normal text size.
- Remove the separate `Profile` link. One way in, not two.
- Keep the name editable — but the edit control should be a pencil or an edit mode, not the default state. **Today the name is a text input, which is why it cannot be a link.** Read first, edit on demand.

## Task 2 — Make the table readable

The row has eleven columns and they do not fit. Fix the fit, do not shrink the font.

- Let **Status**, **Programme tier** and **Reserved for** show their full value. If the width is not there, drop the column to a second line under the name rather than truncating.
- **Sex** should show `Male` / `Female`, not an empty-looking select.
- On a narrow screen, **stop using a table**. Switch to one card per puppy — name as a heading, then collar, sex, birth weight, tier, status and buyer as labelled lines. A clipped table is worse than a list.
- Keep the bulk "set tier for selected" action working in both layouts.

**Never truncate a person's name.** `Jacoline Pretoriu` is not a real person and reads as a data error.

## Task 3 — The puppy profile must answer "everything about this dog"

On `/admin/dogs/{id}`, for a dog that belongs to a litter, make sure all of this is present and reachable **without leaving the page**:

- **Identity** — name, collar, sex, colour, date of birth, birth weight, birth order, microchip, registration
- **Litter** — a link back to the litter, plus sire and dam
- **Buyer** — who has it, contact details, and the linked contact record
- **Documents** — the dog's own documents, with upload
- **Weights** — the growth chart that already exists
- **Health** — vaccinations, dewormings, vet visits
- **Media** — photos and video
- **Money** — quote, invoice and payment status for this puppy
- **Contract** — signed or not

If a section has nothing, say so in a line — *"No documents yet"* with an upload button — rather than hiding the section. **A missing section looks like a broken page; an empty one looks like a task.**

## Task 4 — Show what is missing, on the litter page

Matt cannot act on gaps he cannot see. On the litter's puppies tab, mark each puppy that is missing something that matters:

- no microchip
- no colour recorded
- no documents
- no buyer, where status is `sold`

A small amber dot per row with a tooltip listing what is absent. In the Claire × Santini litter today that would flag **5 puppies without a microchip** and **8 without a colour** — all real, all currently invisible.

Add a one-line summary above the table: *"3 of 10 puppies are missing a microchip number."*

## Task 5 — App parity

Same on the app: the puppy name opens the profile, the profile carries the same sections, and the missing-data flags appear. Cards throughout — it is a phone.

---

## Do not

- Do not change any puppy data. This is display and navigation only.
- Do not remove the inline editing on the litter table — Matt uses it to capture a whole litter quickly. Make it deliberate rather than default.
- Do not hide sections on the profile because they are empty. Show them empty with the action that fills them.
- Do not add a migration.

---

## Report

1. Screenshot of the litter puppies tab, full width, with **Status, Programme tier and Reserved for fully legible** and no truncated names.
2. Screenshot of the same tab on a phone width, as cards.
3. Screenshot of a puppy profile reached by clicking the name, showing all nine sections including empty ones.
4. Screenshot of the missing-data flags, with the summary line above the table.
5. Confirmation the bulk tier action still works in both layouts.
6. `npx tsc --noEmit` clean in both repos.

**Use the Claire × Santini litter for every screenshot** — litter id `11111111-1111-4111-8111-111111111001`. It is real, it has 10 puppies, and it has the exact gaps this is meant to surface.
