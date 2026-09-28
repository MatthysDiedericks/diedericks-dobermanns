# Cursor Prompt — Progeny totals on a dog, and health records you can add from the dog

## Do this first

1. Read the whole file before changing anything.
2. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
3. **No migration.** Both jobs use tables and columns that already exist.
4. `npx tsc --noEmit` in both repos when done. Paste the real output.

---

## Task 1 — Say how many puppies a dog has produced

Hunter-King's profile lists thirteen progeny groups and makes you add them up in your head. The
number Matt wants is the headline, and it is a genuinely impressive one:

| | |
|---|---|
| **Total progeny** | **92** |
| Recorded litters | 11 |
| Males / females | 45 / 47 |
| Sold | 70 |
| Producing since | May 2021 → Jun 2026 |

Put a summary line directly above the PROGENY list, before the per-litter breakdown:

> **92 puppies · 11 litters · 45 males, 47 females · first May 2021, latest Jun 2026**

**Do this for dams as well as sires**, from `mother_id` and `father_id` respectively. Only show the
block when the count is greater than zero — a dog with no progeny should show nothing rather than
"0 puppies", which reads like a failure.

For reference, the four producing sires today are Hunter-King (92), Dharka (51), Chester (15) and
Santini (10). Use `father_id` / `mother_id` on `dogs`, not the litter table — 12 of Hunter-King's
progeny have a sire recorded but no `litter_id`, and they must still be counted. That is why his
list ends with "Ungrouped · 12 puppies".

**While you are there:** make that "Ungrouped" group an amber flag rather than a plain row, with a
tooltip saying these puppies have no litter recorded. It is a data gap Matt can fix, and right now
it is presented as though it were normal.

## Task 2 — Let Matt record a treatment from the dog he is looking at

Matt was on Hunter-King's profile wanting to record a deworming given on Sunday. He could not,
because **`HealthRecordForm` exists only on the kennel-wide `/admin/health` page**, where you first
have to pick the dog from a list of 184.

That is backwards. The natural moment to record a treatment is while looking at the dog.

Put the same form on the dog profile's **HEALTH** tab, with the dog already chosen and not
changeable. It must cover what `deworming_records` already holds:

| Field | Column | Notes |
|---|---|---|
| Date given | `treatment_date` | defaults to today; Matt often records a day or two late |
| Product | `product_name` | from `health_products`, **free text allowed** — see below |
| Type | `treatment_type` | `deworming`, `tick_flea`, and whatever else is in use |
| Dose | `dosage` | |
| Next due | `next_due_date` | suggest from the product's interval, always editable |
| Given by | `administered_by` | |
| Vet | `vet_practice_id`, `doctor_name` | only when it was done at a practice |
| Notes | `notes` | |

**Product must stay free text with suggestions, not a locked dropdown.** The products already in
use are Quantel, Bravecto, Milpro, NexGard, Mediworm, Univerm Total, Nutribyte, Antizol. A new
product appears the moment the vet changes brand, and a form that refuses it means the treatment
goes unrecorded — which is worse than an untidy list. Offer the known names, accept anything.

**Spelling matters here.** The product is **Quantel**. If someone types a near-match to an existing
product — Quantil, Quantell — offer the existing spelling as a suggestion rather than silently
creating a second product. Two spellings of one dewormer breaks every reminder and every report
built on the product name.

Keep `/admin/health` as it is. It is the right screen for "who is due this month" across the
kennel; this is the other direction.

**Reminders must still fire.** `next_due_date` drives the owner reminder and the health calendar —
check that a record added from the profile appears in `UpcomingHealthList` and `HealthCalendar`
exactly as one added from the kennel page does. If the two paths write different columns, the
reminders will silently stop for one of them.

## Task 3 — App parity

Both on the app: the progeny summary on the dog profile, and health entry from the dog. The website
is the reference implementation.

---

## Do not

- Do not add a migration. `deworming_records` already has every field listed.
- Do not lock the product list to a dropdown.
- Do not count progeny through the litter table alone — it undercounts by 12 on Hunter-King.
- Do not show a progeny block for a dog that has produced nothing.
- Do not create test health records in production.

---

## Report

1. Screenshot of Hunter-King's profile showing **92 puppies · 11 litters · 45 males, 47 females**.
2. Screenshot of a dam's profile showing hers.
3. Screenshot of a dog with no progeny, showing the block absent.
4. Screenshot of adding a deworming from a dog's Health tab.
5. Proof the new record appears in the health calendar and the upcoming list — paste the query.
6. Screenshot of the near-match suggestion when "Quantil" is typed.
7. `npx tsc --noEmit` clean in both repos.
