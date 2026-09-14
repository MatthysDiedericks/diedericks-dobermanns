# DogBreederPro — what's in there, and what we're missing

Surveyed against the live system, 14 September 2026. Nothing imported yet.

---

## The gap, in one table

| Data | In DogBreederPro | In your system | Missing |
|---|---|---|---|
| **Financial transactions** | **479** | mixed, partial | **see below** |
| **Dewormings** | **585** | 174 | **411** |
| **Vaccinations** | **365** | 109 | **256** |
| **Dogs** | **314** | 173 | **141** |
| Calendar events | 408 | 347 | 61 |
| Contacts | 250 | 250 | none |
| Weight logs | — | 1,234 | you have more |

---

## 1. Finance — ALREADY IMPORTED. Correction, 14 Sep 2026.

**Reconciled year by year after this survey was first written. The finance data is already in your system, rand for rand.**

| Year | DBP expenses | Yours | DBP income | Yours |
|---|---|---|---|---|
| 2019 | 1 · R400 | 1 · R400 | — | — |
| 2021 | 65 · R106,348 | 65 · R106,348 | 54 · R224,389 | 54 · R224,389 |
| 2022 | 4 · R13,830 | 4 · R13,830 | 2 · R72,132 | 2 · R72,132 |
| 2023 | 74 · R316,402 | 78 · R329,974 | 13 · R327,458 | 13 · R327,458 |
| 2024 | 64 · R232,469 | 64 · R232,469 | 14 · R468,845 | 14 · R468,845 |
| 2025 | 91 · R530,562 | 91 · R530,563 | 37 · R993,833 | 37 · R993,833 |
| 2026 | 47 · R228,733 | 46 · R226,222 | 13 · R284,500 | 7 · R218,500 |

**Only 2026 differs** — six income transactions (about R66,000) and one expense (about R2,500). Even those may already exist as invoices, since current income runs through the invoice system rather than `historical_income`.

**Do not import finance.** The original count of "479 missing" was wrong: it compared DogBreederPro's single transaction table against three separate tables on our side without summing them. Importing on that basis would have double-counted roughly R2.3m of income.

The original (incorrect) survey text follows, kept for the field detail only.

---

**479 transactions spanning 2019 to 2026.**

- **Income: R2,371,157** across 133 transactions
- **Expenses: R1,428,745** across 346 transactions

And they are properly structured, not a spreadsheet dump. Each row carries:

- transaction date, type, document number
- **amount, tax and total split out**, with tax mode (inclusive/exclusive) and two tax fields
- **category**, and an allocation to a **specific dog** or **specific litter**
- linked contact
- **attachment** — file path, filename and type, so receipts and invoices are stored against the transaction
- line items, with a count

By year: 2021 (119), 2025 (128), 2023 (87), 2024 (78), 2026 (60), 2022 (6), 2019 (1).

Your system currently holds 183 invoices, 349 expenses and 127 historical income rows from an earlier partial migration. **How much of that overlaps with these 479 is the first thing to establish** — importing blind would double-count roughly R2.4m of income, which is worse than not importing at all.

**This is the most valuable dataset in DogBreederPro and the one to handle most carefully.**

---

## 2. Health records — 667 missing between two tables

**585 dewormings** vs your 174. **365 vaccinations** vs your 109.

These cover every puppy ever bred, not just the dogs you kept. That matters for three reasons:

- A buyer asking "what was my dog given, and when" — you currently cannot answer for most dogs.
- Proof of a health programme, which is exactly the evidence a premium buyer wants.
- Any veterinary or legal question about a dog you sold years ago.

**Known trap from the earlier work:** the `status` field matters. `confirmed` means actually administered; `unconfirmed` means scheduled — including future doses. But DogBreederPro's litter Health tab lists unconfirmed past items under "PAST", meaning they were done and never ticked off. **Do not import `unconfirmed` rows as treatments given** without deciding that rule first.

---

## 3. Dogs — 141 missing, and they are mostly puppies you sold

314 dogs in DogBreederPro against 173 in your system.

- **93 are microchipped** — you hold 18 microchips today
- 176 belong to a recorded litter
- 61 are deceased
- Birth years run 2003 to 2026, peaking at 2025 (58), 2022 (40), 2024 (30), 2023 (25)

These are the puppies from 155 litters — the dogs now living in client homes. Importing them is what turns "Puppy 3" into a real dog with a chip number, a birth date and a buyer.

It also directly serves the outstanding job of importing owners for the 121 sold dogs.

---

## 4. Litters — 128 missing

155 in DogBreederPro against 27 in your system. Your 27 are the recent ones; the rest are history going back years.

Worth having for the breeding record, the COI work, and for answering "which litter did my dog come from".

---

## 5. Calendar — 61 missing

408 against 347. Low value, low risk. Do last or not at all.

---

## 6. Contacts — already complete

250 in both. **DogBreederPro holds no phone numbers you do not already have** — I checked all 56 of your blank ones by name and every single one is blank in DogBreederPro too. There is nothing to recover here.

---

# Recommended order

**1. Finance reconciliation — before any import.**
Match the 479 DogBreederPro transactions against your existing invoices, expenses and historical income by date, amount and document number. Produce a list of what is genuinely new. Do not insert anything until that list has been read. Double-counting R2.4m of income would corrupt every financial report you have.

**2. Dogs, then litters, then health.**
In that order, because health records attach to dogs and dogs attach to litters. Import them the other way round and you get orphans.

**3. Calendar last, if at all.**

# Three rules for the import

**Idempotent.** Every record must carry its DogBreederPro id so a second run updates rather than duplicates. This will not work first time.

**Dry run first.** Every stage reports what it would create, update and skip, and writes nothing until told to.

**Take a backup immediately before.** The scripts are in `scripts/` and they work.

# The question that decides the shape of it

Is DogBreederPro being **retired**, or does it stay as the system of record for pedigrees and history?

If it is being retired, this is a full migration and everything comes across including attachments.
If it stays, import only what your platform actively uses — health records, dogs, litters — and keep going to DogBreederPro for the rest.

The answer changes how much work this is by a factor of three.
