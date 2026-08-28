# CURSOR PROMPT — Get from a litter row to its puppies in one click

The Litters list shows *"9 / 10"* available for Claire × Santini and gives no way to see who those
nine are. The only row action is **Edit**. Matt has to open the litter, find the Puppies tab, and
click again — and if he refreshes or presses back, he is returned to the first tab.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Verified live — the missing piece is smaller than it looks

**Already working, do not rebuild:**

- `src/components/litters/LitterPuppyTableRow.tsx` **already links each puppy** to `/admin/dogs/{id}` (line 67). The deepest link exists.
- `AdminLittersClient.tsx` already links the **sire and dam** to `/admin/dogs/{id}` (lines 158, 165).
- The litter detail page already renders a **Puppies** tab via `LitterPuppiesTab`, plus Weights, Media, Documents, To-dos, Financials and Contracts.

**The three real gaps:**

1. **`src/components/admin/AdminTabs.tsx` keeps the active tab in `useState` only** (line 25). There is no URL state. So a tab **cannot be linked to, cannot be bookmarked, breaks the back button, and resets on refresh.** This is the actual blocker for everything below.
2. **The litter name is not a link** in `AdminLittersClient`. The only row action is *Edit* → `/admin/litters/{id}`. Naming the action "Edit" also makes Matt hesitate when he only wants to look.
3. **The available count (`{available_count} / {puppy_count}`, line 182) is plain text** — the most obviously clickable thing on the row does nothing.

---

## 1 · Put the tab in the URL — do this first

`/admin/litters/{id}?tab=puppies` opens on the Puppies tab.

- Read the tab from `useSearchParams`, fall back to `initialKey` then the first tab. An unknown or missing value falls back silently — never an error, never a blank page.
- Switching tabs updates the URL with `router.replace` and `scroll: false`, so the page does not jump and the browser history is not filled with one entry per tab click.
- Back and forward move between tabs the way a person expects.
- **`AdminTabs` is shared.** Audit every screen that uses it and confirm none regress. Deep links are a bonus everywhere else — dog profile, client record — so give each tab a stable, readable key (`puppies`, `weights`, `documents`), not an index.

## 2 · Make the litter row go where it looks like it goes

In `AdminLittersClient`:

- **The litter name becomes the link** to `/admin/litters/{id}` — matching the sire and dam links already in that table.
- **The available count becomes a link** to `/admin/litters/{id}?tab=puppies`. That is Matt's request, and the count is the thing his eye lands on.
- Rename the row action from **Edit** to **Open**. It goes to the detail page, which is mostly reading. `Edit` sits next to a delete-shaped decision and makes him pause.
- A litter with no puppies recorded shows the count as plain text, not a link to an empty tab. Expected litters have none — **5 of the 30 are `expected` or `planned`.**

## 3 · See the puppies without leaving the list

Add an **expand** control on each born litter row that reveals its puppies inline: collar swatch, name,
sex, status, and the buyer where there is one. Each name links to `/admin/dogs/{id}`.

This is the difference between our list and DogBreederPro's. Matt scans this page to answer *"who is
still available across everything"* — making him open six litters to answer it is the flaw.

- Fetch on expand, not on page load. **30 litters × their puppies is a lot of rows to load for a list nobody has expanded.**
- Deceased puppies are hidden by default, consistent with `LitterPuppiesTab`, which already does this.
- Keep the expanded state in component state only. Do **not** put it in the URL — the tab is worth linking to, an open accordion is not.

## 4 · Make the count mean something

`available_count` is a stored number and stored numbers drift. Claire × Santini reads **9 / 10** with
one deceased puppy, which is right — but four of those puppies were wrongly marked *available* when
they were already sold, and nothing flagged it.

- Show the count **derived from the puppy rows**, with the stored `available_count` only as a fallback where no puppies are recorded.
- Where the derived and stored values disagree, show the derived number and a quiet marker. Do not auto-correct the stored column in this prompt — just surface it. **Selling the same puppy twice is the failure this prevents.**

---

## The app

`app/(admin)/litters/index.tsx` and `[id]/index.tsx` exist and have the same gap.

- Tapping a litter row opens the detail; tapping the count opens it **on the Puppies tab**.
- Expo Router: pass the tab as a route param and read it the same way, so a notification or a deep link can land on the right tab.
- Inline expand on the list row, same as the website.
- Each puppy taps through to the dog profile.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**

## Rules

- `AdminTabs` gains URL state without breaking any screen that already uses it.
- Stable string tab keys, never indexes.
- `router.replace` with `scroll: false`; no history spam.
- Puppies for an expanded row are fetched on demand, not with the list.
- Derived counts shown, stored counts not silently rewritten.
- No file over 300 lines. Regenerate types in **both** repos only if the schema changed — this prompt should not need it.

## Verify — paste output, not descriptions

- [ ] `/admin/litters/{id}?tab=puppies` opens on the Puppies tab. Paste the URL and a screenshot.
- [ ] Switching tabs updates the URL; back returns to the previous tab; refresh stays put.
- [ ] An unknown `?tab=` value falls back to the first tab with no error.
- [ ] Every other screen using `AdminTabs` still works. **List them all and say which you opened.**
- [ ] The litter name links to the detail page.
- [ ] The **9 / 10** on Claire × Santini links straight to its Puppies tab.
- [ ] An expected litter shows the count as plain text, not a dead link.
- [ ] Expanding Claire × Santini lists **9 puppies** inline, deceased hidden. Screenshot.
- [ ] Showing deceased reveals **Puppy 10**.
- [ ] Each inline puppy name opens `/admin/dogs/{id}`.
- [ ] Collapsed rows issue **no** puppy queries — prove it from the network tab or a query log.
- [ ] The count is derived from puppy rows; a litter where stored and derived disagree shows the marker. Name the litter.
- [ ] App: tapping the count lands on the Puppies tab; inline expand works. Say which device.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. App: `npx tsc --noEmit` exits 0.

### Prove it reached the remote

- [ ] `node scripts/preflight.mjs` passes before you push.
- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] `git status --porcelain -- src` is empty for the files this prompt touches. **Six deployments failed this week on files that were written but never committed.**
- [ ] Vercel reaches **Ready** — paste the deployment id **and confirm it is the project bound to www.diedericksdobermanns.com**, not one of the two duplicates.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: URL-driven tabs, the litter row links, inline expand,
derived counts, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
