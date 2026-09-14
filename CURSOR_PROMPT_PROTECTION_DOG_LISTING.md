# CURSOR PROMPT — Protection dog listing, built from a reusable skills library

**Repo:** `diedericksdobermann-web` + mirror into `diedericks-dobermanns` (standing parity rule).
**Supabase:** `nlmwxodvquwbjinhhbmr`. Use the next free migration number — check the highest in
`supabase/migrations/` first.

**Run `CURSOR_PROMPT_ADMIN_DOG_PAGE_CRASH.md` first.** `/admin/dogs/[id]` throws for every dog
right now, and that is where all of this gets filled in.

---

## The point of this build

A protection dog listing lives or dies on detail: what he does, in which situations, how he is
with children, what he still needs. Matt has to be able to load all of that for a dog **in
minutes**, or the listings stay empty and none of it sells anything.

So the admin side is not a form. **It is a builder.** Matt keeps one library of disciplines and
the skills under them; adding a dog means ticking what that dog does and setting a level next to
each. Two consequences, both of which matter more than the page design:

- **Speed.** A new dog is a few minutes of ticking, not an evening of typing. Dog two starts from
  dog one's set and he changes the differences.
- **Consistency.** Every listing describes "Los" or "vehicle approach" in the same words, so a
  buyer comparing two of his dogs is comparing the dogs, not the writing.

Free text stays available for anything not in the library — and when he types something new, the
builder offers to add it to the library so it is a tick next time. The library grows by use.

## What already exists — do not rebuild it

- `dogs.description`, `training_notes`, `temperament_notes` are already selected on
  `src/app/(site)/dogs/[slug]/page.tsx` (line 56) and rendered through `DogTabs`.
- **Direct application already works end to end.** The page renders
  `` <GoldLink href={`/apply?dog_id=${dog.id}`}>Apply for This Dog</GoldLink> `` (line 249),
  `src/app/(site)/apply/page.tsx` reads `dog_id` into `initialDogId`, and
  `src/app/api/apply/route.ts` saves it to `applications.specific_dog_id` (line 242). Nothing to
  build. No application has used it yet only because Zues is the first dog ever marked
  `available`.
- `showJourney = dog.programme_tier === "elite_developed"` (line 106) is the existing precedent
  for a tier-specific section. Follow it exactly for `protection_dog`.

---

## 1. Data model — two tables, not six

### `skill_library` — global, shared by every dog

`id uuid pk`, `discipline text not null`, `label text not null`, `detail text`,
`default_conditions text[] not null default '{}'`, `sort_order int not null default 0`,
`is_active boolean not null default true`, `created_at timestamptz default now()`.

`discipline` is free text, seeded with: `obedience`, `protection`, `tracking`, `environmental`,
`household`, `scenario`. Matt can add more — do not use an enum or a check constraint.

Seed **the disciplines only**, with no skills. Matt fills the library himself; the first dog he
builds populates it. Do not invent commands or scenarios.

### `dog_skills` — what one dog actually does

`id uuid pk`, `dog_id uuid not null references dogs(id) on delete cascade`,
`library_id uuid references skill_library(id) on delete set null`,
`discipline text not null`, `label text not null`, `detail text`,
`conditions text[] not null default '{}'`, `level text` (`'building' | 'solid' | 'proofed'`,
check constraint, nullable — a scenario has no level), `sort_order int not null default 0`,
`is_public boolean not null default true`, `created_at timestamptz default now()`.

`label`, `detail` and `conditions` are **copied** from the library row on tick, not joined. A dog
keeps what was true when it was recorded, and Matt can override the wording for one dog without
changing every other listing. `library_id` is kept only so the builder can show what is already
ticked.

Index both on `(dog_id, sort_order)` / `(discipline, sort_order)`.

**RLS on both:** anon and authenticated **SELECT** on `skill_library` where `is_active`, and on
`dog_skills` where `is_public = true` **and the parent dog is `is_public = true`** — never expose
a skill belonging to a dog the public cannot see. INSERT/UPDATE/DELETE gated on `is_admin()`,
with **both** `USING` and `WITH CHECK` on the update policies.

### Three text columns on `dogs`

`training_exclusions text` (what the sale does not include),
`scenario_exclusions text` (what he has not been worked in),
`temperament jsonb` — `[{ "area": "With children", "body": "…" }]`, six areas by default:
With children, With people, Environment, What he loves, With other dogs, What he needs.

---

## 2. The builder — this is the part to get right

One screen at `/admin/dogs/[id]`, a **Protection Listing** tab, shown only when
`programme_tier === 'protection_dog'`.

**Layout:** disciplines down the left with a count of what is ticked; the skills under the
selected discipline on the right, each a checkbox, its label, and a level selector. Ticking writes
a `dog_skills` row immediately; unticking removes it. A free-text row at the bottom adds something
not in the library, and after saving offers *"Add to library?"* — one click, and it is a tick for
the next dog.

