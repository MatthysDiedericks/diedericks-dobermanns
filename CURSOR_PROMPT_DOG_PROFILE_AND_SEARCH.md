# Cursor Prompt — The dog profile, the lineage navigator, and search that thinks

**This replaces `CURSOR_PROMPT_PUPPY_PROFILE_ACCESS.md`.** Do not run that one.

## Do this first

1. Read the whole file before changing anything.
2. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`. Everything below ships on both.
3. Migration number: `0180` is reserved by `CURSOR_PROMPT_CHANGE_APPLICATION_TIER.md`, so this is **0181**.
4. Do not apply the migration. Matt applies it.
5. `npx tsc --noEmit` in both repos when done. Paste the real output.

---

## This is too big for one pass. Ship it in three.

**Stop and report after each stage. Do not start the next until Matt says go.**

| Stage | Tasks | Why it stops there |
|---|---|---|
| **A** | Task 0 + Task 4 | The search work is one job — consolidate and make it intelligent in a single move, not twice |
| **B** | Task 2 | The lineage strip, replacing the two components it supersedes |
| **C** | Task 1 + Task 3 + Task 5 | Migration, profile layout, missing-data flags |

**Stage A and Task 4 are the same job.** Do not build a simple shared matcher in Task 0 and then rewrite it in Task 4 — **build the intelligent matcher once, as the shared one.** Task 0 describes where it plugs in; Task 4 describes what it does.

Anything half-finished at the end of a stage is worse than not started. Report, then wait.

---

## The problem

Matt's dog admin today is a list with a name search and three dropdowns. The dog page behind it is thin. DogBreederPro, which he is trying to leave, is richer — and the comparison is fair.

But DogBreederPro's answer is eleven tabs down the left: Overview, Genealogy, Shows, Breeding, Health, Notes, Contracts, Documents, Gallery, Events, Finances. **That is a filing cabinet, not a design.** Understanding one puppy takes eleven clicks, and at no point can you see the dog and its family at the same time.

**We are not copying that. We are beating it.**

The insight to build around: *a dog is not a record, it is a position in a family.* Every screen should answer "where does this dog sit" without being asked.

---

## Task 0 — Delete the duplication first. Do this before anything else.

**There are eleven separate implementations of "search for a dog" in this codebase.**

| Website | App |
|---|---|
| `components/admin/DogsTable.tsx` | `components/dogs/DogsDirectoryScreen.tsx` |
| `components/admin/DogPicker.tsx` | `components/forms/DogSelectField.tsx` |
| `components/breeding/DogSelect.tsx` | `components/forms/BreedingSelectField.tsx` |
| `components/admin/UnallocatedDogsTable.tsx` | `components/forms/DogGroupPickerField.tsx` |
| `components/admin/DogPedigreeEditor.tsx` | `components/finance/DogLinePicker.tsx` |
| `components/admin/DogLitterParentage.tsx` | |

Each filters dogs its own way. **`DogPicker.tsx` already matches on colour and sex — type "black" or "female" and it works** — while the main dogs list, the one Matt uses every day, matches names only. The good idea is trapped inside a dropdown.

**And the lineage work already exists, six times over:** `DogSiblingsSection`, `DogProgenySection`, `PedigreeChart`, `DogAncestorAnalysis`, `BehindThisDog`, `InheritedPedigreeSection`.

**Before building anything new:**

**0a.** Write one shared matcher — `lib/dogs/search.ts` on the website, the same module in the app. It takes the dogs and a query string and returns matches with the reason they matched. Every one of the eleven call sites uses it. **No component filters dogs itself after this.**

**0b.** Write one shared `DogSearchField` for the input, so the placeholder, debounce, keyboard handling and empty state are identical everywhere.

**0c.** Keep every existing behaviour. `DogPicker`'s colour and sex matching becomes the baseline for all of them, not a casualty of the merge. List what each call site could do before, and confirm it still can.

### 0d. Scoping is not matching. Getting this wrong corrupts data.

**The single biggest risk in this task.** Some of those eleven call sites do two different things at once:

- **Matching** — "which of these dogs does the typed text describe?" That is what the shared module does.
- **Scoping** — "which dogs is this control even allowed to offer?" A sire picker must offer **males only**. A dam picker, **females only**. A litter parent picker may exclude the dog's own descendants.

**Scoping stays with the call site and is applied before the matcher ever sees the list.** The shared module takes the candidates it is given; it never decides who is eligible.

Flatten the two and a sire picker starts offering females. Someone will select one, and you will have a litter recorded with two dams. **Go through each of the eleven and write down, in the report, what each one scopes to.** If a call site currently has no scope, say so — that may itself be a bug worth raising, but do not fix it here.

**Consolidate first, then extend.** Adding an intelligent search alongside eleven dumb ones makes twelve.

---

## Task 1 — Migration 0181: the handful of fields we lack

Most of what DogBreederPro shows already exists on `dogs` — `coat_type`, `height_cm`, `ear_type`, `eye_colour`, `tattoo_number`, `passport_number`, `dna_number`, `insurance_number`, `registration_type`, `registration_number`, `hip_score`, `elbow_score`, `wrights_coi`, `collar_colour`, `birth_weight_grams`, `is_spayed_neutered`, `location`, `description`, `body_length_cm`, `chest_depth_cm`, `chest_girth_cm`.

Three are missing:

```sql
-- 0181_dog_profile_completeness.sql
-- Fields DogBreederPro shows that we do not hold. Ancestor Loss Coefficient
-- measures how many distinct ancestors a pedigree actually contains — a low
-- ALC means the same dogs appear repeatedly. It sits beside Wright's COI.

