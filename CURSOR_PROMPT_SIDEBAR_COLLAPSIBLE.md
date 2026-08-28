# CURSOR PROMPT — Collapsible admin sidebar with real parent/child links

`AdminSidebar.tsx` shows **44 links at once**. Sub-items are faked by prefixing the label with an
em-dash — `"— Pairing Builder"` — so nothing actually nests and nothing can be collapsed. Matt
scrolls past the whole business to reach Settings.

**Repo:** `diedericksdobermann-web` (admin is website-only — see the app note at the end).
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Verified — the current shape

`src/components/layout/AdminSidebar.tsx`, 226 lines. Type is:

```ts
items: { href: string; label: string }[]
```

Flat. Six sections — Breeding, Care, Business, Messaging, System, Content, Settings — and **Business
alone holds 22 items.** The em-dash prefix is the only hint of hierarchy.

**Do not keep the em-dash convention.** Replace it with real nesting; the dash disappears from every
label once a child is a child.

---

## 1 · The tree

Give each item optional `children`. **Parents keep their own `href`** — they are pages in their own
right, not folders.

```
Breeding
  Programme          → Pairing Builder · Planner · Trial Matings · Organogram · Breeding Stock
  Litters            → Record Litter
  Puppies / Dogs     → Unallocated Sales
  Heat Cycles        → Breeding Reference

Care
  Health             → Products & Practices
  Owner Follow-ups   → Health of our lines

Business
  Waiting List       → Add Entry
  Applications
  Enquiries
  Contacts           → Duplicates
  Clients            → Client Groups
  Contracts
  Quotes             → Quote catalogue
  Finance            → Cashflow · Debtors · Budget · Creditors · Recurring Expenses · Import Expenses
  Fulfilment
  Marketing
  Training Bookings  → Training Guides

Messaging
System               Documents · To-Do Items · Issues · System health · Security · Analytics · Audit Log
Content              Gallery · Pending Media · Testimonials · FAQ
Settings             App Settings · Pricing
```

**Two regroupings, and they are the real win:**

- **Budget, Creditors, Recurring Expenses and Import Expenses are currently top-level in Business.** They are finance pages. Move them under Finance. That alone takes Business from 22 visible items to 12.
- **Quote catalogue currently sits under Settings.** Move it under Quotes, where someone building a quote would look for it.

**Business is still the biggest section and always will be** — it is where the work happens. Do not
try to even out the sections for tidiness.

## 2 · How collapsing behaves

- **Collapsed by default**, except the branch containing the current page.
- **The active route's parent auto-expands**, always — Matt must never be on a page whose own nav entry is hidden.
- **Persist expanded state per parent in `localStorage`**, so it survives a refresh and a redeploy.
- Restoring saved state must not collapse the branch the user is currently in. **The current page wins over the saved state.**

### The parent is a link and a toggle

Clicking the **label** navigates. Clicking the **chevron** toggles. Navigating to a parent also
expands it.

**Do not make the whole row toggle-only** — Programme, Litters, Finance and Health are all real
pages Matt uses, and burying them behind an expand step makes the sidebar worse, not better.

## 3 · Counts must survive collapsing

**Unallocated Sales shows `121`.** It is a child of Puppies / Dogs. If that branch is collapsed, the
number disappears — and a badge that hides itself is worse than no badge.

**Roll unread counts up to the collapsed parent.** When a branch is collapsed, the parent shows the
sum of its children's badges; when expanded, the badges sit on the children where they belong.

Apply the same to any awaiting-review or unresolved counts on Applications, Issues and Security.

## 4 · Keep it usable

- Chevron rotates on expand, with a short transition. **No height animation on a 44-item list** — it stutters and buys nothing.
- `aria-expanded` on every toggle, children in a `<ul>`, toggles reachable and operable by keyboard.
- Children indented one step, smaller, lower contrast — the existing subtle/gold treatment already does this; **do not introduce a new colour.**
- The active child is gold; **its parent shows a quieter active marker** so the branch is identifiable when scrolled.
- Section headings — BREEDING, CARE, BUSINESS — stay as they are. Do not make those collapsible too; two levels of collapse is a maze.

**`AdminSidebar.tsx` is 226 lines and will grow.** Split the nav tree into its own module —
`src/components/layout/adminNav.ts` — and keep the component under 300 lines.

---

## The app

**Admin navigation is website-only.** The app uses tab navigation and has no equivalent sidebar, so
there is nothing to mirror. **Say so explicitly in your reply** rather than leaving the app section
unaddressed — but do not build a sidebar into the app.

## Rules

- Parents keep their own `href` and remain clickable.
- No em-dash prefixes anywhere in labels after this change.
- Collapsed by default; the active branch always open.
- Saved state never hides the current page.
- Collapsed parents carry their children's counts.
- No new colours; use the existing gold/subtle treatment.
- Nav tree in its own file. No file over 300 lines.

## Verify — paste output, not descriptions

- [ ] **No label anywhere still starts with an em-dash.** `grep -rn '"— ' src/components/layout` returns nothing.
- [ ] Every one of the 44 existing links is still reachable — list them against the old file and confirm none was dropped.
- [ ] Business shows **12 top-level items**, not 22.
- [ ] Budget, Creditors, Recurring Expenses and Import Expenses all appear under Finance.
- [ ] Quote catalogue appears under Quotes and no longer under Settings.
- [ ] Landing on `/admin/finance/debtors` opens Finance automatically with Debtors marked active.
- [ ] Collapsing Finance, refreshing, and returning shows it still collapsed.
- [ ] Navigating to `/admin/finance/cashflow` **overrides** the saved collapsed state and opens the branch.
- [ ] Clicking the word "Finance" navigates to `/admin/finance`. Clicking its chevron only toggles.
- [ ] With Puppies / Dogs collapsed, the parent shows **121**. Expanded, the 121 sits on Unallocated Sales.
- [ ] Tab and Enter operate every toggle; `aria-expanded` is present and correct.
- [ ] The sidebar fits without scrolling on a 1080p screen with everything collapsed. Say whether it does.
- [ ] `AdminSidebar.tsx` is under 300 lines and the tree lives in its own module.
- [ ] `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD`. Paste both hashes.
- [ ] Vercel build succeeded — state the deployment id. **Committing is not shipping.**

## Commit

From `diedericksdobermann-web/`. Separate commits for: the nav tree module, the collapsible
component, count roll-up.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
