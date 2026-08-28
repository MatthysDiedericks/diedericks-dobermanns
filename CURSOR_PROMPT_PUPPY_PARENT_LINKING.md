# CURSOR PROMPT — A puppy must never exist without its sire and dam

Every one of the **152 litter-born dogs had `father_id` and `mother_id` NULL** until 25 August 2026.
Only Jazzmine and Bruce had parents, because Matt typed them in by hand. The data is backfilled now.
**This prompt is about making sure it never happens again.**

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Verified live — read before planning

- `dogs.father_id` and `dogs.mother_id` both exist, both `ON DELETE SET NULL`.
- **No code in either repo creates puppies from a litter.** `grep` for `from('dogs').insert` returns exactly two hits: `diedericks-dobermanns/lib/breeding/seed.ts:290` (the D/C Son bridge-sire seed, which *does* set both parents) and the generic `lib/dogs/mutations.ts`. The 152 rows came from a one-off import script.
- So a puppy is created today **through the ordinary dog form**, where nothing prompts for parents and nothing infers them.
- Backfill already applied, guarded on `sire.sex='male'` / `dam.sex='female'` / no self-reference. Cycle check returned **0**.
- Resulting progeny: Hunter-King 80 · Dharka 51 · Cyrus 37 · Claire 30 · Odessa 22 · Cuba 19 · Hailey 18 · Cait 15 · Manchester 14 · Hannah 12 · Santini 10 · Cendra 2.

---

## 1 · Fix it in the database, not in a form handler

**Write a `BEFORE INSERT OR UPDATE` trigger on `dogs`.** When `litter_id` is set and a parent is
null, fill it from `litters.father_id` / `litters.mother_id`.

This is deliberately not a UI fix. A form handler only protects the one screen you remember to
change; there are two repos, an import script, a seed script and a Supabase table editor, and the
last four all bypass any React code you write. **A trigger is the only place that catches every
writer.**

Rules the trigger must hold to:

- Only fills a **null** parent. Never overwrites a value someone set deliberately — an outside stud whose litter record is approximate must stay as entered.
- Only assigns a sire that is `sex='male'` and a dam that is `sex='female'`. A litter with a mis-sexed parent gets **nothing**, silently — never a wrong parent.
- Never sets a dog as its own parent.
- **Do not attempt full cycle detection in the trigger.** It is expensive on every write and the sex + self-reference guards already make a cycle practically impossible. Put the cycle check in the verification query instead.
- `SECURITY DEFINER` is **not** needed here — it reads `litters`, which the writer can already read. Do not add it out of habit.

Ship it as a numbered migration in `supabase/migrations/`, and include the backfill statement in the
same migration guarded by `where father_id is null or mother_id is null` so it is a no-op on
production and correct on a fresh database.

## 2 · Show the inherited parents in the form

The trigger fills the value after save, which means the form lies until the page reloads.

- When a litter is selected on the dog form, **immediately show the sire and dam it will inherit** — "Sire: Santini · Dam: Claire (from the litter)" — as read-only text, not as pre-filled inputs someone can half-edit.
- Allow an override, clearly marked, for the rare puppy whose parentage differs from its litter record.
- Where a litter has no parents recorded, say so plainly: *"This litter has no sire or dam recorded — the puppy will have no pedigree until you set them."* That is a real state; three junk `planned` litters in the database have no parents at all.

## 3 · The one place this genuinely matters

`CURSOR_PROMPT_PUPPY_PROFILE.md` resolves a puppy's four-generation pedigree **through its sire and
dam**, because a puppy never gets its own `pedigree_ancestors` rows. With null parents that page
renders empty for every puppy — on the screen a buyer most wants to read.

After this change, confirm the puppy profile actually resolves. That is the proof, not the trigger
firing.

## 4 · Surface the gap so it cannot rot again

Add a small admin data-health line — on the dashboard or the breeding stock page:

```
3 dogs have a litter but no sire or dam    Fix
```

Zero today. If it is ever not zero, something bypassed the trigger and Matt should know within a day,
not in eight months.

---

## The app

- Same trigger — it is server-side, so nothing to duplicate. **Do not write a second copy of this logic in TypeScript.**
- Same inherited-parents display on the app's dog form.
- Same data-health count on the app admin dashboard.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**

## Rules

- The fix lives in a database trigger. No duplicated TypeScript logic.
- Only fills nulls; never overwrites.
- Sex-checked and self-reference-checked; a bad litter yields no parent rather than a wrong one.
- No cycle detection inside the trigger.
- Migration is idempotent and safe to run on production.
- No file over 300 lines. Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output, not descriptions

- [ ] Migration applied. Paste `select tgname from pg_trigger where tgrelid='public.dogs'::regclass`.
- [ ] Insert a test puppy with only `litter_id` set on the Claire × Santini litter. It comes back with **Santini** and **Claire**. Paste the row, then delete it.
- [ ] Insert a puppy with `father_id` set to a **different** dog. The trigger leaves it alone. Paste the row.
- [ ] Create a litter whose "sire" is female, add a puppy — **no parent is assigned**, and nothing errors. Paste the row.
- [ ] `select count(*) from dogs d join litters l on l.id=d.litter_id where d.father_id is null or d.mother_id is null` returns **0**.
- [ ] Cycle check returns 0 — run the recursive ancestor query and paste it.
- [ ] Progeny counts are unchanged from the list in this prompt. Paste the query.
- [ ] The dog form shows the inherited sire and dam as soon as a litter is picked. Screenshot.
- [ ] A litter with no parents shows the plain warning, not a blank.
- [ ] **Opening a Claire × Santini puppy renders a four-generation pedigree.** Paste the ancestor count — expect **22 + 30**. This is the whole point.
- [ ] The data-health line reads 0.
- [ ] App: same form behaviour and same count. Say which device.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. App: `npx tsc --noEmit` exits 0.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] `git status --porcelain` is empty. **The website currently has 360 uncommitted files and the app 775 — including a documents fix that is why documents show nothing in production. Do not add to that pile.**
- [ ] Vercel reaches **Ready** — paste the deployment id.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: the migration and trigger, the form display, the data-health
count, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