alter table public.dogs
  add column if not exists size_category text
    check (size_category is null or size_category in ('small','medium','large','oversize')),
  add column if not exists alc_5  numeric(5,2),
  add column if not exists alc_10 numeric(5,2);

comment on column public.dogs.alc_5  is 'Ancestor Loss Coefficient over 5 generations, percent.';
comment on column public.dogs.alc_10 is 'Ancestor Loss Coefficient over 10 generations, percent.';

notify pgrst, 'reload schema';
```

**Do not add a litter number column.** `litters.litter_letter` already holds it — read it through the relationship.

**Do not add a progeny count column.** Count `dogs` where `father_id` or `mother_id` is this dog. A stored count goes stale the day a litter is born.

**About `alc_5` and `alc_10`:** nothing in this system computes them, so they will sit null until someone fills them. That is deliberate — DogBreederPro holds the figures and they will be imported later. **Show them only when they have a value**; do not render "ALC 5 — " on 173 dogs. This is the one exception to the show-empty-fields rule, because an empty field means "go and get it" and here there is nothing for Matt to go and get.

**Performance:** there are 173 dogs today and perhaps 314 after the DogBreederPro import. **Filter in the browser.** Do not build server-side search, indexes, or a search service for a list this size — it would be slower to use and far more to maintain.

---

## Task 2 — The lineage strip

**The centrepiece — and it REPLACES existing components, it does not join them.**

`DogSiblingsSection.tsx` and `DogProgenySection.tsx` already exist and do part of this job as separate stacked blocks. **Fold both into the strip and delete them.** If you finish this task and the codebase has a lineage strip *and* a siblings section *and* a progeny section, you have made the problem worse.

`PedigreeChart`, `DogAncestorAnalysis`, `BehindThisDog` and `InheritedPedigreeSection` stay — they are the deep pedigree view, a different job from the strip. But the strip's parent boxes must link into `PedigreeChart` rather than duplicating it.

A band pinned below the dog's name on every dog page, on both platforms. Three rows:

```
  ┌─ SIRE ─────────┐   ┌─ DAM ──────────┐
  │ ▣ Santini      │   │ ▣ Claire       │        ← photo + name, both links
  └────────────────┘   └────────────────┘
                    │
   LITTER · Claire × Santini, 10 Jul 2026, litter J
   ● ● ● ● ● ● ● ● ● ●                            ← littermates as collar dots
       ▲ this one
                    │
   PROGENY · none yet
