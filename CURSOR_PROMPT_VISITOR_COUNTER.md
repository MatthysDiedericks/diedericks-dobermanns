# CURSOR PROMPT — Website visitor counter

Matt has no idea how many people visit the site. This counts them without tracking
anyone, and shows the result to admins only.

**Repo:** `diedericksdobermann-web`. **Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## The schema is already applied — do not create it

Applied to the live database on 11 Aug 2026 and tested.

```
page_views(id, path, referrer_host, visitor_hash, country, is_bot,
           viewed_on, created_at)

record_page_view(p_path, p_visitor_hash, p_referrer_host, p_country, p_is_bot)
    SECURITY DEFINER. The ONLY way to write. Granted to anon + authenticated.
    Never raises — a failure to count must not break a page.
    Silently stops above 100,000 rows in a day.

page_view_daily  (view)  viewed_on, views, visitors   -- bots already excluded
```

There is **no insert policy** on `page_views`, deliberately. Do not add one, and do not
insert directly — go through the function. An open insert on a public table is an
invitation, which is the lesson `capture_issue` already learned this week.

Reads are admin-only. `page_view_daily` excludes bots.

---

## 1. Record the view — middleware

`src/middleware.ts` (create it, or extend it if one exists).

Record a view when **all** of these hold:

- the request is a page navigation, not an asset — skip `/_next`, `/api`, `/favicon`,
  and anything with a file extension;
- the path is **public** — skip `/admin` and `/portal` entirely. Matt refreshing the
  admin dashboard forty times a day is not traffic, and staff behaviour has no business
  in a visitor count;
- the method is GET.

### The visitor hash — this is the part that matters

```
visitor_hash = sha256(ip + user-agent + YYYY-MM-DD + SALT)
```

- `SALT` comes from `process.env.ANALYTICS_SALT`. **If it is missing, do not record
  anything** and log once — a hash without a salt is trivially reversible from an IP
  range, and silently degrading to that would be worse than counting nothing.
- The date is in the hash on purpose: it rotates at midnight, so nobody can be followed
  across days and the stored value identifies no one. The cost is that a returning
  visitor counts again tomorrow. That is the intended trade, not a bug — say so in a
  comment so nobody "fixes" it later.
- Never store the raw IP or user agent. Not in a column, not in a log.

Get the IP from `x-forwarded-for` (first entry) with `x-real-ip` as fallback. Country from
Vercel's `x-vercel-ip-country` header if present.

### Referrer

Store the **host only** — `new URL(referrer).hostname` — never the full URL. The path
someone arrived from can itself reveal what they were reading. Skip it entirely when the
referrer is your own domain; internal navigation is not a referral.

### Bots

Set `p_is_bot` true for obvious crawlers: `bot`, `crawl`, `spider`, `slurp`,
`bingpreview`, `facebookexternalhit`, `headlesschrome`, `lighthouse`, `pingdom`,
`uptime` in a lowercased user agent. Also flag an empty user agent. **Record them
anyway** with the flag set — knowing how much of your traffic is crawlers is useful, and
the daily view already filters them out.

### Never block the response

Fire the call and do not await it in a way that delays the page. If it throws, swallow it.
A page must never be slower, or fail, because a counter had a bad day.

## 2. Show it — `/admin/analytics`

A new admin page. Everything here reads `page_views` / `page_view_daily`, which are
admin-only by RLS.

**Top row:** views today, unique visitors today, views this week, unique visitors this
week.

**Chart:** daily views and unique visitors over the last 30 days. Recharts is already a
dependency. Two lines, gold for visitors, muted for views.

**Top pages** — last 30 days, path and view count, most viewed first. Link each path to
the live page.

**Where they came from** — `referrer_host` counts, last 30 days, excluding null. If
everything is null, say *"No referral data yet — visitors are arriving directly or from
apps that strip the referrer"* rather than showing an empty box.

**Countries** — counts by `country`, last 30 days. Matt sells internationally; knowing
Malawi and Namibia are reading is worth something.

**Bot share** — one honest line: *"X% of requests were crawlers (excluded above)."*

### Be honest about what the numbers are

Put one line of plain English under the heading:

> *Counts exclude admin and portal pages and known crawlers. A visitor is counted once
> per day — someone returning tomorrow counts again. No cookies are used and no personal
> data is stored.*

