# CURSOR PROMPT — Deceased dogs are showing on the working screens

The Heat Cycles screen lists **Cait, Celsea and Cuba** as *"No season recorded yet"*. All three are
dead. They will sit there looking permanently overdue, and a screen you learn to ignore is a screen
that stops working.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## The cause

`src/lib/dogs/status.ts` line 9:

```ts
export const KENNEL_STOCK_FILTER =
  "category.eq.breeding_stock,status.eq.breeding_stock,status.eq.stud,status.eq.keep";
```

It is passed to `.or()`, so a dog matches if **any** clause is true. These four have
`status = 'deceased'` but `category = 'breeding_stock'`, so the first clause pulls them straight
back in:

```
Cait     female  deceased  breeding_stock
Celsea   female  deceased  breeding_stock
Cuba     female  deceased  breeding_stock
Chester  male    deceased  breeding_stock
```

`category` records **what the dog is**. `status` records **where the dog is now**. The filter treats
them as interchangeable, and they are not.

## This is not only the heats screen

`KENNEL_STOCK_FILTER` is shared. Confirmed callers:

```
src/lib/heats/queries.ts:29     fetchBreedingFemales
src/lib/health/queries.ts:39
```

**Search for every caller and check each one** — the health screen almost certainly lists the same
dead dogs as having health tasks outstanding. Paste what you find.

## The fix

Exclude deceased dogs at the source, so no caller has to remember:

- Add `.neq("status", "deceased")` alongside the `.or(KENNEL_STOCK_FILTER)` in every caller, **or**
  better, export a helper that applies both together and use it everywhere. One place to change.
- Also exclude on `deceased_at is not null` — the column exists and is currently null on all four,
  but it is the more precise signal and should be honoured if it is ever populated.
- **Do not delete or re-categorise the dogs.** Cait, Celsea and Cuba are ancestors in live pedigrees;
  Cuba is Claire's dam. Their records must stay exactly as they are. This is a display filter only.

## Where they should still appear

Be careful not to over-apply this. Deceased dogs must continue to show in:

- pedigrees and lineage trees
- litter history and "dam of" listings
- the dogs list when a "show deceased" or "all" filter is chosen
- anything historical or financial

The rule is narrow: **screens about what to do next** — heats, health tasks, breeding planner,
follow-ups — should not list a dog that has died. Screens about the past must not lose her.

## The app

Same filter, same problem if it exists there. `lib/dogs/` and the breeding screens are the places to
look. If the app already excludes deceased dogs, say so explicitly rather than assuming.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on
this filesystem.**

## Rules

- Display filter only. No dog record is deleted, re-categorised or edited.
- Deceased dogs stay visible in pedigree, lineage and litter history.
- One shared helper, not a `.neq` scattered across call sites.
- No file over 300 lines.

## Verify — paste output, not descriptions

- [ ] `/admin/heats` lists **7 females** — Cendra, Claire, Cleopatra, Cyrus, Hailey, Hannah, Odessa.
      No Cait, Celsea or Cuba. Screenshot.
- [ ] The health screen no longer lists them either. Screenshot before and after.
- [ ] Paste the result — expect 0 rows:
```sql
select d.name from dogs d
where d.status = 'deceased'
  and (d.category = 'breeding_stock' or d.status in ('breeding_stock','stud','keep'));
```
  (That query still returns 4 — it describes the data, not the filter. Instead show the *rendered*
  list and confirm the three names are gone.)
- [ ] **Cuba still appears as Claire's dam** in Claire's pedigree. Screenshot. This is the check that
      proves the filter did not go too far.
- [ ] Cait and Celsea still appear in their litters' history.
- [ ] `grep -rn "KENNEL_STOCK_FILTER" src` — every caller either uses the new helper or has the
      exclusion. List them all.
- [ ] App: same behaviour, or a clear statement that it already excluded them. Say which device.
- [ ] Website: `npm run preflight` passes.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel reaches **Ready** on **`diedericksdobermanns-web-v145`** — the project bound to the live
      domain. The other three are duplicates; ignore them.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
