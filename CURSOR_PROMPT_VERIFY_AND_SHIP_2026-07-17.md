# CURSOR PROMPT — Verify, Typecheck, Commit & Push (2026-07-17 batch)
*Run in Cursor Agent mode. This batch was already written by Claude directly on disk — your job is to verify it, not rebuild it.*

---

## Context

**Project:** Diedericks Dobermanns mobile app
**Stack:** React Native, Expo SDK 56, TypeScript strict, Supabase
**Supabase project:** `nlmwxodvquwbjinhhbmr`

All code below was already written and saved to disk by Claude in this session. Nothing needs to
be built from scratch. Your job is: verify it compiles, fix only genuine TypeScript errors without
changing intended behaviour, then commit and push.

---

## Files changed or created this session

**Dogs / Kennel / Puppies (bug fixes):**
- `hooks/useDogs.ts` — public dog listings now exclude sold/deceased/retired/donated/gifted by default (new `includeInactive` option)
- `app/(public)/puppies/index.tsx` — rebuilt to show on-hand puppies + an Expected Litters section (due dates, spots open)

**Sign-up email confirmation (bug fix):**
- `lib/auth.ts` — `signUp()` now passes `emailRedirectTo: 'diedericksdobermanns://verify-email'`
- `lib/auth/deepLink.ts` — deep-link allow-list now includes `verify-email` / `auth/verify-email`
- `app/(public)/verify-email.tsx` — new screen, lands the confirmation link, sets the session, hands off to `/login`

**Home screen branding:**
- `app/(public)/index.tsx` — hero now shows the real crest logo (`assets/logo-full.png`) instead of a stock photo
- `assets/logo-full.png` — new asset

**Application form (Steps 1, 2, 4):**
- `constants/regions.ts` — new file, SA provinces + country list
- `components/forms/SelectField.tsx` — new reusable dropdown component (modal-based, no new dependency)
- `components/forms/ApplicationForm/Step1Personal.tsx` — country + province are now dropdowns (South Africa default, SA provinces list when South Africa is selected)
- `components/forms/ApplicationForm/ChildrenField.tsx` — new tick-box component (age bracket + headcount), replaces free-text children field
- `components/forms/ApplicationForm/Step2Lifestyle.tsx` — now uses `ChildrenField`
- `components/forms/ApplicationForm/Step4Preferences.tsx` — colour options are now exactly Black & Tan, Brown & Tan, and No preference
- `components/forms/ApplicationForm/AgreementBox.tsx` — minor tweak, don't render an empty description line
- `components/forms/ApplicationForm/index.tsx` — new safety-reminder popup shown before advancing past Step 2 if the applicant indicated children in the household

---

## Task 1 — Typecheck

```
npm run typecheck
```

Fix any errors that come up. Do not change component behaviour, prop names, or the visual design
described above while fixing — these were reviewed carefully against the existing schema, labels,
and RLS policies before being written. If an error looks like it requires a behavioural change
(not just a type fix), stop and flag it instead of guessing.

## Task 2 — Sanity-check the application form specifically

Open `components/forms/ApplicationForm/index.tsx` and confirm:
- Step 1 renders a Country dropdown defaulting to "South Africa", and a Province dropdown that
  only appears when country is South Africa
- Step 2 renders the children tick boxes, and ticking one and pressing Continue shows the
  safety-reminder popup before advancing
- Step 4 shows exactly 3 colour options: Black & Tan, Brown & Tan, No preference

## Task 3 — Investigate the submit bug (if you can reproduce it)

Matt reported that submitting the application form "does not submit and go back to main page."
The reference-number flow (`useSubmitApplication` in `hooks/useApplications.ts`, and
`ApplySuccessView.tsx`) was already built correctly in a prior session and looks structurally
sound — RLS on `applications` allows anonymous inserts, and every field the form writes matches
a real column. If you can run the app and reproduce the failure, capture the exact error text
shown under the Submit button and report it back rather than guessing at a fix.

## Task 4 — Commit and push

```
git add -A
git commit -m "Fix dogs/kennel/puppies filtering, email confirmation redirect, home hero logo, application form dropdowns/children tickboxes/colour options/safety popup"
git push
```

---

## Testing Checklist

- [ ] `npm run typecheck` passes with no errors
- [ ] Application form Step 1–4 render and behave as described above
- [ ] No file exceeds 300 lines
- [ ] Commit pushed to the correct branch

---

## Critical Rules

- Do NOT re-run any Supabase migration — none are needed for this batch
- Do NOT expose the service role key in client code
- Do NOT change the `children_ages` column or its type — the tick-box UI composes into the
  existing text column, no DB change needed
- If typecheck reveals something Claude's edits genuinely got wrong, fix it minimally and note
  what you changed and why
