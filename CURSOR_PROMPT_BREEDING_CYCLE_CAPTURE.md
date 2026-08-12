# CURSOR PROMPT — Breeding cycle capture: matings, pregnancy, whelping

Odessa and Hannah were both mated in late July 2026. **Neither mating is recorded anywhere
as data** — not in this system, and in DogBreederPro only as free text in a notes field.
Both litters are due in about six weeks and the system cannot tell you the sire, the
mating date, or a correct due date for either.

This completes the breeding cycle so the next mating is captured properly.

**Repos:** `diedericksdobermann-web` (primary) and `diedericks-dobermanns` (app — both sides required).
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## What already exists — do not rebuild any of it

The heat system is substantial and working. Read it before writing anything.

**Database:** `heat_cycles` (dog_id, heat_start_date, proestrus/estrus start, heat_end_date,
ovulation_date, mating_date, mating_type, sire_id, expected_whelp_date, whelp_date_earliest/latest,
go_home_earliest/latest, actual_whelp_date, resulting_litter_id, status, progesterone_tests jsonb,
is_predicted, predicted_next_heat_date, actual_cycle_length_days, cancelled_reason) and
`breed_heat_defaults` (cycle length, proestrus/estrus/diestrus days, gestation, ovulation offset,
optimal breeding window).

**Website:** `src/app/admin/(panel)/heats/` (page, `[dogId]`, `actions.ts`, `reference`),
`src/lib/heats/` (calculations, constants, queries, reference),
`src/components/heats/` (AddHeatForm, FemaleHeatCard, HeatCycleActions, HeatHistoryList,
HeatMatingForm, HeatPhaseTimeline, ProgesteroneTracker),
`src/components/breeding/RecordMatingForm.tsx`.

**App:** `app/(admin)/heats/` (index, `[dogId]`, reference), `lib/heats/`,
`components/heats/` (AddHeatBottomSheet, FemaleHeatCard, HeatCurrentTab, HeatCycleActionSheets,
HeatHistoryTab, HeatPredictionsTab, HeatStatusBadge, BreedingReferenceContent),
`components/dashboard/HeatWidget.tsx`, `components/dogs/detail/HeatStatusCard.tsx`,
`components/dogs/detail/DogBreedingTab.tsx`, `hooks/useHeatCycles.ts`, `hooks/useHeats.ts`,
`lib/dogs/whelpDates.ts`.

Extend these. Do not create a parallel breeding module.

---

## Migration `0060_breeding_cycle_capture.sql`

Write it in `diedericks-dobermanns/supabase/migrations/` (the app repo holds the migration
history for both).

### 1. `matings` — one row per mating, not one per cycle

`heat_cycles.mating_date` is a single date. Dobermann breedings are normally **two or three
matings 24–48 hours apart**, and `HeatMatingForm` currently overwrites the one date each time
it is used — so recording the second mating destroys the record of the first. DogBreederPro's
note on Odessa literally reads *"First Mating 26/07/2026"*, which tells you there were others
and that nobody had anywhere to put them.

This matters beyond tidiness: when a bitch misses, the first question is which mating she was
covered on relative to ovulation. One overwritten date cannot answer it.

```sql
create table public.matings (
  id                uuid primary key default gen_random_uuid(),
  heat_cycle_id     uuid not null references public.heat_cycles(id) on delete cascade,
  sire_id           uuid references public.dogs(id) on delete set null,
  external_sire_name text,           -- outside stud not in our dogs table
  mated_at          timestamptz not null,
  mating_type       text not null default 'natural'
                      check (mating_type in ('natural','ai_fresh','ai_chilled','ai_frozen')),
  tie_minutes       integer check (tie_minutes is null or (tie_minutes >= 0 and tie_minutes <= 180)),
  successful        boolean,          -- null = not yet assessed
  notes             text,
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- A mating with neither an internal nor an external sire is a record of nothing.
  constraint matings_sire_required check (sire_id is not null or external_sire_name is not null)
);
create index matings_heat_cycle_id_idx on public.matings(heat_cycle_id, mated_at);
create index matings_sire_id_idx on public.matings(sire_id) where sire_id is not null;
```

