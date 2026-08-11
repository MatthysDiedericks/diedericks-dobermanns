# PARITY PROMPT 6 — Remaining screens (split into three runs)

The last of the app-only screens, plus the three website-only screens that need mirroring
back into the app. **Do not attempt all of this in one Cursor run** — split at the marked
points. The largest change set so far was 69 files; past that, review quality collapses and
partial change sets start shipping.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns`.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Brand: bg `#111008`, gold `#C4A35A`, Cinzel headings.

---

## RUN A — Health, heats and dog tabs (website)

Mirror from `diedericks-dobermanns/app/(admin)/`:

| App | Website route to create |
|---|---|
| `health/index`, `health/settings` | `admin/(panel)/health`, `health/settings` |
| `heats/index`, `heats/[dogId]/index`, `heats/reference` | `admin/(panel)/heats/[dogId]`, `heats/reference` (list exists) |
| `dogs/[id]/photos` | tab on `admin/(panel)/dogs/[id]` |
| `dogs/[id]/pedigree` | tab on `admin/(panel)/dogs/[id]` |
| `dogs/[id]/story` | tab on `admin/(panel)/dogs/[id]` |
| `dogs/[id]/litter-history` | tab on `admin/(panel)/dogs/[id]` |
| `litters/[id]/edit`, `litters/[id]/register-pups` | `admin/(panel)/litters/[id]/edit`, `register-pups` |
| `waitlist/new` | `admin/(panel)/waitlist/new` |

Notes:

- The dog tabs should be tabs on the existing dog admin page, not separate routes — the web
  has more screen space than the phone; do not copy the phone's navigation shape blindly.
- Health settings drives the vaccination/deworming schedule the client portal already reads.
- Heats reference is static breed data — a good candidate for a shared constant rather than
  two copies.

---

## RUN B — Communications and analytics (website)

| App | Website route |
|---|---|
| `analytics` | `admin/(panel)/analytics` |
| `marketing` | `admin/(panel)/marketing` |
| `broadcast/new` | `admin/(panel)/messaging/broadcast` |
| `notifications` | `admin/(panel)/notifications` |
| `settings/social` | `admin/(panel)/settings/social` |

Notes:

- **Analytics also covers the outstanding visitor-counter request**: Matt asked for a website
  visitor count visible to admin only. Include page views, unique visitors, top pages and
  applications-per-week. If no analytics source exists yet, say so and propose one rather
  than inventing numbers — an analytics screen showing fabricated data is worse than none.
- Broadcast composes to `client_groups`; reuse the group picker from PARITY_3.
- Social settings holds the Instagram/Facebook/WhatsApp links the public footer already reads
  via `getSettings()`.

---

## RUN C — Mirror website-only screens back into the app

These three were built on the website this week and do **not** exist in the app. Parity runs
both ways.

| Website | App route to create |
|---|---|
| `admin/dogs/unallocated` | `app/(admin)/dogs/unallocated.tsx` |
| `admin/media/pending` | `app/(admin)/media/pending.tsx` |
| `admin/training/journey/[dogId]` | `app/(admin)/training/journey/[dogId].tsx` |

Notes:

- Media review must keep the **server-side consent check**: an item uploaded by a client with
  `client_consent = false` cannot be published. Do not rely on the UI disabling the button.
- The allocate action must write **both** `dogs.owner_id` and a confirmed `reservations` row,
  matching `allocation-actions.ts` — the RLS ownership check reads both paths.
- Journey editor writes `training_logs` + `training_log_media` with the per-entry `is_public`
  toggle.

---

## Rules for all three runs

- `requireAdmin()` in every admin server action; return `{ error }`, never throw.
- **Never widen or revoke an RLS policy to make a screen work.** Revoking EXECUTE on a
  function used by a policy took the public site down for ~7 hours on 4 Aug. If a query
  returns nothing, fix the query or the data.
- Do not use `createAdminClient()` in portal routes.
- No file over 300 lines. Loading, empty and populated states everywhere.
- Regenerate types after any schema change, in the repo you changed.
- `npx tsc --noEmit` and (web) `npx next build` must pass before commit.

## Commit

One commit per run, `git add -A`, from the correct repo root — website root is
`diedericksdobermann-web/`, app root is the **parent** folder. Confirm
`git ls-files --others --exclude-standard src/` (or `diedericks-dobermanns/`) is empty first.

## After RUN C

Parity is closed. From then on the standing rule applies: **a feature is not done until it
exists on both surfaces**, and every prompt names screens in both repos.
