# CURSOR PROMPT — Validate ID and passport numbers on applications

Matt reports clients entering fake ID numbers. I checked the seven live applications: the six
13-digit numbers all **pass** the South African checksum and their embedded dates of birth match
what the applicant typed. One does not:

```
Jocelyn Makenzie · South Africa · 982927801 · 9 digits · NOT a South African ID
Deneuve Schrader · Namibia      · 73040500236 · 11 digits · correct for Namibia
Daron Naidoo     · Malawi       · 7903185138086 · valid SA ID, country says Malawi
```

The form accepts anything. Nothing checks length, format or checksum.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`.

---

## What validation can and cannot do — be honest about this in the UI

A South African ID number carries a **check digit**, so a mistyped or invented number is caught
immediately. It also encodes date of birth, sex and citizenship, which can be cross-checked against
what the applicant told us.

**But a valid checksum does not prove the number belongs to them.** Valid numbers can be generated.
This catches typos and casual invention — not a determined fraudster.

**Never label a validated number "verified".** Use *"format checks out"*. If Matt needs real
identity verification, that is a document check or a Home Affairs lookup, and it should be a
deliberate decision, not something the form quietly implies.

---

## Migration

```sql
alter table public.applications
  add column if not exists id_type text
    check (id_type is null or id_type in ('sa_id','passport','other_national_id')),
  add column if not exists id_check_status text
    check (id_check_status is null or id_check_status in ('passed','failed','not_checked','manual_override')),
  add column if not exists id_check_note text;

alter table public.contacts
  add column if not exists id_type text,
  add column if not exists id_check_status text;
```

**Apply it and confirm the columns exist in the live database before reporting done.**

## Validation by type

**South African ID — full check:**

1. Exactly **13 digits**, no spaces.
2. **Luhn checksum**: sum the digits in odd positions 1–11; take the even-position digits 2–12 as one number, double it, sum its digits; the check digit is `(10 − ((oddSum + evenDigitSum) mod 10)) mod 10` and must equal digit 13.
3. Digits 1–6 are `YYMMDD` and must be a real date.
4. Digit 11 is citizenship — `0` citizen, `1` permanent resident. **Anything else is invalid.**
5. Digits 7–10 encode sex: `0000–4999` female, `5000–9999` male.

**Passport:** 6–12 alphanumeric, uppercase. Do not attempt a checksum — formats vary by country and
a false rejection is worse than a soft accept.

**Other national ID:** length by country where known — Namibia 11 digits, Eswatini 13. Otherwise
accept 6–15 alphanumeric.

**Default the type from the country already captured on the form**, and let the applicant change it.
Someone living in Malawi may hold a South African ID — Daron does — so **country must not force the
type.**

## What the applicant sees

- Live feedback as they type: *"South African ID numbers are 13 digits — you have entered 9."*
- On checksum failure: *"That ID number does not look right. Please check it against your ID book or card."* **Never accuse.** The overwhelming majority are typos.
- **A failed check does not block submission.** Save it with `id_check_status = 'failed'` and flag it for Matt. A genuine buyer with an unusual document must not be turned away by a regex, and a blocked application is a lost sale.
- Never show the derived date of birth or sex back to the applicant — it reads as surveillance.

## What Matt sees

- On the application detail: *"ID format checks out"* or *"ID failed the format check — 9 digits, expected 13"*.
- Where the embedded date of birth disagrees with the stated one, say so: *"ID says 3 June 1983, the form says 16 June 1973."* **That mismatch is the strongest signal available**, stronger than the checksum.
- A **manual override** with a note, for the real exceptions — a foreign document, a recently reissued number.
- A filter on the applications list for failed checks.

## Fix `date_of_birth` while you are here

It is free text and currently holds at least four formats across seven records: `06/16/1973`,
`03061983`, `020103`, `27/10/2000`. It cannot be sorted, compared, or cross-checked against an ID.

- Make it a proper date input storing a real `date`.
- Back-fill what can be parsed unambiguously; **leave anything ambiguous alone and report it**. `020103` could be three different dates and guessing puts a wrong birth date on a person's record.
- Where a valid SA ID exists and the date is unparseable, **offer** the ID's embedded date for Matt to confirm — do not write it automatically.

## Treat these numbers carefully

An ID number is sensitive personal information.

- **Never** write it to `error_events`, `issue_reports`, logs or a URL. The existing no-credentials test should be extended to cover `id_number`.
- Show it masked by default on screen — `830603 0160 08•` — with a click to reveal for admins.
- It is already in `audit_log` via the applications trigger; leave that, it is the legitimate record.

## The three live records

Do not change any of them. **Report them to Matt** on the applications list with the flag set:

- **Jocelyn Makenzie** — 9 digits under South Africa. Likely a passport number in the wrong field.
- **Daron Naidoo** — valid SA ID with country Malawi. Plausible; flag as worth confirming, not as failed.
- **Deneuve Schrader** — 11 digits, Namibia. Correct; must pass once Namibian rules are in.

---

## Rules

- A failed check flags, it never blocks submission.
- Never use the word "verified" for a format check.
- Country defaults the ID type but never forces it.
- No ID number in logs, URLs or error records.
- Do not auto-correct a date of birth from an ID.
- No file over 300 lines.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify

- [ ] `8306030160082` passes; `982927801` fails with "9 digits, expected 13".
- [ ] Changing one digit of a valid ID makes the checksum fail.
- [ ] `73040500236` with country Namibia passes.
- [ ] A South African ID entered by an applicant in Malawi passes and is not forced to passport.
- [ ] A failed check still submits, and appears flagged on the applications list.
- [ ] A date-of-birth mismatch against the ID is shown in plain words on the detail page.
- [ ] The manual override records who and why.
- [ ] `date_of_birth` is a date input; ambiguous historic values are reported, not guessed.
- [ ] No ID number appears in `error_events`, `issue_reports` or any URL — the no-credentials test covers `id_number` and fails when one is added.
- [ ] The number is masked on screen until revealed.
- [ ] The app applies the same rules.
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

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Push both, then `git log origin/main -1` in each and confirm it matches `HEAD`.

Do not modify (committing is fine): `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/components/layout/WhatsAppButton.tsx`,
`scripts/import-dbp-contacts.mjs`.
