# CURSOR PROMPT — Where applications come from, and closing the doors behind them

Two jobs that share one migration. **Part 3 is the one that matters most** — the form that takes
names, addresses, ID numbers and uploaded documents currently has no rate limit and no bot defence.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Currency ZAR.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Read this before you design anything

I checked the live database. These are facts, not assumptions:

- `applications` **already has `country` and `city`** — those are the applicant's *stated* address. **Do not reuse them.** Detected location goes in new columns, and the difference between the two is the whole point.
- `error_events`, `audit_log` and `application_events` **already exist.** Log into them. Do not create a fourth event table.
- `page_views` has `path`, `referrer_host`, `visitor_hash`, `country`, `is_bot`, `viewed_on`, `created_at`. `visitor_hash` **rotates daily by design** — see `src/lib/analytics/visitorHash.ts`, which carries a comment telling you not to "fix" it. Leave it alone.
- Public buckets: **`dog-media`, `gallery`, `training-videos`.** Private: `documents`, `litter-media`, `broadcasts`, `contract-signatures`.
- There is **no rate-limit table anywhere.**

---

# PART 1 · Where the application actually came from

## 1.1 Detected location — free, already in the request

Vercel's edge attaches these to every request. Read them in the submit action:

```
x-vercel-ip-country          →  detected_country
x-vercel-ip-country-region   →  detected_region
x-vercel-ip-city             →  detected_city
```

New nullable columns on `applications`: `detected_country`, `detected_region`, `detected_city`.

**Never overwrite `country` or `city`.** Those are what the applicant told us. These are what the
network says. Two different claims, and holding both is the only reason this is worth storing.

Show both on the admin review screen, side by side, and flag a mismatch **quietly**:

```
Stated:    Pretoria, Gauteng, ZA
Detected:  Lagos, LA, NG          ⚠ location mismatch
```

**A mismatch is a question, not a verdict.** Mobile networks resolve to the carrier's hub, not the
person — someone in Nelspruit on a mobile can land in Johannesburg. VPNs put them anywhere. Word the
flag as *"worth asking about"*, never as *"suspicious"*. If this screen ever makes Matt reject a
real buyer who happened to be travelling, it has done more harm than the fraud it was built for.

## 1.2 Marketing source — the more valuable half

Capture on **first landing**, not at submit. By the time someone reaches the form the referrer is
your own site, which tells you nothing.

On first page load, if no attribution is stored yet, write to `sessionStorage`:

```ts
{ utm_source, utm_medium, utm_campaign, utm_content, referrer_host, landing_path, first_seen_at }
```

**First touch wins.** If a value is already stored, do not overwrite it — someone who arrives from
Instagram, leaves, and returns via Google was won by Instagram. Last-touch attribution would credit
the search and quietly teach Matt to stop posting.

Carry it into the submit payload. New columns: `utm_source`, `utm_medium`, `utm_campaign`,
`utm_content`, `referrer_host`, `landing_path`.

Then build **`/admin/analytics/sources`**: applications grouped by source and campaign, and — this is
the number worth having — **how many of each went on to pay a deposit.** Join through
`waiting_list.deposit_paid_date`.

**Applications are vanity; deposits are the business.** A campaign producing thirty applications and
no deposits is worse than one producing four applications and two deposits, and only this table will
show it.

## 1.3 Duplicate detection — a hash, never a raw IP

`submission_fingerprint text` — a SHA-256 of `IP + user-agent + a dedicated salt`.

- New env var **`FINGERPRINT_SALT`**, server-only. **Not** `NEXT_PUBLIC_`, and **not** `ANALYTICS_SALT`.
- **This salt does not rotate daily.** Analytics rotates its salt so people cannot be followed across days; this one must stay stable or it cannot answer the one question it exists for — *did these six applications come from the same machine?* Different purpose, different salt, and the reason goes in a comment above it.
- **Store no raw IP address anywhere** — not in a column, not in a log line, not in `error_events`. A hash answers the duplicate question completely; the raw address adds nothing but liability.

On the admin review screen, if a fingerprint has been seen before:
*"3 other applications share this device signature — view them."*

## 1.4 Retention — set it now, not later

Detected location, attribution and fingerprint auto-purge after **12 months** via a scheduled
function that nulls those columns on older rows. The application itself stays.

Add the purge in the same migration. **Retention added later never gets added** — it becomes an
open-ended store of personal data attached to named people, which is exactly what POPIA asks about.

