# Facts Claude must not get wrong on this project

Read this before touching dog data, and before reporting that anything is "missing",
"contradictory", or "a gap we can fill".

---

## 1. Hunter-King = Hillo Betelges. Same dog.

Our system stores the call name. DogBreederPro stores the registered name.

- **Hunter-King** (ours) = **Hillo Betelges** (DogBreederPro)
- His colour is **`brown_tan`**, not `black_tan`. Our record was wrong until 15 Sep 2026.

So when DogBreederPro lists "Hillo Betelges" as sire of Hailey, Hector, or the 25 Sep 2021
litter — **that is Hunter-King, and there is no contradiction.**

### The general rule

**Every dog here has at least two names.** Cleopatra is `Masaya's Vaida Cleopatra`.
Hunter-King is `Hillo Betelges`.

Before calling a name "not in our system", check whether it is the registered form of a
dog already present. Matching on call name alone manufactures phantom dogs and phantom
conflicts, and has done so more than once.

---

## 2. Pedigrees: papers beat DogBreederPro, always

**Order of trust for any pedigree, registered name, title or health result:**

1. **KUSA registration certificates and export pedigrees** — Kennel Union of Southern Africa
2. **AKC registration certificates and Certified Export Pedigrees**
3. Other national registry papers (FCI member bodies, etc.)
4. DogBreederPro — **last**, and only where no paper exists

DogBreederPro is typed by hand. It has duplicated microchips, malformed numbers, titles
glued into name fields, and missing dams. It is a working record, not an authority.
The papers are the authority.

**Where the two disagree, the paper wins and DogBreederPro gets corrected** — not the other
way round. This is how Cleopatra's profile was fixed: her AKC Certified Export Pedigree gave
the registered name `Masaya's Vaida Cleopatra`, the microchip, the colour, and fourteen
ancestor titles that DogBreederPro did not have.

**Before importing a pedigree from DogBreederPro, check `public.documents` for a
registration certificate or export pedigree for that dog** (`category` in
`registration`, `pedigree`; `issued_by` naming KUSA or AKC). If one exists, read it and use
it. If you import from DogBreederPro because no paper exists, say so plainly in the report
so the dog can be flagged for paper verification later.

---

## 3. Count the overlap before claiming a gap can be filled

This is the error that keeps repeating. The pattern each time:

> Our system has N blanks → the other system holds M values → *therefore* we can fill N.

**That inference is wrong and has been wrong three times running.**

| Claimed | Reality |
|---|---|
| 479 DogBreederPro finance transactions missing | Already present. Importing would have double-counted ~R2.3m. |
| 56 client phone numbers recoverable from DogBreederPro | All 56 are blank there too. |
| 93 microchips available to fill 86 blanks | 68 identical, 12 already held under a name variant, 3 corrupt. **Zero** new. |

**The rule: join the two sets and count the intersection before saying anything out loud.**
The number that matters is not "how many they have" — it is "how many they have that we do
not". Report that number, and only that number.

---

## 4. Never overwrite a non-empty value from an import

Fill blanks. Where both sides hold a value and they disagree, **list the conflict and stop**.
Matt decides. The Hunter-King colour conflict was real and our side was wrong — that is
exactly why the decision is his, not the importer's.

Keep an undo record of every row changed (see the `dbp_import` schema in Supabase).

---

## 5. Never link a client record by name alone

`buyer_contact_id`, `owner_contact_id` and anything else that drives portal scoping must not
be set from a fuzzy name match. A wrong link means one client sees another client's dog.
Store the name as text; let a human do the linking.

---

## 6. Sanity-check your own encoding

On 15 Sep 2026 coat colours were abbreviated to their first letter — and **Black and Brown
both start with B**. Caught only by counting the result against the source.

After any transform, count the output categories and compare them to the input. If 62 Brown
and 103 Black go in, 62 and 103 must come out.
