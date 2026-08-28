# CURSOR PROMPT — The app is four features behind. Catch it up, and prove it.

**Read this first.** In your last summary you ticked three items as done:

```
✓ App whelping log is the fast path (already shipped)
✓ App ID check flags, does not block (already shipped)
✓ App consent on apply + profile (already shipped)
```

**None of them is built.** I checked `diedericks-dobermanns` — `whelping_temperatures`, `id_number`,
`marketing_opt_in` and `elite-developed` appear in **no file** under `lib`, `components`, `app` or
`hooks`. Not one reference.

Do not tick a verify item you have not run. **Every claim in this task must be backed by command
output pasted into your reply.**

**Repo:** `diedericks-dobermanns` (repo root is the **parent** folder).
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`.

---

## Before you write any code

Run this and paste the output:

```bash
cd diedericks-dobermanns
for t in whelping_temperatures id_number marketing_opt_in elite-developed; do
  echo "== $t"; grep -rl "$t" lib components app hooks 2>/dev/null || echo "   MISSING"
done
```

**No migrations are needed.** Every table and column already exists on the live database:
`whelping_temperatures`, `applications.id_type` and `id_check_status`, and
`contacts.marketing_opt_in` / `marketing_opt_in_at` / `marketing_opt_in_source`. This is app screens
only. Regenerate `types/database.types.ts` with `Set-Content -Encoding utf8` before you start.

---

## 1 · Whelping temperatures — build this first, it has a deadline

**Hannah is due 26 September and Odessa 27 September.** Both are confirmed pregnant. This screen
must exist and be usable before then.

A rectal temperature drop below **37.2 °C** predicts whelping within about 24 hours. Readings are
taken two or three times a day, and the ones that matter happen at 3am, one-handed, in a kennel.

On the heat-cycle screen for a pregnant female:

- **Large numeric input**, time defaulting to now, **one tap to save**. If it takes more than ten seconds it will not be used, and then the data is worthless.
- Running list, newest first, with any reading under 37.2 °C highlighted in gold.
- When a low reading is saved: *"Temperature dropped to 36.8 °C at 02:14 — whelping likely within 24 hours."* **Show the previous three readings alongside it**, so one bad measurement is visible for what it is rather than triggering a false alarm.
- Celsius only. The table constrains 33–43 °C; surface that as a friendly message, not a database error.
- Reuse the existing push-notification setup for the alert. Do not add a second notification path.

The website equivalent is `WhelpingWatch.tsx` — match its behaviour, do not invent a second one.

## 2 · ID number validation

Applications are reviewed in the app, but the format check exists only on the website.

Same rules: South African ID is **13 digits with a valid Luhn check digit** and a real embedded date
of birth; Namibia 11 digits; passport 6–12 alphanumeric. **Flag, never block** — a genuine buyer
with an unusual document must still be able to submit.

**Share the validation function with the website.** Do not write a second implementation; two copies
of a checksum will drift and then disagree about the same person.

Show the same plain-language result Matt sees on the website: *"ID format checks out"*, or
*"ID failed the format check — 9 digits, expected 13"*, and flag any mismatch between the ID's
embedded date of birth and the one on the form.

## 3 · Marketing consent

`marketing_opt_in` is referenced nowhere in the app. **Any application captured through the app
collects no consent at all** — so the app is quietly building a list that cannot lawfully be
emailed.

Add the consent tickbox to the app's application flow and the portal profile:

- **Never pre-ticked. Never bundled with the terms tickbox.**
- Plain wording: *"Send me news about upcoming litters and training."*
- Writes `marketing_opt_in`, `marketing_opt_in_at` and `marketing_opt_in_source` (the screen it came from).
- Editable at any time from the profile, including withdrawing it.

Campaign composing stays on the website. **Consent capture does not.**

## 4 · The Elite Developed programme page

Live on the website at `/elite-developed`, absent from the app. Add it under Training, reading from
a **shared content module** so the two can never describe the programme differently.

It must include the day-three Puppy Culture opening and the "the dog sets the pace" section — the
website content was corrected after an outdated draft was published, so take the current version.

---

## Then check whether anything else is missing

Do not treat this list as complete. **Diff the last five days of commits across both repos and
report every website feature the app does not have.** I found these four; there may be more.

---

## Rules

- Shared logic is shared: ID validation, consent field names, programme content.
- Flag, never block, on ID validation.
- Consent is never pre-ticked and never bundled.
- Nothing in this task sends a message to a client.
- No file over 300 lines.
- Regenerate types with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste the command output for each

- [ ] The grep above, re-run after the work, showing a real file for all four terms.
- [ ] A whelping temperature can be recorded **in under ten seconds** on a phone. Time it and say how long it took.
- [ ] Saving 36.8 °C highlights it, shows the previous three readings, and fires the push.
- [ ] A reading of 50 °C is refused with a readable message, not a database error.
- [ ] An application with the 9-digit "SA ID" `982927801` is flagged and **still submits**.
- [ ] A valid ID `8306030160082` passes, and changing one digit fails it.
- [ ] The ID validation function is imported from a shared module, not duplicated — name the file.
- [ ] The consent box appears on the app's application flow and portal profile, unticked, and writes all three columns. Show the row.
- [ ] Withdrawing consent from the profile clears it.
- [ ] The Elite Developed page in the app contains "day three" and "Puppy Culture" and matches the website.
- [ ] You have listed any other website features the app is missing.
- [ ] `npx tsc --noEmit` exits 0, and `types/database.types.ts` is roughly its previous size, not double.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD`. **Three times this week work has been correct locally and absent from the remote** — the `src/lib/errors/` modules, migration 0074, and the corrected Elite Developed content. Paste the two hashes.

## Commit

The app repo root is the **parent** folder, not `diedericks-dobermanns`. One commit per feature.
Push, then confirm `origin/main` matches `HEAD`.

Do not modify `scripts/import-dbp-contacts.mjs`.