**Keep `heat_cycles.mating_date` and `sire_id` in sync** with the *first* mating in the cycle,
via a trigger on insert/update/delete of `matings`. Every existing screen, query and the litter
pages read those columns; silently orphaning them would break the app in a dozen places you
will not find by hand. The columns become derived, not authoritative — comment that clearly.

### 2. Pregnancy outcome on `heat_cycles`

`status` currently mixes cycle stage and outcome, so a bitch who resorbed at day 50 is
indistinguishable from one who never took. Conception rate per sire is the number that decides
whether a stud stays in the programme, and right now it cannot be calculated.

```sql
alter table public.heat_cycles
  add column if not exists pregnancy_status text
    check (pregnancy_status is null or pregnancy_status in (
      'not_yet_known','not_pregnant','pregnant','false_pregnancy',
      'loss_early','loss_late','loss_unspecified')),
  add column if not exists pregnancy_confirmed_date date,
  add column if not exists pregnancy_confirmed_method text
    check (pregnancy_confirmed_method is null or pregnancy_confirmed_method in
      ('ultrasound','relaxin','palpation','x_ray','observed')),
  add column if not exists pregnancy_notes text;
```

`loss_early` is before day 45, `loss_late` after — put that in a column comment, because the
distinction is clinically meaningful and nobody will remember it in a year. Do **not** collapse
these into a boolean.

### 3. `whelping_temperatures`

The rectal temperature drop below roughly **37.2 °C predicts whelping within 24 hours**. It is
the single most useful thing a breeder tracks in the last week, it is taken two or three times
a day, and there is nowhere in this system to put it.

```sql
create table public.whelping_temperatures (
  id            uuid primary key default gen_random_uuid(),
  heat_cycle_id uuid not null references public.heat_cycles(id) on delete cascade,
  taken_at      timestamptz not null,
  temp_c        numeric(4,1) not null check (temp_c >= 33 and temp_c <= 43),
  notes         text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);
create index whelping_temperatures_cycle_idx on public.whelping_temperatures(heat_cycle_id, taken_at);
```

Store Celsius only. A unit column invites someone to log 101.5 as Celsius; converting at the
edge is safer than trusting a dropdown at 4am.

### 4. Progesterone as a table, with units

`heat_cycles.progesterone_tests` is JSONB assuming ng/mL. **South African labs commonly report
nmol/L** (1 ng/mL ≈ 3.18 nmol/L). A 12 nmol/L reading entered into an ng/mL field reads as
"ovulating now" when she is days away — that mistimes the mating and costs a litter.

```sql
create table public.progesterone_tests (
  id            uuid primary key default gen_random_uuid(),
  heat_cycle_id uuid not null references public.heat_cycles(id) on delete cascade,
  tested_at     timestamptz not null,
  value         numeric(8,2) not null check (value >= 0),
  unit          text not null check (unit in ('ng_ml','nmol_l')),
  value_ng_ml   numeric(8,2) generated always as
                  (case when unit = 'ng_ml' then value else round(value / 3.18, 2) end) stored,
  test_phase    text not null default 'ovulation_timing'
                  check (test_phase in ('ovulation_timing','reverse')),
  lab           text,
  notes         text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);
create index progesterone_tests_cycle_idx on public.progesterone_tests(heat_cycle_id, tested_at);
```

`test_phase = 'reverse'` is the late-gestation test used to predict the whelp date — a different
question from ovulation timing, on a different scale, and it must not be plotted on the same axis.

**Back-fill from the JSONB before anything reads the new table**, then leave the JSONB column in
place, unread, with a comment saying it was superseded on 11 Aug 2026. Do not drop it in this
migration — if the back-fill has a bug you will want the original.

### 5. RLS

Match `heat_cycles` exactly: `is_trainer_or_above()` reads, `is_admin()` writes, on all three new
tables. **Clients must not read any of them** — a client seeing another buyer's bitch's
progesterone curve is the same class of leak as the portal dog bug fixed this week. Test it,
do not assume it.

Add all three tables to the `trg_audit` trigger list. Breeding records are the evidentiary
backbone of a pedigree; a changed mating date needs a trail.

---

## Website

### 1. Matings section on `/admin/heats/[dogId]`

Replace the single-mating form with a list plus **Add mating**. Each row: date and time, sire
(dropdown of studs, or free-text for an outside stud), type, tie length, notes.