**Non-negotiables, because these are what make it fast:**

- **Autosave.** No Save button anywhere on this tab. Show a quiet saved indicator. Nothing is lost
  by closing the laptop.
- **Copy from another dog.** A picker listing other `protection_dog` dogs; choosing one copies all
  its `dog_skills` and its `temperament` to this dog, which Matt then edits down. This is the
  single biggest time saver in the build — do not skip it.
- **Reorder by drag** within a discipline, and delete inline.
- **Paste a list** as an escape hatch: a textarea that turns one line per row into rows.
- The temperament areas are six plain textareas on the same screen, not a separate tab.

Keep every file under 300 lines. The discipline list, the skill rows and the temperament block are
separate components; the tab composes them.

Add `/admin/settings/skill-library` to manage the library itself — add, rename, reorder, retire a
skill, add a discipline. Retiring a library row must not touch any `dog_skills` already recorded.

---

## 3. The public sections

All on `/dogs/[slug]`, between the existing `DogTabs` block and the pedigree, rendered **only**
when `programme_tier === 'protection_dog'`, and each hidden entirely when its data is empty. A
protection dog with nothing filled in must render a clean page, not empty headings.

1. **His Story** — long-form prose from `dogs.description`, as real paragraphs, not a tab panel.
2. **What his training covered** — grouped by discipline from `dog_skills`, each group showing its
   skills as a short list. Followed by a bordered **"What is not included"** block from
   `training_exclusions`.
3. **Temperament & Behaviour** — the six areas from `dogs.temperament`, two columns of prose,
   deliberately softer than the grid above it.
4. **Scenarios he has been worked in** — `dog_skills` where `discipline = 'scenario'`, as stacked
   rows: title in the left column, detail and condition chips on the right, collapsing to one
   column under 700px. Followed by a bordered **"Not yet worked in"** block from
   `scenario_exclusions`.
5. **Commands he knows** — `dog_skills` where `discipline = 'obedience'` (and any other discipline
   whose rows carry a level), as a table: Command / What he does / Level, with a short key
   explaining the three levels underneath. It scrolls inside its own `overflow-x: auto` container;
   the page body must never scroll sideways.

Level is a coloured text badge, not a card. **Ask Matt before hiding the level column** — he may
decide it should be admin-only. Build it public, behind a single flag.

The four sections must read differently from one another: a grid, then prose, then chip rows, then
a table. Do not render all four as cards.

## 4. Make the apply button unmissable

On a `protection_dog` listing only, add a full-width apply block after the commands section:
heading, one line, the existing `` /apply?dog_id=${dog.id} `` link as the primary button and the
existing enquiry modal beside it. Do not create a second apply route and do not change the form.

---

## Critical warnings

- The public page is unauthenticated. Both anon SELECT policies must be gated on the row's own
  visibility **and** the parent dog's. No `createAdminClient()` in any `(site)` route.
- Do not change `DogTabs`, the pedigree, siblings, or anything shared with non-protection dogs.
- Do not touch `dogs` rows. Zues (`94fb5036-b7ff-4ed0-95c9-3fa8719c2d73`) is deliberately
  `status='available'`, `ownership_status='returned'`, `programme_tier='protection_dog'`.
- Seed the disciplines and nothing else. No example skills, no placeholder story, no test dog.
- Brand: bg `#111008`, gold `#C4A35A`, Cinzel display, Lato body.

## Verify — in a browser

- [ ] Ticking a skill in the builder saves with no Save button, and survives a page reload.
- [ ] Typing a skill not in the library records it on the dog and offers to add it to the library;
      accepting makes it a tick for the next dog.
- [ ] "Copy from another dog" brings across skills and temperament, and editing the copy does not
      change the dog it came from.
- [ ] Retiring a library skill leaves every dog that already has it unchanged.
- [ ] `/dogs/[slug]` for Zues shows nothing new while his data is empty — no empty headings.
- [ ] After ticking one scenario and two commands and writing one temperament area, exactly those
      appear and nothing else.
- [ ] An elite-developed dog and a standard puppy listing are visually unchanged.
- [ ] A `dog_skills` row with `is_public = false` does not appear publicly.
- [ ] Signed out, the skills of a non-public dog cannot be read — check the network response, not
      just the absence of a section.
- [ ] Scenario chips wrap and rows collapse to one column on a phone; the commands table scrolls
      without the page scrolling sideways.
- [ ] "Apply for Zues" still preselects the dog and a submitted application has `specific_dog_id`.
- [ ] `npx tsc --noEmit` exits 0; `npx next build` succeeds.

## Commit and push

Commit **both** repos and push both. Confirm `git rev-list --left-right --count origin/main...HEAD`
reads `0 0` in each.
