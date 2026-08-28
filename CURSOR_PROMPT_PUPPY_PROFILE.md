# CURSOR PROMPT — One puppy profile, two audiences

Selecting a puppy must open a real profile — pedigree, health, documents, contract — and the **same
record is what the client sees once that puppy is allocated to them**. One page, one data path, two
levels of visibility. Never two screens that can drift.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Verified — what already exists. Extend it; do not rebuild.

`/admin/dogs/[id]` already renders **all of this**:

```
DogForm                  edit every field
DogPedigreeEditor        edit the pedigree
AdminDogPedigreeSection  view it
MediaManager             photos and video
VaccinationsManager      vaccinations
VaccinationScanUpload    upload scans
OwnershipCard            owner
DogLitterHistory · DogProgenySection · DogSiblingsSection · DogAncestorAnalysis
AchievementsManager · DogStoryManager · DogBreedingSection
```

**So "add editing" and "add documents" are already built.** The gap is reach, presentation, and four
genuinely missing features.

Also verified live:

| Fact | Value |
|---|---|
| Pedigree depth held | **4 generations** — 26 / 52 / 104 / 164 rows by generation |
| `vaccinations` rows | **0** |
| `deworming_records` rows | **0** |
| Both tables have `next_due_date` | yes — the scheduling field already exists |
| Print / PDF for a pedigree | **does not exist** |
| Share-a-dog-to-a-client feature | **does not exist** |

**Do not build Shows or Finances sections.** Matt does not want them.

---

## 1 · Make the profile reachable

`/admin/breeding/stock` has no link to the dog. The only row action is PAIRINGS. Make the **dog's
name** link to `/admin/dogs/{id}`, keeping PAIRINGS as the secondary action. Then audit every other
list that shows a dog — unallocated sales, litters, waiting list, follow-ups — and report any where
the name is not a link.

## 2 · Lead with what the reader came for

The DogBreederPro screen Matt is replacing shows sixteen empty fields — coat type, size, height,
ears, hips, elbows, eyes — all dashes, and then *Spayed: No · Direct Progeny: 0 · Breeding Dog: No*
on a six-week-old puppy. True and useless.

**Never render an empty field.** Show what exists; omit what does not. A screen of dashes teaches
people the system is empty.

Order the page the way the reader asks: **what is she → when do I collect her → how is she doing →
where does she come from → paperwork.**

Header: name, collar, sex, colour, date of birth, age, **and a countdown to collection** — "15 days
to go", not just a date.

Three stat cards: **latest weight against the litter benchmark** (the `useGrowthBenchmark` work
already exists and there are 90 weight records for the Claire × Santini litter), **vaccinations
done vs due**, **microchip status**.

## 3 · Full four-generation pedigree, on the puppy

**A puppy has no `pedigree_ancestors` row of its own and never will** — only breeding stock is
recorded that way. Resolve the puppy's pedigree **through its sire and dam** and present it as the
puppy's own. A page that queries the puppy's own id renders empty every time, on the screen a buyer
most wants to read.

- Four generations, matching what DBP shows.
- Where a parent has no pedigree loaded, say *"Pedigree not yet recorded"* — never an empty grid.
- **Registered name and call name both**, where they differ. A buyer reading a pedigree wants the registered name.
- **Do not print COI to four decimals.** DBP shows `1.9043%`. Round to one decimal and label it plainly, or leave it out of the client view entirely.

### Print the pedigree

A **Print pedigree** action producing a clean A4 landscape sheet: kennel letterhead, the puppy, four
generations, health results where recorded, and the date it was produced.

**Use a print stylesheet, not a screenshot.** Buyers frame these and send them to vets. It must be
legible in black and white — do not rely on colour to carry meaning.

## 4 · The health calendar — this is the feature Matt asked for

Both `vaccinations` and `deworming_records` already carry **`next_due_date`**. Nothing reads it.

Build a small **What's next** calendar on the profile:

```
29 Aug   Second vaccination      due in 7 days
12 Sep   Deworming               due in 21 days
 1 Oct   Third vaccination
```

- Past entries listed underneath as a history — date, product, who administered it.
- **Overdue is stated plainly and calmly**, never in alarm colours on a client's screen. *"Was due 12 Aug"* — the buyer may have had it done elsewhere and not told you.
- The client sees the schedule for **their own dog only**; that follows from RLS, do not filter in the component.

