# Cursor Prompt — "Behind this dog": surface the bloodline credentials

## Do this first

1. Read the whole file before changing anything.
2. Both repos: `diedericksdobermann-web` and `diedericks-dobermanns`. Same block, both platforms.
3. **No migration.** Every field already exists and is already populated.
4. `npx tsc --noEmit` in both repos when done. Paste the real output.

---

## Why

`pedigree_ancestors.titles_health` holds **166 titled or health-certified ancestors across 13 pedigrees**. None of it is shown anywhere a client will look. It sits in a pedigree table that reads as a family tree, not as evidence.

Meanwhile the `achievements` table holds **9 real trial results earned by Diedericks dogs** — Hunter-King's PSA 1 title, Obedience Champion, High in Trial, and Cleopatra's PSA PDC third place on 122 points.

**These two things must never be mixed.** An IPO3 three generations back was earned by another kennel's dog. Presenting it as a Diedericks achievement is the kind of soft claim that a sport buyer or a serious breeder spots instantly, and once they spot one they discount the whole page. The titles are worth showing. They are not worth misrepresenting.

So: a **separate block**, on the dog profile, clearly framed as what is *behind* the dog.

---

## Task 1 — A shared parser for the credential strings

`titles_health` is free text imported from several sources and the formats vary wildly. Real examples from the live database:

```
IPO-1 BH
IPO 1, ZTP 1A HD-A1
HD-1 CARDIO FREE
HDB1-B1
HD00, ED00
HDA2-B1
CH ZTP/V-1A HD00, ED00
INTCH CH-RKF RUS-RD GEO-SERB BG BY LT RUS-G HDA IPO 1
JCHSRB CHSRB CAC HD-B
ZTP 1A, HD-A CHRKF CHHUN CHLUX 7CABCIB
World Winner
OFA24G hips (Good), OFEL24 elbows · AKC WS48960801 (MEX) · DNA V751611
RN DJ CGC TKN · OFA24F hips, OFEL24 elbows, EYE76
```

Write **one** parser, shared by both platforms, that classifies a string into flags. Put it in a shared location and import it from both — do not write it twice.

| Flag | Recognise (case-insensitive, tolerant of spacing and punctuation) |
|---|---|
| `workingTitle` | IPO, IGP, SchH, VPG, PSA, ZTP, BH, PDC, and levels (`IPO-1`, `IPO 1`, `IPO3`) |
| `hipsCertified` | `HD-` anything, `HD00`, `HD01`, `HDA…`, `HDB…`, `OFA` followed by digits |
| `elbowsCertified` | `ED00`, `ED-`, `OFEL` |
| `cardiacCleared` | `CARDIO FREE`, `CHIC`, `holter` |
| `champion` | `CH` as a standalone token or prefix (`INTCH`, `CH-RKF`, `CHSRB`, `JCHSRB`, `CHHUN`, `CHLUX`), `World Winner` |
| `americanTitles` | `CGC`, `CGCA`, `CGCU`, `CD`, `RN`, `TKN`, `DJ` |

**Two rules that matter more than completeness:**

1. **Never guess.** If a token is not recognised, it sets no flag. It must still display verbatim — an unrecognised credential is still information, and dropping it is worse than not classifying it.
2. **`CH` is a trap.** It appears inside `CHIC`, `CHSRB`, `CHRKF`. Match on token boundaries, not substrings, or every cardiac clearance becomes a champion.

Write unit tests using **every one of the 13 example strings above**, plus a string with a made-up token to prove it is passed through untouched.

---

## Task 2 — The block on the dog profile

Heading: **Behind this dog**. Directly beneath the pedigree, above or below the existing Achievements block — never inside it.

**A summary line first**, computed from generations 1 to 3 only (great-grandparents and closer; anything further back is too diluted to claim):

> 14 dogs in three generations. 9 hip certified, 7 elbow certified, 3 working titles.

Then the standouts — up to six ancestors that carry a working title or a championship, each showing position ("Sire", "Maternal granddam"), registered name, and their credentials verbatim. Not a wall of every ancestor; the pedigree tab already does that.

**Say nothing rather than something thin.** If a dog has fewer than three credentialed ancestors in three generations, render no block at all. An empty or near-empty "Behind this dog" is worse than its absence — it advertises the gap.

### The framing line — this is not optional

Under the heading, in small muted text:

> Titles and health certifications earned by this dog's ancestors. Diedericks Dobermanns' own trial results are listed under Achievements.

That one sentence is what separates evidence from overclaim. Do not remove it, do not shorten it to nothing.

---

## Task 3 — Keep Achievements honest in the other direction

While you are in there, make sure the **Achievements** block shows only rows from the `achievements` table — the dog's own results, with judge, location and score where recorded. It must never pull from `pedigree_ancestors`.

If any code currently merges the two, that is a bug. Report it.

---

## Task 4 — Where else this belongs

Once the block exists, reuse the **summary line only** (not the full block) in two places:

- The **dog card** on the public Our Dogs listing, so a browsing client sees the depth without opening the profile.
- The **litter page**, computed across the sire and dam together, so an expectant buyer can see what is behind the pairing.

Same helper, same rule about staying silent when the data is thin.

---

## Do not

- Do not write anything to `pedigree_ancestors` or `achievements`. This is presentation only.
- Do not invent, expand or "tidy" a credential string. `HDB1-B1` displays as `HDB1-B1`.
- Do not translate foreign titles into English equivalents. A buyer who cares knows what ZTP means; a buyer who does not is not choosing on that basis.
- Do not include generation 4 in any count or claim.
- Do not add a migration.

---

## Report

1. The shared parser file path, and the import line from both platforms.
2. Unit test output covering all 13 example strings plus the unrecognised-token case.
3. Screenshot of **Behind this dog** on Cleopatra — expect three IPO3 dogs and OFA certification across her second and third generation.
4. Screenshot of a dog with thin pedigree data showing **no block at all**.
5. Confirmation that Achievements reads only from `achievements`.
6. `npx tsc --noEmit` clean in both repos.

**Then check the number by hand.** Pick one dog, count its credentialed ancestors in generations 1–3 straight out of the database, and confirm the summary line matches. If the displayed count is even one out, the parser is wrong — and a wrong number on a page like this costs more credibility than showing nothing would have.
