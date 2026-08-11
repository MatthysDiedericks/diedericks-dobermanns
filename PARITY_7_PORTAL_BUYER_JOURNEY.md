# PARITY PROMPT 7 — The buyer's portal on the website

Five client-portal screens exist in the Expo app but not on the website. A buyer who
opens the portal in a browser — which is what an international client on a desktop will
do — cannot see where their puppy is, when it comes home, or anything we have sent them.

**Repo:** `diedericksdobermann-web` (Next.js 15 App Router, TypeScript strict, Tailwind v4)
**Supabase:** `nlmwxodvquwbjinhhbmr`
**Brand:** bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel headings, Lato body.

Verified with `node scripts/check-parity.mjs` on 10 Aug 2026. Do not build anything not
listed here — the other reported gaps are being handled separately.

---

## Read first — mirror, do not reinvent

The app is the source of truth for behaviour. Read each before writing its web twin:

- `diedericks-dobermanns/app/(portal)/expected-litters.tsx`
- `diedericks-dobermanns/app/(portal)/puppy-tracker/[puppyId].tsx`
- `diedericks-dobermanns/app/(portal)/dogs/[id]/milestones.tsx`
- `diedericks-dobermanns/app/(portal)/messages.tsx`
- `diedericks-dobermanns/app/(portal)/reservation.tsx`

Website patterns to reuse — these already exist and are the house style:

- Routes: `src/app/portal/(panel)/…/page.tsx`, `export const dynamic = "force-dynamic"`
- Data: one function per concern in `src/lib/portal/*.ts` (see `dogs.ts`, `health.ts`,
  `quotes.ts`). Pages call those; they do not query Supabase inline.
- `src/lib/supabase/server.ts` → `createClient()`. **Never** `createAdminClient()` in a
  portal route — RLS is the access control here and bypassing it leaks other clients' data.
- `src/components/admin/CollapsibleCard.tsx`, `src/lib/admin/styles.ts`,
  `src/lib/finance/formatters.ts` (`formatAmount`), `src/lib/utils.ts` (`formatDateTime`).
- Sidebar: `src/components/layout/PortalSidebar.tsx` (match the existing entries' casing).

## Tables — all exist, create none

```
litters(id, name, litter_letter, mother_id, father_id, expected_date, actual_date,
        go_home_date, go_home_weeks, go_home_earliest, go_home_latest, status,
        male_count, female_count, announcement_image_url, notes)

weight_logs(id, dog_id, weight_kg, recorded_at, …)
dog_timeline(id, dog_id, author_id, source, category, entry_date, title, notes,
             photo_urls text[], video_url, created_at)
broadcast_messages(…)        -- read the columns before use
reservations(id, dog_id, client_id, status, …)
```

`dog_timeline` was only created in the database on 10 Aug 2026. It is empty. Every screen
that reads it must render a real empty state, not a spinner.

---

## Screens to build

### 1. `portal/expected-litters`

Upcoming and current litters, so a waiting buyer can see what is coming.

Show per litter: name/letter, sire and dam names, expected or actual date, go-home date,
status, and the announcement image if set. Order upcoming first.

**Show a go-home date only when the kennel has committed to one.** If `go_home_date` is
set, print it in full ("12 October 2026"). If only `go_home_earliest`/`go_home_latest`
exist, print a month window ("early October"). If neither, print nothing — not "TBC", not
a computed guess. Buyers book flights around this.

### 2. `portal/puppy-tracker/[puppyId]`

The growth and progress view for a puppy the signed-in client is reserving or owns.

- Weight chart from `weight_logs` (Recharts is already a dependency).
- Age in weeks, current weight, next milestone.
- Go-home date from the litter, under the same rule as above.

Authorise via RLS, not by filtering in the page. If the client has no claim on that puppy
the query returns nothing and the page must `notFound()` rather than render an empty shell.

### 3. `portal/dogs/[id]/milestones`

Chronological `dog_timeline` entries for one dog: date, title, notes, photos, optional
video. Newest first. Photos in a simple responsive grid; clicking one opens it full size.

The existing portal dog page is `portal/(panel)/dogs/[id]/page.tsx` — add a link to
milestones from it, and a back link the other way.

### 4. `portal/messages`

Broadcasts the kennel has sent to this client or to a group they belong to. Read-only —
there is no client→kennel reply channel yet, so do not build a composer that goes nowhere.
Newest first, with sent date, and unread ones visually distinct if the schema supports it.

### 5. `portal/reservation`

The client's current reservation: which dog, status, deposit paid, balance outstanding,
go-home date. This is the "where am I in the process" screen — a buyer who has paid a
deposit should be able to answer that without emailing.

---

## Wiring

- Add all five to `PortalSidebar.tsx`. `puppy-tracker` and `milestones` are reached from a
  dog rather than the sidebar — link them from the portal dog page instead.
- Add cards for expected litters, messages and reservation to the portal landing page.

## Rules

- **RLS is the access control.** Every query runs as the signed-in user through
  `createClient()`. Never `createAdminClient()`, never filter by `client_id` passed in a
  URL — a portal leak here exposes another buyer's contract and payment history.
- Check `error` on every Supabase call and surface it. Do not `throw` in a portal page: a
  thrown error renders a bare 500 to a paying client. Return an empty state and log it.
  (A missing table threw on the admin dog page on 10 Aug and took every dog page down.)
- Loading, empty and populated states on all five. Empty states say what will appear and
  when — "Your puppy's updates will appear here once she is born", not "No data".
- No file over 300 lines. Split into `src/components/portal/…` before you get there.
- Money is `numeric` — format with `formatAmount`, never float arithmetic.
- Dates: never invent or compute a go-home date the kennel has not set.

## Verify

- [ ] Signing in as a client shows only their own dogs, messages and reservation.
- [ ] A second client account sees none of the first client's data on any of the five screens.
- [ ] A litter with no go-home date shows no date at all — no placeholder, no guess.
- [ ] A litter with only earliest/latest shows a month window.
- [ ] `dog_timeline` being empty renders the empty state, not an error or a spinner.
- [ ] Puppy tracker for a puppy the client has no claim on returns 404, not an empty page.
- [ ] `npx tsc --noEmit` exits 0 and `npx next build` succeeds.
- [ ] No file over 300 lines.
- [ ] `node scripts/check-parity.mjs` no longer lists these five.

## Commit

From `diedericksdobermann-web/`, `git add -A`, one commit. Confirm
`git ls-files --others --exclude-standard src/` is empty first.

**Then push.** `git push origin main`. On 10 Aug eight commits sat unpushed for a week and
the live site ran stale code while we debugged features that were already built. Committing
is not shipping.

Do not change anything under `src/lib/documents/`, `src/components/documents/`,
`src/components/finance/QuotePaymentSection.tsx`, `src/components/admin/DogPicker.tsx`,
`src/lib/admin/dogs.ts`, or `src/app/admin/(panel)/waitlist/` — those are being edited in
parallel and will conflict.
