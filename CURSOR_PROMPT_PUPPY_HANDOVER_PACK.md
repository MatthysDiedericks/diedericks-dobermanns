# CURSOR PROMPT — The printable handover pack

Nine puppies go home on **6 September**. One leaves **this weekend**. Each buyer should receive one
bound PDF: their puppy, its parents' papers, and its health record. Matt prints it once and hands it
over in a folder.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Currency ZAR, `R1 234,56`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Verified live — read this before designing anything

**The permission model already exists and is correct. Do not rebuild it.** RLS policy
`Clients view own dog and its parents documents` on `documents`:

```sql
entity_type = 'dog' AND client_visible = true AND (
  auth.uid() = ANY(allowed_user_ids)
  OR entity_id IN (SELECT my_dog_ids())
  OR (category IN ('dna_test','hip_elbow_score','pedigree','registration')
      AND entity_id IN (SELECT my_dog_parent_ids()))
)
```

A buyer already sees the sire's and dam's pedigree, registration, DNA and hip/elbow results. That is
exactly the handover set. **The pack is a rendering problem, not an access problem.**

**What exists for the Claire × Santini litter, counted today:**

```
10 puppies, 9 with photos          0 documents on the puppies themselves
 9 vaccinations                   27 deworming records
11 contracts
```

Every certificate in the pack therefore comes from **the parents**. The puppy contributes its
photo, its identity, and its health rows.

**Parent documents on file**

| | Claire (dam) | Santini (sire) |
|---|---|---|
| registration | PDF, `ZA005357B22` | PNG, `ZA001071C26` |
| pedigree | PDF | 2 × PDF (incl. export pedigree) |
| DNA | — | 3 × PDF (PDK4, RBM20, TITIN) |
| hip & elbow | PDF | PDF |

## 1 · Use `pdf-lib`, not jsPDF

This is the decision that matters. `jspdf` is already a dependency and it **generates** pages, but it
**cannot copy pages out of an existing PDF**. Most of this pack is existing PDFs — Claire's
registration, both pedigrees, three DNA reports.

**Add `pdf-lib`.** It creates pages *and* copies pages from source PDFs *and* embeds PNG/JPEG, so the
whole pack is assembled with one library in one pass:

