# CURSOR PROMPT — Contact de-duplication and phone normalisation

The DogBreederPro import landed 238 contacts cleanly (243 total, no duplicate `source_ref`,
auditing correctly paused and resumed). But the merge logic in `import-dbp-contacts.mjs` had two
defects, and **11 duplicate names and 2 shared emails survived into the table**.

This fixes the data and builds the screen to handle the ones a machine must not decide.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## The two defects, so you fix the cause and not just the symptom

**1. Phone numbers were never normalised.** The importer only stripped punctuation, so
`0733847640` and `+27733847640` — the same South African number — never matched. That is why
**Anneke Lange** is in the table twice.

**2. The merge compared one key per record, not both.** Records were grouped by email *if they
had one*, otherwise by phone. So a record holding an email and a record holding only the matching
phone were never compared to each other. That is **Naomie Muller, Annemarie Kroon, Celeste
England, Corne Janse van Rensburg, Elaine Wise** and **Stefano Peretti**.

---

## The rule that decides what may be merged automatically

**A shared email or phone is evidence, not proof.** `felicia03@rocketmail.com` currently sits on
two different people — Felicia, and a DogBreederPro contact called "Lovey". Families share an
address; a business address is shared by everyone in the business. Merging purely on a matching
contact detail would have silently fused two real people into one, and the loser's dogs, quotes
and contracts would have gone with them.

So: **a match on email or phone puts a pair into the review queue. It is only merged automatically
if the names are also compatible** — identical after normalisation, or one side is a placeholder
(`Unnamed contact`, blank). Everything else waits for a human.

---

## Migration `0059_contacts_dedupe.sql`

**Delete Cursor's `0061_contacts_source_ref_unique.sql`** and fold it into this file — the unique
index already exists on the live database (created by hand today), and 0061 is already assigned to
another pending prompt. Write the index here with `if not exists` so the file remains the honest
record of what is on the database.

```sql
-- Records the partial unique index applied by hand on 11 Aug 2026.
create unique index if not exists contacts_source_ref_key
  on public.contacts (source_ref) where source_ref is not null;

alter table public.contacts
  add column if not exists phone_e164 text,
  add column if not exists whatsapp_e164 text,
  add column if not exists merged_into_contact_id uuid references public.contacts(id) on delete set null,
  add column if not exists merged_at timestamptz,
  add column if not exists merged_by uuid references auth.users(id);

create index if not exists contacts_phone_e164_idx on public.contacts(phone_e164) where phone_e164 is not null;
create index if not exists contacts_merged_idx on public.contacts(merged_into_contact_id) where merged_into_contact_id is not null;

-- A merged record must not point at itself, and a survivor must not be merged.
alter table public.contacts
  add constraint contacts_no_self_merge check (merged_into_contact_id is null or merged_into_contact_id <> id);
```

**Losers are never deleted.** The importer is keyed on `source_ref`; deleting a merged row means
the next run of `import-dbp-contacts.mjs` recreates it and the duplicate is back. A merged row
stays, points at its survivor, and is filtered out of every list.

Add a `contacts_active` view (or a shared query helper — pick one and use it everywhere) that
excludes rows where `merged_into_contact_id is not null`. **Every existing screen that reads
`contacts` must use it.** Find them all; a merged contact reappearing in a dropdown is how someone
sends a quote to the wrong record.

### Duplicate review queue

```sql
create table public.contact_duplicate_candidates (
  id            uuid primary key default gen_random_uuid(),
  contact_a_id  uuid not null references public.contacts(id) on delete cascade,
  contact_b_id  uuid not null references public.contacts(id) on delete cascade,
  match_reason  text not null,        -- 'email' | 'phone' | 'name' | 'name+phone'
  match_detail  text,                 -- the actual shared value
  confidence    text not null check (confidence in ('high','medium','low')),
  status        text not null default 'open'
                  check (status in ('open','merged','not_duplicates')),
  resolved_by   uuid references auth.users(id),
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  constraint contact_dupe_ordered check (contact_a_id < contact_b_id)
);
create unique index contact_duplicate_pair_key
  on public.contact_duplicate_candidates(contact_a_id, contact_b_id);
```