- Show days from each mating to ovulation where ovulation is known — *"Mating 2 · 1 day after ovulation"*. That is the line that tells you whether the timing was right.
- Deleting a mating asks for confirmation and says what it will do to the derived due date.
- Adding a mating to a cycle in `in_heat` moves it to `mated`.

Keep `RecordMatingForm.tsx` working or fold it in — do not leave two ways to record a mating
that write to different places.

### 2. Pregnancy card

Outcome dropdown, confirmation date, method, notes. Plain-language labels, not the enum values:
*Not yet known · Not pregnant · Pregnant · False pregnancy · Loss before day 45 · Loss after day
45 · Loss (unspecified)*.

Setting **Pregnant** shows the whelp window prominently. Setting any loss or `not_pregnant`
closes the cycle, prompts for a reason, and **must not silently delete the expected litter** —
show what will happen to it and let the user choose.

### 3. Whelping watch

Appears from **7 days before the earliest whelp date**. Temperature entry (date, time, °C) and a
chart with a reference line at 37.2 °C.

When a reading is under 37.2 °C, show a gold alert: *"Temperature dropped to 36.8 °C at 14:20 —
whelping likely within 24 hours."* One reading is not proof; word it as likelihood, and show the
previous three readings alongside so a single duff measurement is visible for what it is.

### 4. Progesterone — rebuild `ProgesteroneTracker.tsx` on the new table

- **Unit selector next to the value field, defaulting to the last unit used for that dog.** Show the converted value under the input as you type: *"12 nmol/L = 3.8 ng/mL"*. Confirming the conversion on screen is what stops the mistake.
- Interpretation against the ng/mL value: <2 baseline · 2–5 approaching · **5–8 LH surge** · 8–12 ovulation, breed in 2 days · >12 past ovulation, breed now.
- Chart the ovulation-timing series. Show reverse tests in a separate list, never on the same chart.
- Setting ovulation from a reading should offer to recalculate the whelp window and say by how many days it moves.

### 5. "In Heat, Not Mated" on the admin dashboard

The alert Matt is asking for. Any cycle in `in_heat` with no mating rows:

> **Odessa** · 28 days in heat · planned sire Santini · expected litter 27 Sep 2026
> Age 8y 5m · 3 litters

Sorted by days-in-heat descending. **Amber past day 21, red past day 28** — a Dobermann standing
in heat that long unmated is either a missed window or an unrecorded mating, and both need
attention today.

### 6. Fix the whelp date calculation

`lib/dogs/whelpDates.ts` returns `mating + 60` as expected. Gestation is **63 days from
ovulation**, and 57–65 from mating only because mating may precede ovulation by days. Use:

- ovulation known → `+63` (window 60–66) — the accurate one, and the reason progesterone testing is worth paying for;
- otherwise **last** mating → `+63` (window 57–65), not the first, and not `+60`;
- otherwise heat start → `+75` (this is what DogBreederPro shows when no mating is captured).

Label which basis was used on screen: *"Due 27 Sep 2026 (63 days from mating — ±4 days. Confirm
ovulation by progesterone to narrow this)."* A date with no stated basis gets trusted more than
it deserves.

Share one implementation between website and app. Two copies will drift and then disagree in
front of a client.

---

## App — `diedericks-dobermanns`

Matt runs the kennel from his phone. Whelping happens at 3am. The app is not optional here.

1. **Matings tab** on `app/(admin)/heats/[dogId]` — list plus an add sheet following `HeatCycleActionSheets` and `AddHeatBottomSheet`. Same fields as web.
2. **Temperature logging — make this the fastest screen in the app.** Big numeric input, time defaulting to now, one tap to save, running list with the drop highlighted. If it takes more than ten seconds at 3am it will not get used, and then the data is worthless.
3. **Pregnancy status** control on the cycle screen.
4. **Progesterone entry** with the same unit selector and live conversion.
5. **`HeatWidget.tsx`** gains the *In heat, not mated* alert with the same 21/28-day thresholds.
6. **Push notification** when a temperature under 37.2 °C is logged, and a daily reminder to take temperatures from 7 days before the earliest whelp date. Reuse the existing Expo push setup; do not add a new notification service.
7. New hooks in `hooks/` — `useMatings.ts`, `useWhelpingTemperatures.ts`, `useProgesterone.ts` — following the `useHeatCycles` loading/error/refresh pattern with pull-to-refresh.

