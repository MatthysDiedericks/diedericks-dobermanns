# Cursor Prompt — Correct the Cyrus parentage rules in the breeding seed

## Do this first

1. Both repos: `diedericks-dobermanns` and `diedericksdobermann-web`. Find the equivalent seed in the website repo — if the rules live in only one place, say so.
2. **This is a breeding-safety file. Change only what is listed below.** Do not tidy, reorder or "improve" the other rules.
3. No database migration. This is a data-seed and rules change only.
4. Do not change any COI, Holter or health-testing requirement. Those stay exactly as written.
5. `npx tsc --noEmit` in both repos when done, and paste the real output.

---

## The facts, verified against the live database on 8 September 2026

**Cyrus (`Cyprys De Zelig`, DOB 2018-08-17) — her sire is Chester, not Hunter.**

- `dogs.father_id` for Cyrus = Chester (`Raconti Einston Of Zhen`). Matt confirmed Chester and Manchester are the same dog; the duplicate record is an orphan with zero references.
- Hunter-King is `Hillo Betelges`. He is **not** in Cyrus's parentage.

**Hunter × Cyrus has already produced four litters and 25 puppies:**

| Litter | Date | Pups |
|---|---|---|
| Cyrus × Hunter-King | 10 Jun 2024 | 9 |
| Cyrus × Hunter-King | 17 May 2025 | 8 |
| Cyrus × Hunter-King | 27 Nov 2025 | 6 |
| Cyrus × Hunter-King | 5 Jun 2026 | 2 |

The seed currently marks that pairing "Prohibited — father/daughter". It is not father/daughter, and the kennel has made it four times.

**There is no dog called "Cyrus Pup".** The seed uses that label for Cyrus's offspring generically. Do not create such a dog.

---

## Change 1 — the Hunter × Cyrus pairing rule

In `lib/breeding/seed.ts`, around line 121:

```ts
{
  sire: ['Hunter'],
  dam: ['Cyrus'],
  line: 'Sale',
  status: 'Prohibited',
  priority: 'Prohibited',
  notes: "Father/daughter — Hunter confirmed as Cyrus Pup's sire (owner confirmed)",
},
```

**Remove the `Prohibited` status.** Cyrus's sire is Chester, so this is not an incest pairing and the block is wrong.

Replace it with a **Caution**, not a prohibition, carrying the reason it still deserves care:

```ts
{
  sire: ['Hunter'],
  dam: ['Cyrus'],
  line: 'Sale',
  status: 'Caution',
  priority: 'Caution',
  notes:
    "NOT father/daughter — Cyrus's sire is Chester (Raconti Einston Of Zhen), not Hunter. This pairing has already produced four litters (Jun 2024, May 2025, Nov 2025, Jun 2026). Caution is for Cyrus's own 25% COI, not for relatedness to Hunter: full DCM1–5 and Holter on Cyrus before any further breeding, and Holter all offspring at 2 years.",
},
```

Use whatever value the `status` and `priority` unions actually allow for a non-blocking warning — check the type before assuming `'Caution'` exists. If the only options are `Prohibited` and a normal status, use the normal status and put the warning in `notes`. **Say in your report which value you used and why.**

## Change 2 — the Cyrus dog note

Around line 268:

```ts
{
  fragments: ['Cyrus'],
  notes:
    "Hunter's daughter — cannot breed Hunter or any Hunter son (half-siblings). Cyrus (Cyprys De Zelig) COI = 25% — ...",
  ...
}
```

The opening clause is factually wrong. Replace **only** that clause. Everything about COI, DCM and Holter stays:

```ts
notes:
  "Sire is Chester (Raconti Einston Of Zhen) — NOT Hunter. Cyrus can be bred to Hunter and has done so four times. Cyrus (Cyprys De Zelig) COI = 25% — full DCM1–5 + Holter mandatory before first breeding. Holter all offspring at 2 years. Also pairs with D/C Son = 0% COI (D/C Son's sire is Dharkha).",
```

Keep `flag_high_coi_bg` and `flag_sale_only` exactly as they are — the 25% COI justifies both.

## Change 3 — the rule that is actually missing, and this is the important one

The prohibition was written against the wrong generation. **Cyrus is not Hunter's daughter — but Cyrus's puppies by Hunter are.**

Of the 25 Hunter × Cyrus offspring, 24 are sold or deceased. One is retained:

- **Jazzmine** — DOB 5 Jun 2026, female, `in_training`, sire Hunter-King, dam Cyrus.

Jazzmine is a genuine Hunter daughter and there is **no rule for her anywhere in the seed**. Add one, matching the wording already used for Hailey and Cendra, who are real Hunter daughters:

```ts
{
  sire: ['Hunter'],
  dam: ['Jazzmine'],
  line: 'Sale',
  status: 'Prohibited',
  priority: 'Prohibited',
  notes: "Father/daughter — Hunter-King is Jazzmine's sire (dam Cyrus, DOB 5 Jun 2026)",
},
```

And a dog-level note for Jazzmine in the same style as the others:

```ts
{
  fragments: ['Jazzmine'],
  notes:
    "Hunter's daughter (dam Cyrus) — cannot breed Hunter or any Hunter son (half-siblings). Dam Cyrus carries 25% COI: full DCM1–5 + Holter before any first breeding. DOB 5 Jun 2026 — do not breed before Dec 2027 (minimum 18 months).",
  flag_high_coi_bg: true,
},
```

**Check whether any other Hunter × Cyrus offspring are still retained** before you finish — query for dogs whose sire is Hunter-King and dam is Cyrus with a status other than `sold` or `deceased`. If any exist besides Jazzmine, add the same rule for each and list them in your report.

---

## What NOT to change

- Hailey (line ~209) and Cendra (line ~244) — both genuinely are Hunter's daughters by Hillo Betelges. Their prohibitions are correct. Leave them.
- Every D/C Son rule. Untouched.
- Any COI figure, Holter requirement, or DCM panel instruction.
- Do not add or remove any dog record.

---

## Report

- which `status` value you used for Hunter × Cyrus, and why
- the three changes, quoted before and after
- any additional retained Hunter × Cyrus offspring you found
- `tsc` output for both repos
- whether the website repo has its own copy of these rules, and whether you changed it too

**Then tell Matt this plainly:** the planner will now allow Hunter × Cyrus. That is a correction of a factual error, not advice to make the pairing. Cyrus's 25% COI and the Holter requirement are unchanged, and whether to breed her again is his decision.