Matt has not had this reviewed by a lawyer. Keep the footprint small enough that it does not need
to be: coarse location, marketing tags, one hash, twelve months.

**Update the privacy policy in the same commit.** One short paragraph: what is collected at
application, why (fraud screening and knowing which adverts work), and how long it is kept.
Collecting it without saying so is the actual exposure here, not the data itself.

---

# PART 2 · The application funnel

Six steps, and people are dropping out of them. Nobody knows where.

Use the existing **`application_events`** table. On each step transition write
`step_reached` with the step number and a client-generated `draft_id` that survives a refresh.
No new table.

**`/admin/analytics/funnel`** — for each step: entered, completed, abandoned, median time spent.

```
Step 1  Personal          100 entered   94 continued
Step 2  Home & children    94 entered   71 continued   ← 23 lost here
Step 3  Experience         71 entered   68 continued
```

**The biggest drop is the deliverable.** If Step 2 loses a quarter of applicants, that is a form
problem Matt can fix in an afternoon, and it is worth more than every other number on this page.

Also add, from the existing `page_views` data and requiring no new tracking: within a single day,
order a `visitor_hash`'s views by `created_at` to reconstruct the path taken and the gap between
pages. Show top entry pages, top exit pages, and most-viewed dog profiles.

**State the limitation on screen:** the last page of a session has no following timestamp, so its
duration is unknown and it is excluded, not counted as zero. A silently-wrong average is worse than
an absent one.

---

# PART 3 · Hardening — do this part properly

## 3.1 Rate limiting, at the database

`applications`, `enquiries`, `contact` and portal sign-in have **no limit of any kind**. One script
can file ten thousand applications tonight, and each one can carry file uploads.

**Put the limit in Postgres, not only in middleware.** Supabase exposes PostgREST directly — anything
enforced only in a Next.js route is bypassed by posting straight to the API. Edge middleware is a
convenience layer; the database is the control.

```sql
create table public.rate_limit_buckets (
  key text primary key,              -- sha256(fingerprint || ':' || action), never a raw IP
  action text not null,
  window_start timestamptz not null default now(),
  hit_count int not null default 1,
  blocked_until timestamptz
);
```

A `SECURITY DEFINER` function `check_rate_limit(action, key, max_hits, window_seconds)` returns
allow/deny and is called from the insert path.

Limits — deliberately generous, because a blocked real buyer costs more than a spam row:

| Action | Limit |
|---|---|
| Application submit | 3 per hour, 5 per day |
| Enquiry / contact | 5 per hour |
| Portal sign-in failure | 10 per 15 min, then 15 min lockout |
| Document upload | 20 per hour |

**Deny returns a calm message with a way through** — *"Too many attempts. Try again in 12 minutes,
or WhatsApp us on …"* A genuine buyer who hits the limit must never reach a dead end.

**`GRANT EXECUTE` to `anon` and `authenticated`. Do not revoke from `PUBLIC`.** Revoking EXECUTE from
PUBLIC on a function used in an RLS path took this site down for 6.7 hours in July. Grant, never
revoke.

## 3.2 Bots on the public forms

- **Honeypot field** — visually hidden, never labelled "honeypot" in the DOM. Filled means bot; drop it silently with a 200 so the bot cannot learn. Never show a human an error for this.
- **Minimum fill time** — a six-step application completed in under 15 seconds is not a person.
- **`is_bot` on `page_views` is already there.** Exclude bots from every analytics figure. Your image-optimization quota went over 5K this month; some of that is crawlers, and the funnel numbers are wrong until they are filtered out.

**No CAPTCHA.** It is a tax on real buyers, and this is a premium brand.

## 3.3 Close the public buckets

`dog-media`, `gallery` and `training-videos` are public. Public reads are correct and intended.
**Public *listing* is not.**

Enumerating a bucket exposes every filename, including anything uploaded to the wrong place. Add a
storage policy allowing `select` on individual objects but **denying `list` to `anon`**.

Verify by actually trying it as `anon` — do not read the policy and assume.

## 3.4 Uploads

Applicants upload documents. Currently that means a form on the public internet writing files into
your storage.

- **Whitelist**: `pdf, jpg, jpeg, png, webp, heic`. Reject everything else — never blacklist.
- **Check magic bytes, not the extension.** A `.pdf` extension proves nothing.
- **10 MB per file, 5 files per application.**
- Store under `applications/{application_id}/{uuid}.{ext}` — **never the user-supplied filename.** Path traversal and script-named files both die here.
- The `documents` bucket stays private and served through signed URLs only.

