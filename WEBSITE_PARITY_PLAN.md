# Website ↔ App Admin Parity Plan

Audited 2026-08-06. **The app is ahead, not the website**: 68 admin screens in
`diedericks-dobermanns` versus 33 in `diedericksdobermann-web`.

Decision: **full 1:1 parity** — every admin screen on both platforms.

---

## Why the drift happened, and how to stop it

Every feature since June was built app-first, then partially mirrored to the web. Nothing
enforced the mirror, so the gap compounded silently.

**Standing rule from now on:** a feature is not done until it exists on **both** surfaces.
Every Cursor prompt must name the screens in *both* repos, and the testing checklist must
tick both. If a feature is genuinely single-platform, that is a decision to record here with
a reason — not a default.

Shared logic must live in the database (RPCs, views, RLS), so both clients call the same
thing. Anything implemented twice in TypeScript will drift again. Where a calculation is
already in the app (quote totals, budget rollups), move it to a Postgres function rather
than reimplementing it in the web repo.

---

## The gap

### Phase 1 — Money (build first)

| Screen | App path | Web path to create |
|---|---|---|
| Budget | `finance/budget` | `admin/(panel)/finance/budget` |
| Creditors | `finance/creditors` | `admin/(panel)/finance/creditors` |
| Recurring expenses | `finance/expenses/recurring` | `admin/(panel)/finance/expenses/recurring` |
| Finance import | `finance/import` | `admin/(panel)/finance/import` |
| Quotes list | `quotes/index` | `admin/(panel)/quotes` |
| Quote create | `quotes/new` | `admin/(panel)/quotes/new` |
| Quote detail | `quotes/[id]` | `admin/(panel)/quotes/[id]` |
| Pricing settings | `settings/pricing` | `admin/(panel)/settings/pricing` |

Backing tables already exist: `budgets` (11 cols), `budget_line_items` (11),
`quotes` (16), `quote_items` (9), `pricing_tiers` (11).

**`convert_quote_to_invoice(uuid)` already exists as a Postgres function** and enforces
`is_admin()`, single-conversion, and status rules. The web quote detail page must call that
RPC — do **not** reimplement the conversion in TypeScript.

All three `pricing_tiers` rows are still R0. The pricing settings screen is what lets Matt
fix that without SQL.

### Phase 2 — Clients

| Screen | App path | Web path |
|---|---|---|
| Client list | `clients/index` | `admin/(panel)/clients` |
| Client detail | `clients/[id]` | `admin/(panel)/clients/[id]` |
| Client groups | `client-groups/index`, `[id]` | `admin/(panel)/clients/groups`, `groups/[id]` |

Tables: `client_groups` (10 cols), `client_group_members` (6), `client_dog_notes` (9).

Client detail should surface: their dogs (via `dogs.owner_id` / confirmed reservations),
applications, contracts, invoices, and the allocate action built in
`allocation-actions.ts`. This is what makes the 121 unallocated-sale back-fill practical.

### Phase 3 — Breeding

| Screen | App path | Web path |
|---|---|---|
| Breeding home | `breeding/index` | `admin/(panel)/breeding` |
| Planner | `breeding/planner` | `admin/(panel)/breeding/planner` |
| Pairing builder | `breeding/pairing-builder` | `admin/(panel)/breeding/pairings` |
| Trial planner | `breeding/trial-planner` | `admin/(panel)/breeding/trials` |
| Litter recorder | `breeding/litter-recorder` | `admin/(panel)/litters/record` |
| Organogram | `breeding/organogram` | `admin/(panel)/breeding/organogram` |
| Breeding stock | `breeding-stock` | `admin/(panel)/breeding/stock` |

Table: `pairings` (17 cols). Prohibited-pair and line rules already live in the app's
breeding logic — move those into a shared SQL function before mirroring, or the two will
disagree about which matings are legal, which is a genuinely dangerous divergence.

### Phase 4 — Everything else

Analytics, Marketing, Broadcast composer, Notifications, Health (index + settings),
Heats (per-dog + reference), Litters (edit, register pups), Waitlist new,
Dog tabs (photos, pedigree, story, litter history), Social settings.

### Already web-only — mirror back into the app

Built on the website this week and **missing from the app**:

- Unallocated Sales backlog (`admin/dogs/unallocated`)
- Client media review queue (`admin/media/pending`)
- Training journey editor (`admin/training/journey/[dogId]`)

---

## Execution notes for every phase

- **Website stack:** Next.js 15 App Router, server components + server actions, TypeScript
  strict, Tailwind v4. Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`,
  Cinzel headings.
- Every admin server action calls `requireAdmin()` and returns `{ error }` rather than throwing.
- **Never** use `createAdminClient()` in a portal route; RLS does the scoping there.
- No file over 300 lines. Reuse `CollapsibleCard`, `AdminHeader`, `inputClass` from
  `@/lib/admin/styles`, and the existing table/form patterns — do not invent new ones.
- Regenerate types after any schema change:
  `npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > src/types/database.types.ts`
- `npx tsc --noEmit` and `npx next build` must both pass before commit.
- Commit with `git add -A` from the correct repo root — website root is
  `diedericksdobermann-web/`, app root is the **parent** folder. Confirm
  `git ls-files --others --exclude-standard src/` is empty first.

## Suggested sequencing

1. **Phase 1** in two prompts: Finance (budget/creditors/recurring/import), then Quotes + Pricing.
2. **Phase 2** in one prompt.
3. **Phase 3** — do the shared breeding-rules SQL function first, as its own prompt, then the screens.
4. **Phase 4** in two or three prompts grouped by area.
5. Mirror the three web-only screens back into the app.

Do not attempt more than one phase per Cursor run. The last large change set ran to 69 files;
beyond that, review quality collapses and partial change sets start shipping.
