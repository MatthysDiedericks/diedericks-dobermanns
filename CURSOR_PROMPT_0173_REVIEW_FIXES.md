# Cursor Prompt — Three fixes from the 0173 review

Small, surgical. Do not redesign anything. Both repos: `diedericks-dobermanns` and `diedericksdobermann-web`.

---

## Already done — do not redo

`notify pgrst, 'reload schema';` has **already been appended** to `0173_document_categories.sql` in both repos, as a new section 4 with a comment block. It was missing, and without it the new `document_categories` table would be invisible to the API — the same PGRST204 failure that killed two days of applications on 8–10 Sep.

**Do not add it a second time and do not move it.** If you see it at the bottom of both files, that is correct. Confirm the two files are still byte-identical after your changes.

---

## Fix 1 — Trim the grant on `document_categories`

Line 44 of `0173` currently reads:

```sql
grant select on public.document_categories to anon, authenticated;
grant insert, update, delete on public.document_categories to authenticated;
```

The second line was not asked for. Row-level security still restricts writes to admins, so this is not an open door — but it is a widening nobody requested, and least privilege is the rule on this project. **Delete the second line.**

Admins write to this table through the admin client, which uses the service role and is not subject to table grants. Nothing breaks.

If you believe something in the codebase genuinely needs `authenticated` to insert into `document_categories`, **say so and name the file** rather than leaving the grant in quietly.

---

## Fix 2 — Stop duplicate migration numbers happening again

There are currently **two migrations numbered 0171** in both repos:

- `0171_receipts_bucket.sql`
- `0171_dogs_anon_grant_listing_columns.sql`

Their run order is undefined.

**Do not rename either file.** The live migration history in `supabase_migrations.schema_migrations` is keyed on timestamps, not on these `0NNN` numbers, so renaming an already-applied file risks it being re-applied later by a bulk run. That is a worse failure than the ambiguity.

Instead:

**2a.** Add a one-line comment at the top of each of the two 0171 files recording the real order they were applied in. Check `supabase_migrations.schema_migrations` for the truth — `receipts_bucket_and_policies` is recorded as `20260909161932`. Note the other one's actual state honestly, including "not found in history" if that is what you find.

**2b.** Add `scripts/check-migration-numbers.mjs` that reads both `supabase/migrations` folders and **fails** if:

- the same `0NNN` prefix appears twice in one folder, or
- a file exists in one repo and not the other, or
- two files with the same name differ in content.

Wire it into `scripts/check-parity.mjs` the same way `check-document-categories.mjs` is wired (the `spawnSync` block near line 233), so it runs wherever parity runs. **Exempt the existing 0171 pair** with a named allow-list entry and a comment saying why, so the guard goes green today and catches the next one.

That last rule — same name, different content — is worth more than the other two. Two repos holding one database has already drifted once on this project.

---

## Fix 3 — Website has no way to run the checks

`diedericksdobermann-web/package.json` has no `parity` script, so `check-parity.mjs` and the two guards never run from the website repo. Meanwhile `diedericksdobermann-web/scripts/` holds its own copies of `check-parity.mjs` and `check-document-categories.mjs` that nothing invokes.

Pick one and say which you did:

- **Preferred:** add `"parity": "node ../scripts/check-parity.mjs --strict"` to the website's `package.json`, matching the app repo, and **delete** the two unused copies in `diedericksdobermann-web/scripts/`. One script, one place.
- If the website is ever built outside the workspace folder and `../scripts` would not resolve, say so and keep the local copies — but then they must be kept identical, and the Fix 2b guard must cover them too.

---

## Deploy order — put this in your final message to Matt

The new code reads `document_categories`, and that table does not exist on the live database yet.

**Migration first, deploy second.** If the code ships before `0173` is applied, every document picker in the app and on the website loads empty. It fails softly rather than crashing, but it is unusable.

Matt applies the migration. Do not apply it yourself.

---

## Report — real output, not descriptions

1. The grant block in `0173` after your edit — paste the three lines around it.
2. `notify pgrst, 'reload schema';` still present exactly once at the bottom of both copies. Paste the last 8 lines of each.
3. `0173` byte-identical across both repos — SHA-256 of each and `git diff --no-index` exit code.
4. `node scripts/check-migration-numbers.mjs` output — must exit 0 with the 0171 pair allow-listed.
5. `node scripts/check-parity.mjs --strict` output showing **both** guards running and passing.
6. Which option you took for Fix 3, and the list of files you deleted.
7. `npx tsc --noEmit` clean in both repos.