**Both tables are empty today.** Build the section to render gracefully with zero rows — *"No vaccinations recorded yet"* — because that is what every dog will show at launch.

## 5 · Sharing a puppy to a client

Does not exist and is the most valuable thing here.

A **Share with client** action on the profile: pick the client, and that puppy appears in their
portal. **A client may hold more than one of your dogs** — the model must be many dogs to one
client, and their portal lists all of them.

- Sharing is what makes the parents and pedigree visible to them. It is the same gate as allocation.
- **Unshare must exist**, and must actually remove access — verify with a real JWT, not by hiding a menu item.
- Every share and unshare writes to `audit_log`. This grants a person access to records; it needs a trail.
- **Never auto-notify the client.** Standing rule: Matt sends the message. A push into the app is acceptable; an email is not.

## 6 · Documents and contract, in one place

Both exist already — surface them on the profile rather than making Matt hunt.

- **Documents**: name, category, date, and whether the client can see it.
- **Contract**: current status — draft, sent, awaiting signature, signed — linking to the existing clause-level acknowledgement flow.
- **The `documents` bucket is PRIVATE** (locked down 20 Aug after cross-client exposure). Serve every file through a **signed URL**. Do not make the bucket public, and do not build public URLs for it.
- Only health and registration documents cross to the client. Never private or client-scoped ones.

## 7 · The admin-only strip

Below a clear divider on the same page, hidden from the client:

- Buyer, programme tier, price
- **Handover blockers** — a short list of what is not done: microchip, contract unsigned, balance outstanding, vaccinations incomplete

**That last line turns the profile from a record into a worklist.** Claire's litter goes home in
about two weeks and has no contracts at all.

---

## The app

Matt works from his phone at the kennel; buyers read their puppy's page on a phone almost always.

- Same profile, same sections, same admin strip.
- The **health calendar and weight chart matter most on mobile** — that is what a buyer checks.
- Print the pedigree is **website-only** and that is a justified platform difference — say so explicitly rather than leaving it unstated.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**

## Rules

- Extend `/admin/dogs/[id]`; do not create a second dog page.
- Never render an empty field.
- Pedigree resolves through sire and dam, four generations.
- No Shows section. No Finances section.
- Documents served by signed URL; the bucket stays private.
- Sharing is audited; unsharing genuinely revokes.
- Nothing auto-emails a client.
- No file over 300 lines — this page will need splitting into sections.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output, not descriptions

- [ ] The dog name links to the profile from breeding stock, unallocated sales, litters and the waiting list. Name any list that still does not.
- [ ] Opening **Puppy 1 (Pink)** shows a four-generation pedigree resolved from Santini and Claire. Paste the ancestor count — expect **22 + 30**.
- [ ] That puppy has **no** `pedigree_ancestors` row of its own, and the pedigree still renders.
- [ ] A dog whose parent has no pedigree shows "Pedigree not yet recorded", not an empty grid.
- [ ] No dashes for empty fields anywhere on the page.
- [ ] Print pedigree produces a clean A4 landscape sheet, legible in black and white. Attach it.
- [ ] COI is shown to at most one decimal, or not at all.
- [ ] Adding a vaccination with a `next_due_date` makes it appear in **What's next** with a correct day count.
- [ ] An overdue item reads plainly, not alarmingly.
- [ ] Both health sections render cleanly with **zero rows** — that is today's real state.
- [ ] Sharing a puppy with a client makes it appear in that client's portal. **Test with a real client JWT.**
- [ ] A client holding **two** shared dogs sees both, and each other client sees neither.
- [ ] Unsharing removes it — prove with the JWT, not the menu.
- [ ] Share and unshare each write an `audit_log` row.
- [ ] **Sharing sends no email.** Prove nothing left.
- [ ] Documents open via signed URL and the bucket is still private. Paste the URL form.
- [ ] Contract status shows for a dog with a contract, and says so plainly for one without.
- [ ] Handover blockers list correctly for a Claire × Santini puppy — expect microchip and contract.
- [ ] The admin strip is invisible to a client. Test with a JWT.
- [ ] App: same profile and sections; health calendar and weight chart render on a phone. Say which device.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. App: `npx tsc --noEmit` exits 0.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] `git status --porcelain` shows nothing untracked. **Two deployments broke this week because files were written but never committed.**
- [ ] Vercel reaches **Ready** — paste the deployment id.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: profile links, pedigree inheritance, print sheet, health
calendar, sharing, documents and contract, admin strip, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