The `contact_a_id < contact_b_id` constraint plus the unique index stops the same pair being
queued twice in opposite order — the detector will run repeatedly and must be idempotent.

`status = 'not_duplicates'` is permanent: once Matt says two people are different, the detector
must never raise that pair again. Two brothers at one farm with one landline will otherwise be
suggested every single run until he stops trusting the screen.

RLS: `is_admin()` for everything on the new table. Add it and `contacts` to `trg_audit`.

---

## `scripts/normalise-and-dedupe-contacts.mjs` (new file)

Do **not** modify `import-dbp-contacts.mjs`. It ran successfully and is the record of that import.
Fix the phone helper there only if you also make it a shared module both scripts import.

### Phone normalisation to E.164

```
+<digits>            → keep as-is
0XXXXXXXXX  (10 digits, SA)      → +27XXXXXXXXX   (drop the leading 0)
27XXXXXXXXX (11 digits)          → +27XXXXXXXXX
7XXXXXXXX   (9 digits, SA mobile)→ +27XXXXXXXXX
268XXXXXXX  (Eswatini)           → +268XXXXXXX
```

Anything that does not fit one of these patterns: **leave `phone_e164` null and keep the raw
value in `phone`.** Do not pad, truncate or guess a country code. A wrong number on a welfare
check-in messages a stranger about a dog they have never owned.

Populate `phone_e164` and `whatsapp_e164` for all 243 rows. Report how many could not be
normalised and list them.

### Detection — union-find across both keys

Build a graph: an edge between two contacts when they share a normalised email **or** a
normalised `phone_e164`. Take connected components. This is what the importer failed to do.

Then for each pair inside a component:

- **Auto-merge (high confidence)** — normalised names are identical, OR one side's name is `Unnamed contact` / blank. Normalise names by lowercasing, collapsing whitespace, stripping punctuation and accents.
- **Queue for review (medium)** — shared email or phone but the names differ.
- **Queue for review (low)** — names match but nothing else does. Same-name strangers exist.

**Name similarity alone never auto-merges.** Two people called Johan van der Merwe with different
numbers are two people.

### Merging

Survivor is the record with the most populated fields; ties broken by the oldest `created_at`.

- Fill any field empty on the survivor from the loser.
- **Never overwrite a populated field.** Where both hold a different non-empty value, keep the survivor's and append the loser's to `notes` as `Also recorded as: …`. Silent loss of a phone number is the thing this whole exercise is meant to prevent.
- Re-point every foreign key to the survivor: check `dogs`, `applications`, `quotes`, `invoices`, `waiting_list`, `contracts`, `client_group_members`, `payments`. **Query `information_schema` for every table referencing `contacts` rather than trusting this list** — miss one and it silently points at a hidden row.
- Set `merged_into_contact_id`, `merged_at`, `merged_by` on the loser.
- Union the `tags` arrays. `marketing_opt_in` and `popia_consent` take the **most restrictive** value of the two — consent is not inherited by being merged into someone.

### Running it

- `--dry-run` prints every proposed auto-merge and every queued pair, and writes nothing.
- Wrap real writes in `pause_audit('contact de-duplication')` / `resume_audit()` with the resume in a `finally`.
- Print a final count: normalised, auto-merged, queued, unresolvable.

### Expected outcome

Roughly **9 auto-merges**: Annemarie Kroon, Celeste England, Corne Janse van Rensburg, Elaine
Wise, Naomie Muller, Stefano Peretti, George Karathanasis (two valid numbers — keep both, the
second goes to notes), Matthys Diedericks (the empty DBP row 89 into the full one), and the two
identical `Matt` app-signup rows.

**Three must land in the review queue and must not be auto-merged:**

