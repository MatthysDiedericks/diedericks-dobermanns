# CURSOR PROMPT — Make captured errors investigable

The error capture fired for the first time this morning and produced a report nobody can act on.

```
/admin · captured · ×2 · 17 Aug 2026
"An error occurred in the Server Components render. The specific message is
 omitted in production builds to avoid leaking sensitive details. A digest
 property is included on this error instance which may provide additional details."
```

That text is Next.js telling us **where the real message is** — in the `digest` property. **The
capture did not record it.** So there is an alert, an email, an entry on `/admin/issues`, and no
way to find out what actually broke.

I checked the database: **no Postgres errors** in that window. It is in the page code, not a query.
`/admin` renders `fetchDashboardData()`, `DashboardWidgets` and the newly added `ErrorHealthStrip`.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## 1. Capture the digest — this is the whole point

`error.digest` is the only key that matches a Vercel log line to a captured report. Without it the
capture is a smoke alarm with no address on it.

Migration (check the folder, take the next free number):

```sql
alter table public.issue_reports add column if not exists digest text;
alter table public.error_events  add column if not exists digest text;

create index if not exists issue_reports_digest_idx on public.issue_reports(digest) where digest is not null;
create index if not exists error_events_digest_idx  on public.error_events(digest)  where digest is not null;

comment on column public.issue_reports.digest is
  'Next.js error digest. The only key that matches this report to the Vercel log line holding the real message.';
```

**Apply the migration and confirm the columns exist in the live database before reporting done.**
Migration 0074 was written and deployed but never applied earlier this week, and the quote builder
would have failed on first save.

Record it in `src/app/admin/(panel)/error.tsx`, `src/app/portal/(panel)/error.tsx`, and the new
boundaries below. Include it in the **fingerprint** so two occurrences of the same underlying fault
group together instead of stacking up as separate reports.

## 2. There is no error boundary on the public site

Only `admin/(panel)` and `portal/(panel)` have one. **Every public page — home, dogs, litters,
apply, contact — has none.** A visitor who hits an error gets the raw Next.js error screen, and
nothing is recorded. That is the audience least likely to tell us and most likely to leave.

Add:

- `src/app/error.tsx` — branded, calm, offers "try again" and a link home, and shows the WhatsApp contact from `app_settings.contact_whatsapp`.
- `src/app/global-error.tsx` — the last resort when the layout itself fails. Minimal inline styles only; it cannot rely on the app's CSS having loaded.

Both capture with the digest. **Never show a stack trace or a raw message to a visitor** — one
apologetic sentence, a way to retry, and a way to reach a human.

## 3. Put the digest where it is needed

- **`/admin/issues`** — show the digest on each captured error with a one-line note: *"Digest `a1b2c3d4` — search this in Vercel → Logs for the full message."* That sentence turns a dead end into a two-minute investigation.
- **The alert email** — include the digest and the path. **An alert that cannot be investigated teaches people to ignore alerts**, which is worse than not sending one.
- **The daily digest email** — group by digest, so "same fault ×14" reads as one problem rather than fourteen.

## 4. Capture more of the context that is already free

At the moment of capture, record what costs nothing and saves the guesswork:

- The route, and whether it was a server or client render.
- The commit SHA from `process.env.VERCEL_GIT_COMMIT_SHA` — **so a report names the deployment that caused it.** Three deploys went out this morning; without this we are guessing which one.
- Whether the user was admin, client or signed out.

**Nothing sensitive.** No request bodies, no cookies, no tokens. The existing rule stands: `detail`
must contain no key matching `/pass|token|secret|otp|key/i`, and the test that enforces it stays.

## 5. While you are here — find this morning's error

`/admin` failed twice at 09:38 and has not recurred. Read the Vercel logs for that window, identify
the fault, and **report what it was before fixing anything**. It may already be resolved by a later
deploy, in which case say so rather than changing code speculatively.

If it is a real fault in `fetchDashboardData()`, `DashboardWidgets` or `ErrorHealthStrip`, fix it
and say which.

---

## The app

`diedericks-dobermanns` has no equivalent of a Next.js digest, but the same principle applies: an
error the user sees must leave a record that names the screen, the app version and the build. Check
the existing error boundary and `lib/errors/logError.ts` capture the screen name and
`expo-constants` version. **The offline queue already built must carry these through.**

---

## Rules

- Every captured error records its digest where the platform provides one.
- No visitor ever sees a stack trace or a raw error message.
- `global-error.tsx` uses inline styles only.
- No credentials, tokens or request bodies in `detail`. The existing test stays green.
- Do not change what triggers an alert — only what an alert contains.
- No file over 300 lines.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify

- [ ] The migration is **applied**, and `select digest from issue_reports limit 1` runs against the live database.
- [ ] Forcing an error on an admin page records a non-null digest.
- [ ] That digest matches the digest shown in the Vercel log line for the same request.
- [ ] Two occurrences of the same fault share a fingerprint and increment `occurrence_count` — they do not create two reports.
- [ ] Forcing an error on a **public** page shows the branded boundary, not the Next.js default, and records a report.
- [ ] `global-error.tsx` renders correctly with the app's stylesheet deliberately broken.
- [ ] No visitor-facing screen shows a stack trace or the raw message.
- [ ] The alert email and `/admin/issues` both show the digest with the "search this in Vercel" line.
- [ ] Each report names the commit SHA of the deployment it happened on.
- [ ] The no-credentials test still passes and still fails when a password field is deliberately added.
- [ ] You have reported what the 09:38 `/admin` error actually was.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**.
- [ ] App: `npx tsc --noEmit` exits 0.

### Build the commit, not the working tree

```powershell
git clone --no-hardlinks . ../_buildcheck
cd ../_buildcheck; git checkout <commit you are about to push>
npm ci; npx next build
cd ..; Remove-Item -Recurse -Force _buildcheck
```

- [ ] The clean checkout builds.
- [ ] After pushing, report Vercel status. **Do not request GitHub or Vercel authentication** — Matt reads the dashboard.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Push both, then `git log origin/main -1` in each and confirm it matches `HEAD`.

Do not modify (committing is fine): `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/components/layout/WhatsAppButton.tsx`,
`scripts/import-dbp-contacts.mjs`.
