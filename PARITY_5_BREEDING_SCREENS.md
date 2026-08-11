# PARITY PROMPT 5 — Breeding screens on the website

**Prerequisite: PARITY_4 must be done first.** Do not start this until
`evaluate_pairing()` exists in SQL and the app has been refactored to call it. Building
these screens against reimplemented TypeScript rules is the mistake this whole plan exists
to prevent.

**Repo:** `diedericksdobermann-web`. **Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, Cinzel headings.

## Read first

- `diedericks-dobermanns/app/(admin)/breeding/index.tsx`, `planner.tsx`,
  `pairing-builder.tsx`, `trial-planner.tsx`, `litter-recorder.tsx`, `organogram.tsx`
- `diedericks-dobermanns/app/(admin)/breeding-stock.tsx`
- `src/components/pedigree/` — the website already renders pedigree charts; reuse them
- `BREEDING_REFERENCE_GUIDE.md`

## Table — already exists

```
pairings(id, sire_id, dam_id, line, generation int, status, priority,
         target_date date, date_bred date, coi_estimate float,
         expected_litter_date date, litter_id, notes,
         trial_generation int, trial_notes, created_at, updated_at)
```

## Screens

| Route | Purpose |
|---|---|
| `admin/(panel)/breeding/page.tsx` | Overview: active pairings by status, upcoming matings, quick links |
| `admin/(panel)/breeding/pairings/page.tsx` | Pairing builder — pick sire + dam, get the verdict, save |
| `admin/(panel)/breeding/planner/page.tsx` | Multi-generation plan across Line A / Line B / Cross |
| `admin/(panel)/breeding/trials/page.tsx` | Trial mating planner (`trial_generation`, `trial_notes`) |
| `admin/(panel)/breeding/organogram/page.tsx` | Visual programme tree |
| `admin/(panel)/breeding/stock/page.tsx` | Breeding stock list with health + line status |
| `admin/(panel)/litters/record/page.tsx` | Litter recorder — turn a bred pairing into a litter |

### Pairing builder — the important one

Selecting a sire and dam calls `evaluate_pairing(sire_id, dam_id)` and shows the result
**before** the pairing can be saved:

- `severity = 'ok'` → gold "Cleared", show COI
- `'caution'` → amber, list every reason, allow save with acknowledgement
- `'prohibited'` → red, list reasons, **Save disabled**

Render `reasons[]` verbatim from the RPC. Do not rewrite the wording in the UI, or the two
platforms will describe the same problem differently.

### Litter recorder

From a pairing with `date_bred` set, create the `litters` row (mother, father, dates,
puppy counts) and set `pairings.litter_id`. Reuse the existing litter form where possible.

## Wiring

- Sidebar: a Breeding section with all of the above.
- Dog admin page: link to that dog's pairings.
- Heats screens already exist in the app only — those come in PARITY_6, but leave hooks for them.

## Rules

- `requireAdmin()` in every server action; return `{ error }`, never throw.
- **All breeding legality comes from `evaluate_pairing()`.** Zero rule logic in TypeScript.
  If you find yourself writing an `if` about lines, COI or prohibited pairs, stop — it belongs
  in the SQL function from PARITY_4.
- Do not use `createAdminClient()`.
- No file over 300 lines — the organogram especially will want splitting into components.
- Loading, empty and populated states everywhere.

## Verify

- [ ] A known-prohibited pair cannot be saved, and shows the reason from the RPC.
- [ ] The same pair gives an identical verdict in the app and on the website.
- [ ] COI shown matches the app.
- [ ] Recording a litter from a pairing links `pairings.litter_id` correctly.
- [ ] `npx tsc --noEmit` exits 0; `npx next build` succeeds.
- [ ] Grep the diff for breeding rule logic in TS — there should be none.

## Commit

From `diedericksdobermann-web/`, `git add -A`, one commit, after confirming
`git ls-files --others --exclude-standard src/` is empty.
