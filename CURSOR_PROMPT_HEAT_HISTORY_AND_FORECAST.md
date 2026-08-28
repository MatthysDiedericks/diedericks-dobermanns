# CURSOR PROMPT — Heat history, self-correcting forecasts, and a breeding dashboard

Matt needs to see, for every breeding female: **her heat history, when she is next expected in
heat, and a forecast that corrects itself as real dates are entered** — on her own profile and on
one combined dashboard.

Most of the machinery exists. The gaps are real but narrower than they look.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## What already works — do not rebuild it

`heat_cycles` carries `heat_start_date`, `heat_end_date`, `proestrus_start_date`,
`estrus_start_date`, `ovulation_date`, `is_predicted`, `predicted_next_heat_date`,
`actual_cycle_length_days`, `cycle_confirmed_at`, plus mating, pregnancy and whelp fields.

`trg_auto_calculate_heat_dates` already generates a predicted next cycle. Loading Odessa's 14 Jul
heat produced a predicted next heat of 10 Jan 2027 automatically. That works — extend it, do not
replace it.

Components exist: `HeatHistoryList`, `HeatPhaseTimeline`, `PregnancyCard`, `WhelpingWatch`,
`FemaleHeatCard` (web); `HeatHistoryTab`, `HeatPredictionsTab`, `PredictionCard`, `HeatWidget`
(app).

---

## Gap 1 — the forecast never learns from her own history

Predictions use `breed_heat_defaults.avg_cycle_length_days` (180) for every female. But cycle
length is highly individual — a bitch on a firm 6-month cycle and one on 8 months are both
"normal", and a 60-day error is the difference between being ready and missing the season entirely.

**Predict from her own history once there is enough of it:**

- **0 or 1 recorded heats** → breed default (180), labelled *"breed average — no history yet"*
- **2 heats** → the single observed interval, labelled *"based on 1 previous cycle"*
- **3+ heats** → mean of her last 3 intervals, labelled *"based on her last 3 cycles (avg 187 days)"*

Store the interval in `actual_cycle_length_days` on the **new** cycle when it is entered — the gap
from the previous heat's start. That is the fact; everything else is derived from it.

**Always show the basis on screen.** A predicted date with no stated basis gets trusted like a
certainty, and this one drives stud bookings and buyer promises.

Show a confidence range too, not a single day: *"Expected 10–24 Jan 2027"* using the spread of her
own intervals, or `min`/`max_cycle_length_days` from the breed defaults where she has no history.
**A single predicted date is a lie about precision.**

## Gap 2 — entering a real heat must supersede the prediction

When Matt records an actual heat start:

1. If a predicted cycle exists for that female within ±45 days, **replace it** — update that row rather than leaving a ghost prediction beside the real one. Two rows for one season is how a calendar becomes untrustworthy.
2. Set `actual_cycle_length_days` from the previous actual heat.
3. Recalculate her next predicted heat from the updated history.
4. Stamp `cycle_confirmed_at`.

If the real heat lands far from the prediction, **say so rather than hiding it**: *"Came into
season 23 days earlier than forecast — forecast updated."* That is the signal that tells Matt her
cycle is shifting, and it is worth more than a tidy number.

**Never delete a superseded prediction silently** — mark it, or update it in place. Predictions
that vanish make the history look like it was always right.

## Gap 3 — six of eight females have no heat history at all

**Cendra, Claire, Cleopatra, Cyrus, Hailey and Kim have zero recorded cycles.** Odessa and Hannah
were loaded by hand yesterday. So there is nothing to forecast from for three quarters of the
breeding females.

Make backfilling easy or it will not happen:

- **"Add past heat"** on each female's profile — date, optional end date, optional notes, and a "she was mated in this cycle" tick. Fast, few fields, repeatable.
- Accept dates in any order and sort them; Matt will enter them as he finds them in old notes, not chronologically.
- After each save, show the recalculated forecast immediately so the value of entering another one is obvious.
- **Kim was born 23 Sep 2025** — she is under a year old and may not have had a first season. Handle "no cycles yet" as a normal state with an expected first-season window (typically 6–12 months), not as missing data.

