# Cursor Prompt — Every contact must be reachable

## Do this first

1. Read the whole file before changing anything.
2. Both repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
3. **No migration.** `contacts.phone` and `contacts.email` already exist.
4. `npx tsc --noEmit` in both repos when done. Paste the real output.

---

## The numbers, from the live database on 10 Sep 2026

247 active contacts. **55 of them cannot be contacted at all** — no phone and no email. Another 15 have one but not the other.

Where they came from matters, because it changes the fix:

| Source | Contacts | No phone | Cannot be reached at all |
|---|---|---|---|
| DogBreederPro import | 223 | 56 | **55** |
| App signup | 18 | 13 | 0 |
| Enquiry | 3 | 0 | 0 |
| Newsletter | 2 | 1 | 0 |
| Application | 1 | 0 | 0 |

Two separate problems:

- **Every unreachable contact came from the DogBreederPro import.** No validation you add now will fix those — that is a data recovery job, handled separately. Do not attempt it here.
- **App signup collects no phone number** — 13 of 18. Those people are reachable by email, but Matt cannot phone a single one of them. That one is a live leak and it is what this prompt closes.

Applications and enquiries already require a phone and have **100%** coverage. Copy what those forms already do rather than inventing a new pattern.

---

## Task 1 — Require a phone number where contacts are created

Find every place a `contacts` row is created and make `phone` required:

- The admin **new contact** form, both platforms.
- **App signup** — the form that produced 13 phone-less contacts. Add the field. It is the main gap.
- Any server action or route that inserts into `contacts`.

Validate the number, do not just check it is non-empty:

- Strip spaces, dashes and brackets before storing.
- Accept South African formats (`0821234567`, `+27821234567`) and international (`+268…`, `+44…`). Matt sells into Eswatini, SADC and overseas — **do not force a South African pattern.**
- Reject anything under 9 digits after stripping.
- Store one consistent format. Pick whatever `applications` already does and match it, so the two tables can be compared later.

There is already phone handling in the application form — **reuse it. Do not write a second validator.** Move it into a shared helper and have every form call it: the application form, the enquiry form, the equipment shop enquiry, app signup, and both contact forms. **One validator, five callers.** If you find yourself writing a second regex for a phone number, stop.

While you are in there, apply the same placeholder rejection from Task 2 to the **application form** as well. It requires a phone today but does not check the number is real, so `0000000000` would sail through. Same helper, same rules, everywhere.

## Task 2 — No exceptions, and that includes editing old records

Matt's instruction, 10 Sep 2026: **"we must have a contact number."** There is no escape hatch, no "email only" tick-box, no way to save a contact without a phone number.

**Apply the rule on save, not only on create.** Anyone opening one of the 55 phone-less contacts and changing anything must supply a number before that record will save. That is deliberate — it turns the backlog into something that clears itself as people work, instead of a list nobody opens.

Two things that make this bearable rather than infuriating:

- **Say what is wrong at the top of the form**, before they scroll: *"This contact has no phone number. Add one to save your changes."* Do not let someone fill in six fields and only then discover they are blocked.
- **Reject obvious placeholders**, or the rule defeats itself within a week. Refuse `0000000000`, `1234567890`, any single digit repeated, and any sequence of fewer than 9 digits after stripping. Message: *"That is not a real number. If you do not have one, leave the record and come back when you do."*

**Do not add a "cannot trace" flag as a way around this.** The Task 3 worklist may still mark a contact as untraceable so it stops appearing there, but that must not unlock saving without a number.

### Where a number cannot be captured at all

If a contact is created by a process with no phone field — a newsletter signup, for instance — do **not** silently write a phone-less row. Either add the field to that form, or stop that path creating `contacts` rows at all and have it write to its own list instead. Report which of the two you did for each such path.

## Task 3 — A worklist for the 55

A screen — admin, both platforms — listing contacts that cannot be reached, so Matt can work through them instead of discovering them one at a time.

- Filter: no phone **and** no email.
- Sort by how much they matter: contacts linked to a dog first, then those with an invoice, then the rest. Someone who bought a dog is worth chasing; a stale import row is not.
- Show what is known — name, source, linked dog, last invoice date — so Matt can decide whether to chase or archive.
- Let him edit phone and email inline, and mark a contact **"cannot trace"** so it drops off the list without being deleted.

Expected count today: **55**. Report the number you actually find.

Put it where he will see it — a count on the contacts screen, not a separate menu item he has to remember exists.

---

## Do not

- Do not change or delete any existing contact row. This is validation for new data plus a worklist for old data.
- Do not backfill phone numbers from anywhere, and do not guess one from an application or invoice. Matching people across tables by name is how records get merged wrongly.
- Do not loosen the public application form. It already requires a phone and sits at 100% coverage — it is the reference, not the target.
- Do not add a database constraint. 55 existing rows would fail it, and a migration that cannot apply is worse than no migration.
- Do not add a migration at all.

---

## Report

1. Every file where a `contacts` row is created **or updated**, and confirmation each one now validates.
2. The shared phone validator — paste the import line from all five callers showing they use the same one.
3. Screenshot of app signup with the phone field, and the error shown for `123`.
4. Screenshot of editing an existing phone-less contact, showing the message at the top of the form and the save blocked.
5. The unreachable count on the new screen — expected 55.
6. For every path that creates contacts without a phone field: which you did — added the field, or stopped it writing to `contacts`.
7. `npx tsc --noEmit` clean in both repos.

**Then prove all four:**

| Input | Expected |
|---|---|
| No phone at all | refused |
| `0000000000` | refused as a placeholder |
| `+26876123456` (Eswatini) | **accepted** — if your validator rejects it, the validator is wrong, not the number |
| `+27821234567` (South Africa) | accepted |

Do not leave a test contact in production. Tell Matt the name you used and delete it.
