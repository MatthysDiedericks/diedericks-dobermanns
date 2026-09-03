# CURSOR PROMPT — Close the parity backlog: 2 are wrong, 11 are decisions, 4 are work

`node scripts/check-parity.mjs` reports **17** one-sided screens. That number is now honest, which is
the improvement — but 17 is still more than anyone acts on. This sorts it into three piles and empties
two of them.

**Do the work in this order.** Sections 1 and 2 are quick and make section 3's list short enough to
be believable.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns`. Sections 1–2 touch the shared
`scripts/` folder; section 3 says per screen which repo it lands in.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Brand `#111008 / #1C1A0E / #C4A35A / #F5F0E8`, Cinzel/Lato.
**No migration.** Every table these screens need already exists and is in use on the other side.

---

## 1. Two of the 17 are the checker being wrong

`portal/training/bookings` and `portal/training/request` are flagged as app-only. **The website has
both.** They are not separate routes there — they live inside
`src/app/portal/(panel)/training/page.tsx` with `request-actions.ts` beside it. The app split the
same two jobs into their own screens.

That is a shape difference, not a missing feature — the same call the debtors entry already makes.
Add both to `parity-exceptions.json` with that reasoning, in the same voice as the existing entries.

**Do not build website routes to satisfy the tool.** Creating an empty route to make a checker
happy is how a checker stops meaning anything.

## 2. Eleven are decisions, not work

Record each with a reason a person would accept in six months. "Not needed" is not a reason.

**Website-only — belongs on a large screen:**

- `admin/marketing/pages`, `admin/marketing/new`, `admin/marketing/:id` — long-form page writing
- `admin/training/guides`, `admin/training/guides/new`, `admin/training/guides/:id` — long-form guide writing
- `admin/issues`, `admin/issues/:id` — internal fault log, read at a desk when something has gone wrong

**App-only — the website already shows it elsewhere:**

- `admin/settings/social` — a handful of links set once; the website keeps them in general Settings
- `portal/groups` — the website surfaces group membership on the portal dashboard
- `portal/litters/:id/waitlist` — the website shows waitlist position on the litter page

## 3. Four are real. Build them.

Read the existing implementation on the other platform first and **match its behaviour**. Where the
two disagree, the side that has been in daily use is right.

### 3.1 `admin/training/journey/:dogId` → **app**

A trainer updates a dog's journey standing at the field, not at a desk. This is the single most
phone-shaped screen in the list.
Website reference: `src/app/admin/(panel)/training/journey/[dogId]/`.

### 3.2 `admin/follow-ups/health` → **app**

Health follow-ups are worked through walking between runs. Same list, same overdue wording the app
health screen already uses — do not invent a second way of saying overdue.
Website reference: `src/app/admin/(panel)/follow-ups/health/`.

### 3.3 `admin/quotes/:id/edit` → **app**

Quotes are already created on the phone. Not being able to correct one is the gap. Reuse the
autosave and Resume/Start-fresh behaviour the app quote builder already has, and keep
`quotes.revision` / `last_sent_revision` behaving exactly as the website does — a quote edited after
sending must still show the revision banner.
Website reference: `src/app/admin/(panel)/quotes/[id]/edit/`.

### 3.4 `admin/breeding/plans/:id/step` → **website**

This one goes the other way. Breeding succession is planned sitting down, and the website is the
side that is missing it.
App reference: `diedericks-dobermanns/app/(admin)/breeding/plans/[id]/step.tsx`.

---

## Rules

- **Do not add an exception for anything in section 3.** Those are work, and hiding them defeats the
  point of the tool.
- No new tables, no new RLS policies, no new categories. If a screen seems to need one, stop and say
  so rather than inventing schema.
- Pass `userId` into every scoped query. The portal scoping bug on 26 Aug came from a screen that
  omitted it.
- TypeScript strict, no `any`, no file over 300 lines. Lists need loading, empty and error states,
  pull-to-refresh, and `FlatList` rather than `.map()`.
- `ls` every file you create and paste the output — grep has false-negatived on this filesystem.

## Verify — paste output, not descriptions

Use real records. **Do not create test dogs, quotes or plans** — Cursor has previously left `VERIFY`
rows on a real client's ledger on this project.

- [ ] `node scripts/check-parity.mjs` — paste the full output. Expect **0 unexplained divergences**.
- [ ] Paste `parity-exceptions.json` in full so Matt can read every reason.
- [ ] `node scripts/check-parity.mjs --strict` — paste the **exit code**. It must be `0`.
- [ ] Screenshot the app training journey for a real dog with existing entries — **Hunter-King**.
- [ ] Screenshot the app health follow-ups list against real overdue records.
- [ ] Open a real quote in the app editor, change nothing, back out. Confirm `revision` is
      **unchanged** — paste before and after. An editor that bumps the revision on open is worse
      than no editor.
- [ ] Screenshot the website breeding plan step screen against the real Cleo × Dharka plan.
- [ ] `npx tsc --noEmit` on the website must be clean. On the app, confirm no new errors beyond the
      known pre-existing set — paste the count before and after.
- [ ] `npm run preflight` passes in both repos.

### Prove it reached the remote
- [ ] `git log origin/main -1` matches `HEAD` in **both** repos — paste both hashes.
- [ ] Vercel **Ready** on `diedericksdobermanns-web-v145`.

## Also — CI parity is currently doing nothing

The workflow checks out the second repo with `${{ secrets.PARITY_GITHUB_TOKEN || secrets.GITHUB_TOKEN }}`.
**`GITHUB_TOKEN` cannot read a different private repository**, so that step fails to check out the
app and the parity gate never really runs in CI. Locally it passes because both repos are on disk.

Do not paper over this. Either:

- make the workflow **fail loudly** with a message naming `PARITY_GITHUB_TOKEN` when the checkout
  fails, so it is obvious the gate is not running; or
- skip the CI parity step entirely when the secret is absent, and say so in the job summary.

State in your report which you did. Matt then adds the secret when he chooses. Preflight is carrying
the gate until then, and he should know that.

## Commit
One commit per section: exceptions, then each of the four screens. **Website:** from
`diedericksdobermann-web/`. **App:** repo root is the **parent** folder.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`,
`scripts/send-portal-invite-emails.mjs`.