- **Anneke Lange** — `annekelange7@gmail.com` vs `annekelange7@gamil.com`
- **Doug Andrew** — `dougandrew@andreafrica.co.za` vs `dougandrew@andrewafrica.co.za`
- **Felicia / "Lovey"** — both on `felicia03@rocketmail.com`, different names

If the script auto-merges any of those three, the confidence rules are wrong — fix them rather
than special-casing the names.

---

## Website — `/admin/contacts/duplicates`

Side-by-side comparison, highest confidence first. Each field on both records shown in a row, with
differences highlighted in gold.

- **Merge** — radio per field to choose the surviving value, defaulting to the fuller record. Show plainly what will move: *"3 dogs, 1 quote and 2 documents will move to this record."* Count them before showing the button, not after pressing it.
- **Not duplicates** — permanent, never suggested again.
- **Skip** — leaves it open.
- Merging is **not reversible through the UI**. Say so on the confirm step. The data survives in the merged row and the audit log, but recovering it is a database job, and the person clicking should know that before they click.

Also add a **flagged-email queue** on the contacts list for the 5 broken addresses the import kept
in `notes`: Liezel Van Eden, Steve Elmes, Nicolas Hohls, Alet Jonker, Carina Le Roux. Show the raw
DogBreederPro value, let Matt type the correct address, and clear the `NEEDS CHECKING` note on
save. **Nicolas Hohls is one of the three Litter J buyers** — his puppy goes home on 18 September,
so his address is needed soon. Sort him to the top.

Badge on the contacts page: *"3 possible duplicates · 5 emails to check"*.

## App — `diedericks-dobermanns`

Merging is a desk job; the screen for it belongs on the website. In the app:

- Show the duplicate and flagged-email counts on the contacts screen, linking to a read-only list so Matt can see what is waiting.
- **Fixing a flagged email must work on the phone** — it is one field, he will do it standing in a kennel, and it unblocks a handover.
- Every contact list and picker in the app must exclude merged rows. Audit them all; this is the parity check that matters.

---

## Rules

- `requireAdmin()` on every page and action here. Contact merging is destructive and admin-only.
- Never `createAdminClient()` outside admin routes.
- Never delete a contact row in this feature.
- Never guess an email address or a country code.
- Consent fields take the most restrictive value on merge.
- No file over 300 lines.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify

- [ ] `--dry-run` writes nothing and lists every proposed merge.
- [ ] After the real run, `select count(*) from contacts where merged_into_contact_id is null` is about 234, and **no row was deleted** — total stays 243.
- [ ] Anneke Lange, Doug Andrew and Felicia/"Lovey" are in the review queue, not merged.
- [ ] `0733847640` and `+27733847640` both normalise to `+27733847640`.
- [ ] A number that cannot be normalised keeps its raw `phone` and has a null `phone_e164`.
- [ ] Re-running the detector creates no new candidate rows and no duplicate pairs.
- [ ] A pair marked `not_duplicates` is never raised again.
- [ ] Merging moves every foreign key — verify by counting each referencing table before and after; nothing may end up pointing at a merged row.
- [ ] Merging a contact with `marketing_opt_in = false` into one with `true` leaves the survivor `false`.
- [ ] No contact list, dropdown or picker in **either** repo shows a merged row. Check every one.
- [ ] Re-running `import-dbp-contacts.mjs --dry-run` after all this still reports 238 and proposes no new rows.
- [ ] Fixing a flagged email clears the `NEEDS CHECKING` note and leaves the rest of the note intact.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds** — build, not just types.
- [ ] App: `npx tsc --noEmit` exits 0, and `types/database.types.ts` is roughly its previous size, not double.

## Commit

Two repos, two commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Push both, then `git log origin/main -1` in each and confirm it matches `HEAD`.

Do not touch `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/lib/issues/capture.ts`,
`src/components/layout/WhatsAppButton.tsx`, or `scripts/import-dbp-contacts.mjs`.
