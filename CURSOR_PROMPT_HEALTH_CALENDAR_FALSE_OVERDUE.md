# CURSOR PROMPT — The health calendar is calling done treatments overdue

Josef opens his portal and sees his puppy is **overdue on two dewormings**. Both were given. His
dashboard says **Health due: 4**. The treatments happened, were recorded, and are correct in the
database.

**166 of 215 past-due items in the system are false — 77%.** Only 49 are genuine.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## The bug

Puppy 1 (Pink), Josef Kotse's puppy — the actual data:

```
treatment_date  product   next_due_date
2026-07-24      Antizol   2026-08-07     ← calendar says "Overdue 2026-08-07"
2026-08-07      Antizol   2026-08-20     ← calendar says "Overdue 2026-08-20"
2026-08-20      Antizol   2026-09-03
```

The 7 August dose **was given** — there is a row for it. The 20 August dose **was given** — there is
a row for it. The calendar is reading **every** `next_due_date` in the past and calling each one
overdue, including the ones a later treatment already satisfied.

**A due date is satisfied when a later treatment of the same kind exists for that dog.** Only the
most recent record in each group should produce a due date at all.

Applies to `deworming_records` (group by `treatment_type`) and `vaccinations` (group by
`vaccine_name`). The logic lives in `src/lib/dogs/healthCalendar.ts` and whatever feeds
`fetchHealthSchedule` on the portal home.

**This is a display bug. Do not change the data — it is correct.** Every treatment row and every
`next_due_date` stays exactly as it is.

## 1 · Only the latest record in a group is due

For each dog, for each group, take the row with the **latest `treatment_date`** and use its
`next_due_date`. Ignore the rest.

- Past due date on the latest row → genuinely **overdue**.
- Future due date on the latest row → **upcoming**.
- Every earlier row → **history**, never a due item.

After the fix, Puppy 1 (Pink) should show **one** deworming item — due 3 September — and **one**
vaccination — due 2 September. Not four.

## 2 · Overdue must stay calm on a client's screen

This was in the original puppy-profile prompt and matters more now that overdue will be rare and real.

- *"Was due 12 August"* in plain text. Not red, not an alert icon, not a badge.
- The buyer may well have had it done by their own vet and not told Matt. Shouting at a paying client about their own dog's health is the wrong tone, and it is often wrong on the facts too.
- Red is for things that are genuinely wrong, and after this fix there will be far fewer of them.

## 3 · The dashboard count must match

`Health due: 4` on Josef's dashboard comes from the same faulty source. One count, one function —
**do not compute it separately from the list**, or they will drift again.

## 4 · Cover it with a test

`src/lib/dogs/healthCalendar.ts` deserves a unit test, using Puppy 1 (Pink)'s exact three rows:

- three dewormings, each with a `next_due_date`, the first two already satisfied
- expect **one** due item, dated 2026-09-03
- add a case with a genuinely missed treatment and expect it **is** returned
- add a dog with a single record and no history

`fieldTiers.test.ts` already sets the precedent for testing this kind of rule.

---

## The app

Same calendar, same bug — the app renders the health schedule from the same shape.

- Same grouping rule. **Share the logic; do not write a second version of it in the app.**
- Same calm wording for overdue.
- Same count on the app dashboard.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**

## Rules

- Do not modify any treatment data. The records are correct.
- One record per group produces a due date: the most recent.
- One function feeds both the list and the count.
- Overdue is stated plainly, never in alarm colours on a client's screen.
- No file over 300 lines.

## Verify — paste output, not descriptions

- [ ] Josef's portal shows **one** deworming due (3 Sep) and **one** vaccination due (2 Sep) for Puppy 1 (Pink). Screenshot.
- [ ] His dashboard **Health due** count matches that list exactly.
- [ ] Run this and paste the result — expect **49**, not 215:
```sql
with due as (
  select 'deworming' k, dog_id, next_due_date, treatment_date, treatment_type g
    from deworming_records where next_due_date is not null
  union all
  select 'vaccination', dog_id, next_due_date, date_administered, vaccine_name
    from vaccinations where next_due_date is not null)
select count(*) from due
 where next_due_date < current_date
   and not exists (select 1 from due d2 where d2.dog_id=due.dog_id and d2.k=due.k
                     and d2.g=due.g and d2.treatment_date >= due.next_due_date);
```
- [ ] A dog with a **genuinely** missed treatment still shows as overdue. Name the dog.
- [ ] Overdue renders in plain text, not red. Screenshot.
- [ ] The unit test covers Puppy 1 (Pink)'s three rows and passes. Paste the run.
- [ ] Treatment data unchanged: `select count(*) from deworming_records` and `from vaccinations` before and after — expect **174** and **109**.
- [ ] App: same list, same count. Say which device.
- [ ] Website: `npm run preflight` passes.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel reaches **Ready** — paste the deployment id.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: the grouping fix and its test, the dashboard count, the
overdue wording, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