## 3.5 Headers

`next.config.ts` — if any are already set, extend rather than replace:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

There is an existing CSP. **Do not loosen it.** If something breaks, fix the source.

## 3.6 Two things only Matt can do — list them at the end of your reply

1. **Enable leaked-password protection** — Supabase Dashboard → Authentication → Policies. Two minutes. Open since 31 July. Portal accounts hold contracts and ID documents.
2. **`felicia03@rocketmail.com` holds `admin`.** Confirm that is intended, or drop it to `client`.

## 3.7 Log the attempts

Blocks, honeypot catches, rate-limit denials, rejected uploads and fingerprint collisions all write
to the existing **`error_events`** with a `SECURITY_` code prefix.

**An attack you cannot see is an attack you cannot answer.** One admin panel, newest first.

---

## The app

Same rules, no exceptions — the app posts to the same database, so a limit enforced only on the
website is not a limit.

- Application submit goes through the same `check_rate_limit`.
- Same upload whitelist, size cap and magic-byte check.
- Admin screens: sources, funnel and the security log, **read-only summaries**. Drill-through and CSV stay on the website.
- Detected location on the app's application review screen, with the same mismatch flag and the same careful wording.

---

## Rules

- Raw IP addresses are never stored, logged or written to any table.
- `FINGERPRINT_SALT` is separate from `ANALYTICS_SALT` and does not rotate. Server-only.
- Detected location never overwrites stated location.
- First-touch attribution. Never overwrite an existing value.
- Rate limits live in the database, not only in middleware.
- **Grant EXECUTE, never revoke from PUBLIC.**
- A blocked human always gets a way through.
- Bots excluded from every analytics figure.
- No file over 300 lines. `requireAdmin()` on every admin route.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste command output, not descriptions

- [ ] A submitted application stores `detected_country/region/city` **and leaves `country`/`city` untouched** — show the row.
- [ ] Arriving via `?utm_source=instagram&utm_campaign=santini`, browsing three pages, then applying stores `instagram` — not `diedericksdobermanns.com`.
- [ ] Returning later from Google does **not** overwrite the stored `instagram`.
- [ ] `grep -ri "x-vercel-ip\|req.ip\|x-forwarded-for" src` — confirm no raw IP is written to any table or log.
- [ ] Two applications from the same machine produce the **same** fingerprint; a different browser produces a different one.
- [ ] `ANALYTICS_SALT` and `FINGERPRINT_SALT` are different values, and neither is `NEXT_PUBLIC_`.
- [ ] The 12-month purge function exists, and running it against a back-dated row nulls the three groups and keeps the application.
- [ ] The privacy policy names what is collected, why, and for how long.
- [ ] A fourth application submit within an hour is refused with a readable message and a WhatsApp fallback.
- [ ] **The limit holds when posting directly to `/rest/v1/applications`, bypassing Next.js entirely.** Paste the curl and the response.
- [ ] 11 failed sign-ins trigger the lockout; a correct password afterwards still works once it expires.
- [ ] A filled honeypot returns 200 and writes nothing. A real submission is unaffected.
- [ ] `anon` cannot **list** `dog-media`, `gallery` or `training-videos`, but a direct object URL still loads. Paste both attempts.
- [ ] A `.exe` renamed `.pdf` is rejected on magic bytes.
- [ ] An 11 MB file is rejected with a clear message.
- [ ] Uploaded files land under `applications/{id}/{uuid}.{ext}` — the original filename appears nowhere.
- [ ] `curl -I https://diedericksdobermanns.com` shows all five headers, and the existing CSP is unchanged.
- [ ] The funnel page identifies the biggest drop-off step against real data — name the step and the number.
- [ ] Bot traffic is excluded from every analytics figure — show the count with and without.
- [ ] Sessions whose last page has no following view are excluded from duration averages, not counted as zero.
- [ ] Every block writes a `SECURITY_`-prefixed row to `error_events` and appears in the admin log.
- [ ] The app enforces the same rate limit and the same upload rules — test from the app, paste the result.
- [ ] For each app feature, `ls` the file and paste the output. **Do not rely on grep alone; it has returned false negatives on this filesystem.**
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. App: `npx tsc --noEmit` exits 0.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] The migration is applied and confirmed against the live database before you report done.
- [ ] After any RLS or grant change, confirm the public site and a client portal still load. **Verify the site, not the policy text.**

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: migration, attribution, funnel, hardening.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
