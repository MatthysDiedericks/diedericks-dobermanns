# CURSOR PROMPT — Fix migration collision, apply de-duplication, link owners

Three steps, in this order. **Step 1 must happen first** — there is a migration number collision
on the live project.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns`.
**Supabase:** `nlmwxodvquwbjinhhbmr`.

---

## 1. Migration collision — two files numbered 0059

```
0059_breeding_cycle_capture.sql   ← APPLIED to the live database
0059_contacts_dedupe.sql          ← NOT applied
0067_delivery_rates.sql           ← NOT applied, and CANCELLED
```

Two migrations sharing a number will apply in an undefined order, and any tool that tracks
migrations by version will treat one as already run. Fix before touching the database.

- **Rename** `0059_contacts_dedupe.sql` → **`0068_contacts_dedupe.sql`**. Do not reuse the free `0061` slot: this migration has not run yet and must sort *after* everything already applied.
- **Delete** `0067_delivery_rates.sql`. That prompt was cancelled and replaced by `CURSOR_PROMPT_QUOTE_CATALOGUE.md`; delivery is a catalogue item, not its own table. It was never applied, so deleting the file removes it cleanly.
- Gaps at `0061` and `0067` are harmless. **Collisions are not.** Leave the gaps; do not renumber anything that has already been applied.
- Confirm the website repo does not still hold its own copy of the dedupe migration under a different number. If it does, delete the duplicate and keep one canonical file in the app repo, which is where migration history lives.

---

## 2. Apply the de-duplication migration

I have read `0068_contacts_dedupe.sql` and it is safe to run: no `delete from contacts`, no dropped
tables or columns, losers are marked `merged_into_contact_id` rather than removed, `merge_contacts()`
re-points foreign keys dynamically from `pg_constraint` (so it cannot miss a referencing table), and
consent is combined with AND — **most restrictive wins**, which is correct.

Apply it through the Supabase SQL editor, then:

### 2a. Normalise and detect — dry run first

```
node scripts/normalise-and-dedupe-contacts.mjs --dry-run
```

Report: how many phone numbers normalised to E.164, how many could not be, how many auto-merge
pairs, how many queued for review.

**Expected: roughly 9 auto-merges.** These three must land in the review queue and must **not** be
auto-merged — if they are, the confidence rules are wrong and need fixing rather than special-casing:

- **Anneke Lange** — `annekelange7@gmail.com` vs `annekelange7@gamil.com`
- **Doug Andrew** — `dougandrew@andreafrica.co.za` vs `dougandrew@andrewafrica.co.za`
- **Felicia / "Lovey"** — two different names sharing `felicia03@rocketmail.com`

That last pair is the reason a shared email is treated as evidence and not proof. Families and
businesses share addresses; merging on a match alone would fuse two real people and take one of
their dogs, quotes and contracts with them.

### 2b. Then run it for real

Wrap writes in `pause_audit('contact de-duplication')` / `resume_audit()`, with the resume in a
`finally` so auditing cannot be left off if the script throws.

Afterwards report:

- `select count(*) from contacts` — **must still be 244.** Nothing is deleted.
- `select count(*) from contacts where merged_into_contact_id is null` — should be about 235.
- The three names above still sitting in `contact_duplicate_candidates` with status `open`.

### 2c. Check the UI is now wired

`contacts/actions.ts`, `DuplicatePairCard`, `FlaggedEmailFix` and `contactsActive` were committed
but nothing imports them, because the tables did not exist. Now they do — wire them up:

- `/admin/contacts/duplicates` renders the review queue.
- The flagged-email queue lists the 5 broken addresses. **Sort Nicolas Hohls to the top** — his Litter J puppy goes home on 18 September and we cannot reach him.
- **Every contact list, dropdown and picker in both repos must exclude merged rows** via `contactsActive`. Audit them all; a merged contact reappearing in a picker means a quote sent to a hidden record.

---

## 3. Owner linking — include reserved dogs

`scripts/link-dog-owners.mjs` linked **8 of 121** and wrote 113 to
`scripts/output/link-dog-owners-review.json` (5 ambiguous, 34 no match, 74 no candidate name).

**It only considers `status = 'sold'`.** Litter J's puppies are `reserved`, so the three buyers who
matter most were never candidates — despite having `reserved_for_name` filled in:

- **Josef Kotse** — Puppy 1 (Pink)
- **Jannecke Smit** — Puppy 3 (Gold)
- **Nicolas Hohls** — Puppy 5 (Peach)

All three take delivery on **18 September**.

Change the filter to include `status in ('sold','reserved')`, keep everything else identical —
**exact and normalised name matches only, ambiguity to the review file, never a fuzzy guess written
to the database.** Attaching the wrong owner means sending a stranger someone's health history.

Re-run `--dry-run` first, then for real. Report linked / ambiguous / no-match / no-candidate.

**Run this after step 2, not before.** Several of the ambiguous cases resolve themselves once the
duplicates collapse — Doug Andrew matches two contacts today purely because he exists twice.

Set `ownership_status = 'unknown'` on every newly linked dog. We know who bought it; we do not know
whether they still have it. Only a reply changes that.

---

## Rules

- Nothing in this task sends a message to a client.
- No contact row is ever deleted.
- Never write a fuzzy name match to the database — it goes to the review file.
- `scripts/output/` stays ignored and stays on disk. It contains client names and must not be committed.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify

- [ ] Only one migration file per number; `0068_contacts_dedupe.sql` exists, `0067_delivery_rates.sql` is gone.
- [ ] `contacts` still totals 244 after the merge — no deletions.
- [ ] Anneke Lange, Doug Andrew and Felicia/"Lovey" are `open` in the review queue, not merged.
- [ ] `0733847640` and `+27733847640` both normalise to `+27733847640`.
- [ ] A number that cannot be normalised keeps its raw `phone` and has a null `phone_e164`.
- [ ] Re-running the detector adds no new candidate rows.
- [ ] No contact picker in either repo shows a merged row.
- [ ] Merging a contact with `marketing_opt_in = false` into one with `true` leaves the survivor **false**.
- [ ] After re-running the linker, **Josef Kotse, Jannecke Smit and Nicolas Hohls are linked to their Litter J puppies**.
- [ ] Every newly linked dog has `ownership_status = 'unknown'`.
- [ ] Spot-check ten links by hand against the dog names — no wrong owner attached.
- [ ] Re-running `import-dbp-contacts.mjs --dry-run` still reports 238 and proposes no new rows.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**.
- [ ] App: `npx tsc --noEmit` exits 0.

### Build the commit, not the working tree

```powershell
git clone --no-hardlinks . ../_buildcheck
cd ../_buildcheck; git checkout <commit you are about to push>
npm ci; npx next build
cd ..; Remove-Item -Recurse -Force _buildcheck
```

- [ ] The clean checkout builds. A working-tree build cannot see a file missing from the commit.
- [ ] After pushing, report Vercel status. **Do not request GitHub or Vercel authentication** — Matt reads the dashboard.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Push both, then `git log origin/main -1` in each and confirm it matches `HEAD`.

Then move to `CURSOR_PROMPT_QUOTE_CATALOGUE.md`.

Do not modify (committing is fine): `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/lib/issues/capture.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