If there is no data yet, the empty state says *"Nothing recorded yet. Counting starts
from the moment this deploys"* — not a zero that looks like a bug.

## 3. Wiring

- Sidebar: **Analytics** under a sensible group.
- Admin dashboard: a small "visitors this week" stat linking to the page.

## 4. The app side — `diedericks-dobermanns`

Matt runs the business from his phone as much as his desk. A number he can only see on a
laptop is a number he will not look at.

**Do NOT add view recording to the app.** The Expo app has no website visitors to count,
and firing `record_page_view` from it would pollute the figures with staff navigation.
This is read-only in the app.

Extend the existing `app/(admin)/analytics.tsx`, which currently shows business
breakdowns (dogs by status, applications by status, litters by status). Add a **Website
traffic** section above them:

- Views and unique visitors — today and this week, in the same stat treatment the screen
  already uses.
- Top 5 pages, last 30 days.
- Top 5 countries, last 30 days.

Skip the chart on mobile — four numbers and two short lists answer "is anyone looking at
my site" without a cramped graph.

Follow the existing app conventions rather than inventing new ones:

- A `useWebsiteTraffic.ts` hook in `hooks/`, matching the `useDogs` pattern
  (loading / error / refresh), reading `page_view_daily` and `page_views`.
- Reuse `SectionHeader`, `Typography` and the existing `Breakdown` component in
  `analytics.tsx` for the lists — do not build new list UI.
- Pull-to-refresh, loading skeleton, and an empty state saying counting has only just
  started.

RLS already restricts these to admins, and the app's admin area is already gated, so no
extra permission work is needed. Regenerate `types/database.types.ts` first — `page_views`
and `page_view_daily` are new and the app's types predate them:

```powershell
npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr | Set-Content -Path types/database.types.ts -Encoding utf8
```

Use `Set-Content -Encoding utf8`, not `>`. PowerShell redirection writes UTF-16 and
silently corrupts the file — that cost a day this week, producing thirteen type errors
that looked like missing tables.

Then `npx tsc --noEmit` in the app repo, commit and push it separately: the app repo's
root is the **parent** folder, not `diedericks-dobermanns`.

---

## Environment

Add `ANALYTICS_SALT` to `.env.local` and to Vercel (all environments) — any long random
string. **Say clearly at the end of your run that Matt must set this in Vercel**, because
without it the middleware records nothing by design and the page will sit empty looking
broken.

## Rules

- `requireAdmin()` on the analytics page and any action.
- Never `createAdminClient()` outside admin routes.
- Never store raw IP or user agent anywhere, including logs.
- Middleware must not await the write in a way that delays the response, and must never
  throw.
- No file over 300 lines.
- Do not add an insert policy to `page_views`.
- Mirror nothing to the app — this is website traffic; the app has its own analytics
  screen for business data.

## Verify

- [ ] Visiting a public page records exactly one row; refreshing records another view but the same `visitor_hash`.
- [ ] Visiting `/admin` or `/portal` records nothing.
- [ ] Assets and `/api` routes record nothing.
- [ ] With `ANALYTICS_SALT` unset, nothing is recorded and the app still works.
- [ ] No raw IP or user agent appears in any column or log.
- [ ] A crawler user agent is stored with `is_bot = true` and excluded from the headline numbers.
- [ ] A referrer from your own domain is stored as null.
- [ ] The page renders a truthful empty state before any data exists.
- [ ] A non-admin cannot read `page_views` (RLS blocks it).
- [ ] `npx tsc --noEmit` exits 0 **and `npx next build` succeeds** — build, not just types. A client/server import mistake broke every deployment for six hours this week and `tsc` did not catch it.

App:

- [ ] The app's analytics screen shows the same today/this-week figures as the website's.
- [ ] The app records **no** page views — `record_page_view` is not called anywhere in `diedericks-dobermanns`.
- [ ] `types/database.types.ts` regenerated with `Set-Content -Encoding utf8` and roughly the same size as before, not double.
- [ ] `npx tsc --noEmit` passes in the app repo.

## Commit

Two repos, two commits.

**Website:** from `diedericksdobermann-web/`, `git add -A`, one commit, `git push origin main`.

**App:** the repo root is the **parent** folder, not `diedericks-dobermanns`. Commit and
push separately.

No migration needed — the schema is live.

Do not touch `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/lib/issues/capture.ts`, or
`src/components/layout/WhatsAppButton.tsx`.