- `PDFDocument.create()` for the cover and health pages
- `copyPages()` to append each source PDF
- `embedPng` / `embedJpg` for scans that are images (Santini's registration is a PNG)

Leave the existing `jspdf` quote and statement routes alone. Do not migrate them.

## 2 · The route

`src/app/api/puppies/[id]/handover-pack/route.ts` — follow the shape of
`src/app/api/quotes/[id]/pdf/route.ts`, which already works in production.

**Two things that route will teach you, and both are load-bearing:**

- The crest is read off disk at runtime. Files under `public/` are **not** traced into a serverless
  bundle unless declared. Add your route to `outputFileTracingIncludes` in `next.config.ts` beside
  the existing entries, or the logo silently vanishes on Vercel while working locally.
- **Never use `next/image` for Supabase photos.** The Hobby plan's image-optimization quota is spent
  (5.2K / 5K) and the optimizer returns `402`. Use `src/lib/thumbs.ts`.

Admin-only for generation. Fetch source files with the service-role client, server-side.

## 3 · What is in the pack, in this order

**Cover** — the puppy's photo large, on the dark brand background with the crest.
Name, collar colour, sex, date of birth, microchip, registered litter, buyer's name, go-home date.

**Parentage** — sire and dam side by side: registered name, registration number, and a one-line
health summary (hips, elbows, DNA status). Registered names are on file and correct:
`SANTINI BETELGES OF DE ZELIG (IMP SER)` and `DE ZELIG CLAIRE HDB1-A2, EDOO`.

**Health record** — generated from the database, not from a scan. Two tables:

- vaccinations: date, vaccine, batch, vet, next due
- dewormings: date, product, next due

Use the same grouping rule as the health calendar — **only the latest record in each group produces
a "next due"**. Do not reintroduce the false-overdue bug.

**Certificates** — the parents' documents appended in full, each with a divider page naming what
follows: sire pedigree, sire registration, sire DNA (×3), sire hips & elbows, then the same for the
dam.

**Contract** — the buyer's signed contract if one exists. 11 contracts now exist; a puppy without one
gets a page saying so rather than a silent gap, so Matt can see it at printing time.

**Care sheet** — feeding, worming schedule, vaccination due dates, and the WhatsApp number.

## 4 · The naming problem blocks this

Claire has documents literally named **"1", "3", "4", "5", "6", "7", "8", "9", "a", "b"**. Santini
has **"doc 1 Santini"**, **"Santini — scanned document 1 (to be labelled)"**. A premium handover
folder cannot contain a divider page reading *"a"*.

- The pack takes **only** `pedigree`, `registration`, `dna_test`, `hip_elbow_score` — the same four
  categories the RLS policy names. Everything in `other` is excluded by construction.
- Add an admin screen listing every `category = 'other'` document with a name and category picker,
  so Matt can label them once. **67 documents across the kennel are affected.**
- A document with no meaningful `document_name` never reaches a divider page — fall back to the
  category label.

## 5 · Where Matt clicks it

- **Puppy profile** — "Handover pack" → PDF opens in a new tab.
- **Litter fulfilment tab** — "Generate all packs" produces nine PDFs, one per puppy, correctly named
  `Puppy-1-Pink-Josef-Kotze-handover.pdf`. **That is today's actual job.**
- Show which puppies are missing something — no photo, no contract, no buyer — **before** he prints,
  not after.

**The buyer also gets it in their portal**, under Documents, once Matt marks the puppy as handed
over. Nothing sends automatically; Matt releases it.

---

## The app

- Matt generates and shares a pack from the app — he is at the kennel when buyers arrive. Use
  `expo-print` + `expo-sharing`, which are already dependencies.
- The buyer can open and share their pack from the app.
- **Bulk generation is website-only** — a justified platform difference. Say so explicitly.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on
this filesystem.**

## Rules

- `pdf-lib` for assembly. Do not try to merge PDFs with jsPDF.
- Do not change any RLS policy. The parent-document policy is already right.
- No `next/image` for Supabase photos — the optimizer is over quota and returns 402.
- Register the new route in `outputFileTracingIncludes` or the crest will vanish on Vercel.
- Only the four certificate categories reach the pack. `other` is excluded.
- Nothing sends automatically. Matt presses the button.
- No file over 300 lines. Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output, not descriptions

- [ ] Generate the pack for **Puppy 1 (Pink)**, Josef Kotze. Attach the PDF. It must contain: cover
      with her photo, parentage page, vaccination and deworming tables, Claire's and Santini's
      certificates, and the contract state.
- [ ] Page count and section order listed. No page reads "a", "b" or "9".
- [ ] Santini's registration is a **PNG** — confirm it embeds as a full page, not a broken box.
- [ ] Claire's registration is a **PDF** — confirm its pages are copied in, not re-rasterised.
- [ ] The crest renders on the deployed Vercel build, not just locally. Screenshot the live PDF.
- [ ] Bulk-generate for the litter: **9 PDFs, 9 buyers, 9 correct puppies.** Paste the filenames.
- [ ] A puppy with no contract produces the "no contract" page, not a silent gap.
- [ ] The health tables match the portal health screen exactly — one due item per group.
- [ ] Josef can open his own pack in the portal; **a second real client cannot.** Test with a real JWT.
- [ ] The `other`-document labelling screen lists 67 documents. Screenshot.
- [ ] App: generate and share a pack. Say which device.
- [ ] Website: `npm run preflight` passes.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel reaches **Ready** — paste the deployment id **for `diedericksdobermanns-web-v145`**,
      which is the project bound to the live domain. The other three projects are duplicates.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: the pdf-lib dependency and pack builder, the route and
tracing config, bulk generation, the document-labelling screen, portal release, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`,
`src/app/api/quotes/[id]/pdf/route.ts`, `src/app/api/statements/pdf/route.ts`.
