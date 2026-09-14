# Cursor Prompt — Close the last phone gap: portal signup

## Do this first

1. Read the whole file before changing anything.
2. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
3. **No migration.** `contacts.phone` already exists and the shared validator is already built.
4. `npx tsc --noEmit` in both repos when done. Paste the real output.

---

## What happened, verified on 14 September 2026

The phone requirement shipped and is working. `lib/phone.ts` is correct and strict — no escape hatch, minimum 9 digits, placeholders like `0000000000` and `1234567890` rejected, international accepted. Applications, enquiries, the newsletter form and the admin contact form all enforce it.

**Portal signup does not.**

On Saturday 12 September, Karien Knoetze:

- **18:59** — submitted application `DD-61DCC09D` with her phone number `0829763174`
- **19:01** — created a portal login, and the contact was written **with no phone at all**

Two minutes apart. The system already had her number, asked her again through a different door, and stored nothing. She is one of three contacts created since the requirement shipped, and the only one that leaked.

Her record has since been corrected by hand. **The path that created it has not.**

---

## Task 1 — Require a phone on portal signup

Add the field to the signup form, both platforms, using the **existing shared validator** — `phoneField` from `lib/phone.ts` on the website, and the app's import of the same module.

**Do not write a second validator.** There is exactly one, it is tested, and it is the reason the other four paths are clean.

Same rules as everywhere else: required, minimum 9 digits after stripping, placeholders refused, `+27` / `+264` / `+268` and other international prefixes accepted. Show the error inline, above the submit button, before they scroll.

## Task 2 — Look before you ask

This is the part that matters more than the field.

**Before rendering the phone input, check whether you already have their number.** Match on the email they are signing up with, in this order:

1. `applications.phone` — most recent non-archived application with that email
2. `contacts.phone` — an existing non-merged contact with that email

If a number is found:

- **Do not ask for it again.** Pre-fill it and show it read-only with a short line: *"We have this number from your application. Not right? [Change]"*
- Carry it onto the contact record that signup creates.

If nothing is found, ask — required, as Task 1.

Someone who has already typed their number into a six-step application should never be asked for it a second time. Asking twice and then losing it is worse than not asking at all.

## Task 3 — Do not create a second contact

While you are in this path, check what signup does when a contact already exists for that email.

Karien now has one contact with `source = 'app_signup'`, created **after** her application. If signup creates a fresh contact rather than linking to the one the application made, you have a duplicate-contact problem sitting underneath the phone problem.

- If a non-merged contact already exists for that email, **link the new login to it** — set `user_id` on the existing contact. Do not insert another row.
- If signup is already doing this, say so and change nothing.

Report which of the two you found. This is the more important finding of the three.

## Task 4 — Prove the rule holds everywhere

Add a small check to `scripts/` that fails if any code path inserts into `contacts` without going through the shared phone validator. Wire it in where `check-document-categories.mjs` is wired, so it runs with parity.

One test that fails loudly beats a rule nobody remembers. The document-category guard exists for exactly this reason and it is the pattern to copy.

---

## Do not

- Do not write a second phone validator.
- Do not backfill or modify any existing contact. The 70 without numbers are the old DogBreederPro import and are a separate job.
- Do not touch Karien Knoetze's record — it has already been corrected by hand and carries a note explaining why.
- Do not make the phone optional "just for signup". The rule is the rule.
- Do not add a migration.

---

## Report

1. Screenshot of portal signup showing the phone field, both platforms, and the error for `123`.
2. Screenshot of the pre-filled read-only state for an email that already has a number on file.
3. **Task 3 answer: does signup create a second contact, or link to the existing one?** Name the file and line.
4. Output of the new `scripts/` check, passing.
5. `npx tsc --noEmit` clean in both repos.

**Then prove it end to end without touching production data.** Against a preview or local environment: submit an application with a phone number, then sign up with the same email, and show that the phone carries across, that you were not asked for it twice, and that **one** contact exists — not two.
