# CURSOR PROMPT — Ship what you built, and reconcile the migration ledger

The security work is written and it is good. **None of the last four commits is deployed**, one live
fix exists in no migration file, and three migration files were applied by hand outside the runner.
This task is not new features. It is making the state on disk, the state in git, and the state on the
live database agree with each other.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.

---

## Verified state as of 18 Aug 2026 — start from these facts

| | Website | App |
|---|---|---|
| `HEAD` | `7a63e77` "Write the 2am restore runbook…" | `2fd4756` (same subject) |
| `origin/main` | `af1ef1e` "Deny framing of the portal…" | `a9766a5` "Let the gallery dog picker…" |
| **Unpushed commits** | **4** | **3** |
| Uncommitted files | **276** | — |

**Everything in those seven commits is invisible to the world**: the restore runbook, gitleaks in CI,
security-event logging, password re-authentication, and the bot and crawler defence.

**This is the third time this has happened.** On 10 Aug it cost a full morning; the `src/lib/errors/`
modules, migration 0074 and the corrected Elite Developed content all went the same way.
**Committing is not shipping.** The task is not done when `git commit` returns — it is done when
`git log origin/main -1` matches `HEAD` and Vercel has finished building.

---

## 1 · Capture the live trigger fix — nothing else matters until this is done

`trg_rate_limit_insert` was rewritten **directly on the live database** and exists in **no migration
file**. If migrations are ever replayed, the broken version returns and the contact form and
application form go down again.

The live version reads the field as `coalesce(to_jsonb(new) ->> 'code', '') like 'SECURITY_%'`
instead of `new.code`, because `new.code` exists only on `error_events` and **SQL boolean `AND` does
not short-circuit** — so the expression failed to resolve on the other three tables and aborted every
insert.

Write it as a new migration. **Carry the explanatory comment into the file.** The broken form reads
as correct, and without the comment the next person who tidies this function will put it back.

`select prosrc from pg_proc where proname = 'trg_rate_limit_insert'` gives you the exact live body.
**Copy it — do not rewrite it from memory.**

## 2 · Reconcile the migration ledger

`supabase_migrations.schema_migrations` ends at `dog_media_sort_order`. These three files exist on
disk and their effects **are live**, but the runner has no record of them:

- `0095_storage_listing_and_upload_scope.sql`
- `0095b_drop_public_media_list.sql`
- `0096_signed_unsubscribe_tokens.sql`

Someone applied them by hand. **A future `supabase db push` will try to apply them again** and fail
on "policy already exists", in the middle of some unrelated deploy.

For each one: confirm the file's content matches what is actually live, make it idempotent
(`drop policy if exists` before `create policy`, `create or replace` for functions), then record it
in the ledger. **Do not re-run the SQL blindly against production.**

Report which of the three differed from the live state, if any. **A file that does not match the
database it claims to describe is worse than no file.**

## 3 · Explain the 0094 gap

Numbering skips from `0093` to `0095`. Either a migration was written and deleted, or the number was
skipped. **Say which.** If something was dropped, name it. A missing security migration that everyone
assumes exists is the kind of thing nobody discovers until it matters.

## 4 · The 276 uncommitted files — sort them, do not sweep them

`.env.example`, `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `eslint.config.mjs`,
`next.config.ts`, `package.json`, `postcss.config.mjs` and 267 others are modified.

**Do not `git add .`.** Line-ending churn has previously turned a handful of real edits into hundreds
of phantom ones, and a real change hidden among 270 whitespace diffs gets reviewed by nobody.

1. Run `git diff --stat` and `git diff --ignore-all-space --stat`. **The difference between those two numbers is the noise.** Report both.
2. If the gap is large, fix it once and properly: set `* text=auto eol=lf` in `.gitattributes`, run `git add --renormalize .`, and commit that **on its own** with a message saying exactly what it is.
3. Commit the genuinely changed files separately, grouped by what they do.

**Never mix a normalisation commit with a content commit.** One of them is unreviewable, and it will
be the one that mattered.

## 5 · Push both repos, then prove it

```powershell
git push origin main
git log origin/main -1
git log HEAD -1
```

The last two must print the same hash. **Paste both, for both repos.**

Then wait for Vercel and confirm the deployment succeeded. **Do not request GitHub or Vercel
authentication — Matt reads the dashboard.** If a build fails, the task is not finished; fix it and
push again.

## 6 · The app side of Phases 1–3 is still unverified

I verified the website. The app was never checked. For `diedericks-dobermanns`:

- **The refusal message.** The app posts to the same database, so the rate-limit triggers already cover it — but confirm the app **catches the `P0001` error and shows the friendly message with the WhatsApp fallback**, not a raw Postgres string. A buyer who sees `record "new" has no field…` is a buyer who leaves.
- Magic-byte and size validation on app uploads.
- Honeypot and minimum fill time on the app's application flow.
- The `/admin/security` summary.

`ls` each file and paste the output. **Do not rely on grep — it has returned false negatives on this filesystem.**

---

## Rules

- Copy the live function body; do not rewrite it.
- Migrations are idempotent — they are already applied.
- Normalisation commits never contain content changes.
- Never revoke `EXECUTE` on `is_admin()` or `is_trainer_or_above()`.
- Done means `origin/main` matches `HEAD` **and** Vercel is green.
- No file over 300 lines. Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output for every line

- [ ] The trigger fix is in a new migration, with the comment. Applying it to the live database changes nothing.
- [ ] Its body matches `pg_get_functiondef` on the live database — diff them.
- [ ] As `anon`: 5 enquiries succeed, the 6th is refused with the friendly message. Paste all six.
- [ ] As `anon`: 3 applications succeed, the 4th is refused. Paste all four.
- [ ] `0095`, `0095b` and `0096` are idempotent, recorded in the ledger, and you have said whether any differed from live.
- [ ] The 0094 gap is explained.
- [ ] `git diff --stat` and `git diff --ignore-all-space --stat` totals, both pasted.
- [ ] Normalisation, if needed, is its own commit.
- [ ] **`git log origin/main -1` equals `git log HEAD -1` in BOTH repos. Paste all four hashes.**
- [ ] Vercel build succeeded — state the deployment status.
- [ ] `curl -I https://www.diedericksdobermanns.com` returns all five security headers **from the live site**, not from `next.config.ts`. Paste the response.
- [ ] `/admin/security` loads on the live site.
- [ ] Public site, gallery and a client portal all still load after deploy.
- [ ] Each app-side item exists — `ls` and paste.
- [ ] The app shows the friendly refusal, not a raw database error.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. App: `npx tsc --noEmit` exits 0.

## Commit

Two repos. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the **parent** folder.
Separate commits for: the trigger migration, ledger reconciliation, normalisation, content changes,
app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