---

## Where it must appear

### Each female's profile — both repos

A **Breeding** section: current status, her heat history newest first with intervals between them,
the next expected heat with its basis and range, and — when she is pregnant — the whelp window and
**go-home date**.

**Go-home date is currently stored but never shown.** It is the date buyers ask about most. Put it
on the profile and on the litter page.

### Combined dashboard — both repos

A single **Breeding females** panel, one row per female, sorted by what needs attention soonest:

```
Odessa    Pregnant · due 26 Sep · go home 21 Nov        43 days
Hannah    Pregnant · due 1 Oct · go home 26 Nov         48 days
Cyrus     Next heat expected 10–24 Jan 2027 (no history)
Kim       No season recorded yet · 10 months old
```

- **In heat now** and **pregnant** sort to the top — they are time-critical.
- Anything overdue against forecast is flagged, not hidden. A female 3 weeks past her expected season is either pregnant, unwell, or the record is wrong, and all three need looking at.
- One tap to her profile.
- Website: extend `DashboardWidgets.tsx`. App: extend the existing `HeatWidget.tsx` rather than adding a second widget.

---

## One correction while you are here

`trg_auto_calculate_heat_dates` computes the whelp date from **heat start + 11 days + 63 gestation**
and **ignores the mating date entirely**. Hannah's first mating was 25 Jul, which puts her at
26 Sep, but the trigger returned 1 Oct — five days out, on a date Matt is watching for.

Fix the precedence to prefer the better evidence:

1. `ovulation_date` (from progesterone) → **+63**, window ±3. The accurate one.
2. else the **last** mating → **+63**, window 57–65.
3. else heat start + ovulation offset + gestation. The current behaviour, correct only as a fallback.

**Label which was used**, e.g. *"Due 26 Sep — 63 days from mating (±4). Confirm ovulation by
progesterone to narrow this."* Never recalculate over a date a human has typed by hand without
saying so.

---

## Rules

- Every predicted date shows its basis and a range, never a bare single day.
- Real data always beats a prediction; a superseded prediction is updated, never silently deleted.
- Cycle length comes from her own history where it exists, breed default otherwise.
- Nothing in this feature messages a client.
- No file over 300 lines. `requireAdmin()` on admin pages and actions.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify

- [ ] Entering a second heat for Odessa sets `actual_cycle_length_days` from the interval and updates her next forecast.
- [ ] With 3+ cycles the forecast uses her own average and says so, with the number of days shown.
- [ ] A female with no history shows the breed average, clearly labelled as such.
- [ ] Recording a real heat within 45 days of a prediction replaces that prediction — no duplicate row for one season.
- [ ] A real heat far from forecast shows the difference in plain words.
- [ ] Every forecast displays a range, not one date.
- [ ] Hannah's whelp date recalculates to **26 Sep** from her 25 Jul mating, and the screen says it came from the mating.
- [ ] Setting an ovulation date narrows the window and takes precedence over the mating.
- [ ] Go-home date appears on the female's profile and the litter page.
- [ ] The dashboard lists all 8 breeding females, pregnant and in-heat first, with days remaining.
- [ ] Kim shows "no season recorded yet" with an expected first-season window, not an error.
- [ ] Backfilling three past heats out of order sorts correctly and produces a sensible average.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**.
- [ ] App: `npx tsc --noEmit` exits 0.

### Build the commit, not the working tree

```powershell
git clone --no-hardlinks . ../_buildcheck
cd ../_buildcheck; git checkout <commit you are about to push>
npm ci; npx next build
cd ..; Remove-Item -Recurse -Force _buildcheck
```

- [ ] The clean checkout builds.
- [ ] After pushing, report Vercel status. **Do not request GitHub or Vercel authentication** — Matt reads the dashboard.

## Commit

Migration number: check the folder and take the next free one. Two repos, separate commits.
**Website:** from `diedericksdobermann-web/`. **App:** repo root is the **parent** folder. Push
both, then `git log origin/main -1` in each and confirm it matches `HEAD`.

Do not modify (committing is fine): `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/lib/issues/capture.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