```

**Parents** — photo thumbnail, call name, clickable. If a parent is not in `dogs` but exists in `pedigree_ancestors`, show the name from there, unlinked, in muted text. Never show a blank box.

**Littermates as collar dots.** One dot per puppy, filled with that puppy's `collar_colour`, ordered by `birth_order`. The current dog's dot is larger with a ring. Hovering shows name, sex and status; clicking navigates. Puppies with no collar get a hollow grey dot. Deceased get a thin diagonal line through them, not hidden.

This is the piece that matters. Matt names puppies by collar — "Puppy 1 (Pink)". A row of coloured dots **is** the litter, readable in half a second, and it works on a phone where a table does not.

**Progeny** — for a breeding dog, its litters as a compact list: dam or sire, date, puppy count, each a link. For a puppy, the line reads "none yet" rather than vanishing.

**The strip never scrolls away on desktop.** Sticky under the header — but **collapse it as the page scrolls**: parent photos drop away, leaving one line with the parents' names, the collar dots, and the progeny count. A permanently expanded band would eat a fifth of the screen on a laptop. Matt can be deep in health records and still click a sibling.

On a phone the strip is **not** sticky — it sits at the top and scrolls away. There is no room for it otherwise.

---

## Task 3 — The profile itself

One scrolling page with jump links, **not tabs**. A person reading about a dog should scroll, not hunt.

**Header** — call name large, then registered name beneath, then a collar swatch, sex symbol, and **age computed live** ("9 weeks 3 days" for a puppy, "3 years 4 months" for an adult). DogBreederPro does this and it is genuinely useful — copy it.

Beside the name: buyer, if sold. `Puppy 1 · Peaches · Josef Kotse` in DogBreederPro packs position, name and owner into the title. Ours should read the same way but with the collar as colour rather than a word.

**Then, in order:**

1. **Photo and gallery** — hero image, the rest as thumbnails
2. **Identity** — date of birth, age, sex, colour, coat type, size, birth weight, birth order, collar
3. **Identifiers** — microchip, tattoo, passport, DNA, insurance, registration number and type, litter letter
4. **Measurements** — height, body length, chest depth, chest girth, plus the growth chart that already exists
5. **Health** — hips, elbows, eyes, DCM1–5, vWD, vaccinations, dewormings, vet visits
6. **Breeding** — Wright's COI, ALC 5 / ALC 10, spayed, breeding dog, progeny count
7. **Documents** — with upload
8. **Ownership** — buyer, contract status, quote, invoice, payment
9. **Notes and achievements**

**Every empty field shows a dash and stays visible.** DogBreederPro shows `Chip Number —` and that is right: it tells Matt what to go and get. Hiding empties makes the page look complete when it is not.

**Show a completeness bar** at the top of Identity: *"14 of 22 fields recorded"*, with a link that scrolls to the first gap. That turns the profile into a task list.

---

## Task 4 — Search that understands what was typed

Replace the name box and three dropdowns with **one field** that reads the input and decides:

| What Matt types | What it does |
|---|---|
| 9 or more digits, no spaces | microchip lookup — exact, and also match on a **trailing fragment**, because Matt reads the last digits off a scanner |
| a 4-digit year, 1990–2030 | every dog born that year |
| a dam's name | **her offspring**, grouped by litter |
| a sire's name | **his offspring**, grouped by litter |
| a litter name or letter | that litter's puppies |
| a buyer's name | dogs that person owns |
| anything else | dog name and registered name, fuzzy |

Results are **grouped by why they matched**, with a heading that says so:

```
DAM · Claire — 34 offspring across 4 litters
   Claire × Santini, Jul 2026 · 10 puppies   ● ● ● ● ● ● ● ● ● ●
   Claire × Hunter-King, Dec 2025 · 11       ● ● ● ● ● ● ● ● ● ● ●
   …

DOGS NAMED "CLAIRE"
   Claire · dam · kept
```

The collar dots appear in search results too. One glance shows the shape of a litter.

**Keep the three filters** — category, status, programme tier — as a "refine" row beneath, for browsing rather than finding. Search is for when he knows what he wants; filters are for when he does not.

**Never return a bare empty state.** No match should say *"Nothing matches 'xyz'. Searching names, microchips, litters, sires, dams, owners and birth years."* so he learns what the box can do.

---

## Task 5 — Surface what is missing

On the dogs list and on each litter, flag gaps that matter: no microchip, no colour, no documents, no buyer where status is `sold`.

A small amber dot with a tooltip listing what is absent, and a one-line summary above the list. In the Claire × Santini litter today that is **5 puppies with no microchip** and **8 with no colour** — all real, all currently invisible.

---

## Do not

- Do not build tabs on the dog profile. One page, jump links.
- Do not hide empty fields.
- Do not store a progeny count or litter number — derive both.
- Do not change any dog data. This is schema, display and search only.
- Do not drop the existing inline editing on the litter puppies table — Matt captures a whole litter with it.
- Do not truncate a person's name anywhere. `Jacoline Pretoriu` is not a real person.
- **Do not add a twelfth dog search.** If Task 0 is not finished, stop and report rather than building the new search alongside the old ones.
- Do not lose a capability in the merge. `DogPicker`'s colour and sex matching must survive and spread, not disappear.

---

## Report

**Report at the end of each stage, then stop.**

**Stage A — search**

1. The shared matcher's path, and the import line from all eleven call sites.
2. A count: how many places still filter dogs with their own `.filter()` — must be **zero**.
3. **The scoping table from 0d** — each of the eleven call sites and what it scopes to. This is the one that prevents a male being offered as a dam.
4. Search screenshots for each of: a full microchip, the **last 6 digits** of a microchip, `2026`, `Claire`, `Josef Kotse`. Show the grouped headings.
5. `npx tsc --noEmit` clean in both repos.

**Stage B — lineage strip**

6. Screenshot on **Puppy 1 (Pink)** of Claire × Santini — parents linked, ten collar dots with hers ringed, progeny reading "none yet".
7. Screenshot proving a sibling dot navigates, and the collapsed state after scrolling to Health.
8. Confirmation `DogSiblingsSection.tsx` and `DogProgenySection.tsx` are **deleted**, not orphaned.
9. The same on the app.

**Stage C — profile, migration, flags**

10. `0181` in both migration folders, byte-identical. Show the diff.
11. Screenshot of the completeness bar, and of the missing-data flags with the summary line.
12. The full profile with all nine sections, including empty ones.
13. `npx tsc --noEmit` clean in both repos.

**Use the Claire × Santini litter throughout** — id `11111111-1111-4111-8111-111111111001`. Ten real puppies, real collars, real buyers, and exactly the gaps this is built to expose.

**One last check before you report done:** open a dog, and without clicking anything, answer aloud — who are its parents, who are its littermates, what has it produced. If the screen cannot tell you, the strip is wrong.