---

## After the migration — capture the live data

Do not do this from a script. Use the UI you just built; it is the real test of whether it works.

**Odessa** (`9537e604-9aa2-456a-9d87-71dc3f093dc1`) — heat started **14 Jul 2026**, first mating
**26 Jul 2026**, planned sire **Santini** (`c54ae0cf-dcba-4d83-a0eb-b6823132b0d1`).

**Hannah** (`a37f2cfc-56df-4ab3-99a8-a41c4eda96c3`) — heat started **19 Jul 2026**, first mating
**25 Jul 2026**, planned sire **Hunter-King** (`930e1c41-807d-4e3a-9e4a-50a18c008acd`).

Ask Matt for the second and third mating dates before entering — the DogBreederPro notes say
"first mating", so there are almost certainly more, and guessing them would be worse than leaving
them out.

Then fix the two expected litters, which are **both currently dated 24 Sep 2026** and match
neither the mating dates nor DogBreederPro:

- `81378dfc-4bbb-4f0f-8ee9-66faf277b2b9` Odessa × Santini → **27 Sep 2026** (26 Jul + 63)
- `e434905e-3769-43fe-9506-ce28e6158dcb` Hannah × Hunter-King → **26 Sep 2026** (25 Jul + 63)

Note that DogBreederPro shows Hannah as 2 Oct — that is heat start + 75, its fallback for an
*unmated* cycle, because her mating only ever existed as a note. Once the mating is captured
properly, 26 Sep is the better estimate. **Tell Matt about this discrepancy rather than quietly
picking one**; he may know something about the mating dates that changes it.

Link each cycle to its litter via `resulting_litter_id`, and set `pregnancy_status` to whatever
Matt confirms — do not assume `pregnant` just because a mating happened.

---

## Rules

- `requireAdmin()` on every website page and server action. The app's admin area is already gated.
- Never `createAdminClient()` outside admin routes.
- No file over 300 lines. `heats/actions.ts` is already large — split it rather than growing it.
- Every date calculation states its basis in the UI.
- Loading, empty and error states on every new screen and form.
- Temperatures in Celsius everywhere. Progesterone stored with its unit, compared in ng/mL.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>` — PowerShell redirection writes UTF-16 and silently corrupts the file.

## Verify

- [ ] Three matings can be recorded on one cycle and all three persist and display in order.
- [ ] Deleting the first mating updates the derived `heat_cycles.mating_date` to the new first, and the due date moves.
- [ ] A progesterone reading entered as nmol/L stores the correct ng/mL and the interpretation matches the converted value, not the raw one.
- [ ] A reverse progesterone test does not appear on the ovulation chart.
- [ ] Logging 36.8 °C raises the whelping-likely alert on both web and app, and sends the push.
- [ ] Marking a cycle `loss_early` closes it without silently deleting the expected litter.
- [ ] Odessa appears in "In Heat, Not Mated" before her mating is captured, and disappears after.
- [ ] A client account can read none of `matings`, `whelping_temperatures`, `progesterone_tests` — verify with a real client JWT, not by reading the policy.
- [ ] A trainer can read but not write them.
- [ ] Editing a mating date produces an `audit_log` row naming the user.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. Build, not just types — a client/server import mistake broke every deployment for six hours this week and `tsc` did not catch it.
- [ ] App: `npx tsc --noEmit` exits 0, and `types/database.types.ts` is roughly its previous size, not double (double means UTF-16).

## Commit

Two repos, two commits.

**Website:** from `diedericksdobermann-web/`, `git add -A`, one commit, `git push origin main`.
**App:** repo root is the **parent** folder, not `diedericks-dobermanns`. Commit and push separately.

**Push both.** Then run `git log origin/main -1` in each and confirm it matches `HEAD` — commits
sat unpushed for a full morning this week and cost the day.

Do not touch `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/lib/issues/capture.ts`,
`src/components/layout/WhatsAppButton.tsx`, or `scripts/import-dbp-contacts.mjs`.
