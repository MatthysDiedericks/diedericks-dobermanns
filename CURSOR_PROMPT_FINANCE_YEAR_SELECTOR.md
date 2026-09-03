# CURSOR PROMPT — Finance year selector is a one-way ladder

Matt cannot get back to a year once he leaves it, and 2021 is unreachable entirely.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Brand `#111008 / #1C1A0E / #C4A35A / #F5F0E8`, Cinzel/Lato.
No migration needed — this is display only.

---

## The bug

`src/app/admin/(panel)/finance/page.tsx` line 225:

```tsx
{[year, year - 1].map((y) => (
```

The buttons are **relative to the year currently being viewed**, so the selector walks downwards and
never back up:

```
on 2026 → buttons [2026, 2025]
click 2025 → buttons [2025, 2024]
click 2024 → buttons [2024, 2023]   ← no way back to 2025 or 2026
```

Two years are visible at a time and the only direction is backwards. The only escape is editing the
URL by hand.

## The data it is hiding

```
2021  54 invoices  R224,389     ← unreachable even with the fix below applied naively
2022   2           R72,132
2023  13           R442,098
2024  21           R576,285
2025  45           R1,427,382
2026  25           R855,500
```

## The half-built fix that already exists

`src/lib/finance/years.ts`:

```ts
/** Finance year selector: 2022 through current year + 2. */
export function financeYearRange(): number[] {
  const endYear = new Date().getFullYear() + 2;
  return Array.from({ length: endYear - 2022 + 1 }, (_, i) => 2022 + i);
}
```

The cashflow page uses it; the finance page does not. **Do not simply point the finance page at it** —
it is wrong twice over:

- **starts at a hardcoded 2022**, so the 54 invoices from 2021 stay invisible
- **ends at current year + 2**, inventing 2027 and 2028 buttons that can only ever show zero

Cashflow legitimately needs future years — it forecasts. A ledger of what happened does not.

---

## What to build

### 1. Derive the years from the data

Replace the hardcoded range with the actual span of financial records. Add to
`src/lib/finance/years.ts`, keeping `financeYearRange()` intact for cashflow:

```ts
/**
 * Years that actually contain financial records, newest first.
 * Derived, never hardcoded: the kennel's history starts in 2021 and a hardcoded
 * floor silently hid 54 invoices. Cashflow keeps financeYearRange() because it
 * forecasts forward; a ledger only shows years that happened.
 */
export async function financeYearsWithData(): Promise<number[]>
```

Compute it from the earliest and latest year across **both** `invoices.issue_date` and
`expenses.expense_date` — a year with expenses but no invoices is still a year Matt needs to see.
Return a contiguous descending range between those bounds, so a quiet year still appears rather
than leaving a hole in the row.

Cache it — this changes at most once a year. `unstable_cache` with a long revalidate, or compute it
in the page's existing parallel fetch. Do not add a round trip per render.

Always include the current year even if it has no records yet, so the page is never empty in January.

### 2. Render every year, and keep "All"

- All years, newest first. Six buttons today; it grows by one a year and that is fine.
- The current selection is the gold-bordered one — that styling already exists, keep it.
- Add an **All years** option alongside them. Matt asked for lifetime figures more than once, and
  right now there is no way to see the business's total.
- Preserve the selected month when switching year, exactly as the current links do.

### 3. Fix the same bug on the app

`diedericks-dobermanns` has the same finance screen. Check whether it repeats the `[year, year - 1]`
pattern and fix it the same way. Website/app parity is a standing rule here. If the app already does
this correctly, say so explicitly rather than staying silent.

---

## Rules
- Display only. **Do not touch any figure, aggregate, or query that produces a number.** If a total
  changes as a result of this work, something is wrong — stop and report it.
- Leave `financeYearRange()` alone; cashflow depends on its forward-looking behaviour.
- No file over 300 lines. TypeScript strict, no `any`.
- `ls` any app file you touch and paste the output — grep has false-negatived on this filesystem.

## Verify — paste output, not descriptions

- [ ] Screenshot the selector showing **2026, 2025, 2024, 2023, 2022, 2021** plus All.
- [ ] Click 2021. Screenshot. It must show **54 invoices, R224,389 billed** — that is the year that
      was completely unreachable before.
- [ ] From 2021, click straight back to 2026. **This is the actual bug**: prove the ladder now goes
      both ways.
- [ ] Confirm **no 2027 or 2028 button** appears on the finance page.
- [ ] Confirm cashflow still shows its forward years — you must not have broken it by sharing a
      helper.
- [ ] Pick any one year and paste its total before and after your change. They must be identical.
      This is the regression that matters; the numbers must not move.
- [ ] Select a month, then change year. Confirm the month stays selected.
- [ ] App: same fix, or a clear statement that it was already correct. Say which device you checked.
- [ ] `npx tsc --noEmit` clean in both repos; `npm run preflight` passes.

### Prove it reached the remote
- [ ] `git log origin/main -1` matches `HEAD` in **both** repos — paste both hashes.
- [ ] Vercel **Ready** on **`diedericksdobermanns-web-v145`**. That is now the only project — the
      three duplicates were deleted on 1 Sep, so a red build genuinely means broken.

## Commit
Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`,
`scripts/send-portal-invite-emails.mjs`.
