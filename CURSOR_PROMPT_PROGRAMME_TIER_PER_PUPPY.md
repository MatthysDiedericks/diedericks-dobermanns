# CURSOR PROMPT — Programme tier belongs to a puppy, not to a litter

The litter edit screen has a **Default Programme Tier** selector. Matt does not want it. A litter is
not sold at one tier — the 23 May 2025 litter alone went out as **Std, Std, Std, Elite, Std, Elite**.
Setting a litter-wide default invites exactly the wrong assumption, and the puppies grid is where
Matt actually works.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Verified live

| Fact | Value |
|---|---|
| `dogs.programme_tier` | exists — **23 of 173 dogs set** |
| Values in use | `puppy`, `elite_developed`, `protection_dog` |
| `litters.default_programme_tier` | exists — **0 of 30 litters use it. Nothing would be lost.** |
| Puppies grid | `LitterPuppiesTab` → `LitterPuppyTableRow`, already editable inline (collar, name, sex, status, reserved-for) and already links each pup to `/admin/dogs/{id}` |

The column is unused in production. This is a clean removal, not a migration of live data.

---

## 1 · Remove the litter-level selector

- Delete **Default Programme Tier** from the litter edit screen and from the litter create form.
- Stop writing `litters.default_programme_tier` anywhere.
- **Leave the column in the database for now.** Dropping it is a separate, reversible step once the UI has been off it for a release. Do not drop it in this prompt.
- Nothing should read it as a fallback. If a puppy has no tier, it has no tier — do not invent one from the litter.

## 2 · Put the tier on the puppy row

Add **Programme tier** as a column in `LitterPuppyTableRow`, saving the same way the other inline
fields already do.

- Options: **Standard puppy · Elite developed · Family protection dog · (not set)**, mapping to `puppy` / `elite_developed` / `protection_dog` / `null`.
- **Show the human label, store the key.** Matt should never see `elite_developed` on screen.
- `(not set)` is a legitimate, common state — **150 of 173 dogs have no tier.** It must not read as an error or a warning.
- The same selector appears on the dog profile, and both write the same field. Changing it in one place shows in the other.

### A set-many action, because that is the real workflow

Above the grid: **Set tier for selected** — tick several puppies, choose one tier, apply.

Matt sells most of a litter as Standard with one or two Elite. Nine dropdowns one at a time is the
thing that makes him not bother, and then the data stays empty — which is why 150 dogs have no tier
today.

## 3 · Where the tier has to show up

Setting it is pointless if nothing reads it:

- **Puppy profile** — as a plain line, not a badge shouting at the buyer.
- **Litter puppies grid** — visible at a glance so Matt can see the mix.
- **Quote and invoice line items** — the tier is what justifies the price. `quote_items` already has a dog link.
- **Unallocated sales and the dogs list** — filterable by tier.

Do **not** attach a price to the tier in this prompt. Prices are per sale and Matt has not set tier pricing yet.

## 4 · Keep the history honest

`DBP_LITTER_OWNERS_2026-08-22.md` records Std/Elite per puppy for the 2025 litters — the only
historical tier record that exists. Where a dog's tier is already set, **do not overwrite it.**

---

## The app

- Same per-puppy selector in the app's litter puppies list and on the dog profile.
- Same set-many action — it matters more on a phone, where nine dropdowns is genuinely painful.
- Remove the litter default from the app's litter edit screen too, so the two do not disagree.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**

## Rules

- No litter-level tier, no litter-level fallback.
- Column stays in the database this round; UI stops using it.
- Human labels on screen, keys in the database.
- "Not set" is normal and quiet.
- No prices attached to tiers.
- Existing tiers are never overwritten.
- No file over 300 lines. Regenerate types in **both** repos only if the schema changes — it should not.

## Verify — paste output, not descriptions

- [ ] Default Programme Tier is gone from the litter edit and create screens. Screenshot.
- [ ] `select count(*) from litters where default_programme_tier is not null` is still **0**, and nothing writes it. Show the grep.
- [ ] Setting a tier on one Claire × Santini puppy saves and shows on that puppy's profile. Paste the row.
- [ ] Selecting 5 puppies and applying **Standard puppy** sets all 5 in one action. Paste all 5 rows.
- [ ] A puppy with no tier reads "Not set" quietly — no red, no warning icon.
- [ ] The tier appears on the puppy profile, the puppies grid, and a quote line item for that dog.
- [ ] The dogs list filters by tier. Paste the counts — expect **23** dogs with a tier before you change anything.
- [ ] An existing tier is not overwritten by any bulk action that did not select it.
- [ ] App: same selector, same set-many, litter default removed. Say which device.
- [ ] Website: `npm run preflight` passes — that runs the committed-tree import check, `tsc`, and `next build`.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel reaches **Ready** — paste the deployment id.

## Housekeeping — do this in the same run

**A test row reached production tonight.** `__verify_0119_override_` was created in the live Claire ×
Santini litter to verify migration 0119 and appeared in Matt's admin UI. It is gone now, but the
process that made it is not.

**Never write verification rows into live tables.** Wrap every check in
`begin; ... rollback;`, or use a name no human will ever see and delete it in the same statement.
Matt saw that row in his own litter list, next to nine real puppies two weeks from handover.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: removing the litter default, the per-puppy selector, the
set-many action, surfacing the tier, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
