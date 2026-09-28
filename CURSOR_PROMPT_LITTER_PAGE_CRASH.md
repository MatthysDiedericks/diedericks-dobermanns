# Cursor Prompt — The litter page crashes on a real litter

## Do this first

1. Repo: `diedericksdobermann-web`.
2. `npx tsc --noEmit` when done. Paste the real output.

---

## What happened

```
22 Sep 2026, 06:37-06:39 UTC  (08:37 SAST)
/admin/litters/11111111-1111-4111-8111-111111111001
PAGE_RENDER  severity: error  actor: admin  render: server
Minified React error #441
digest 3477876745
8 occurrences in 2 minutes, all unresolved
```

Matt hit it, retried seven times, got the same crash each time. It is still failing.

## Read this before you touch anything

**That UUID is not test data.** It looks like a fixture because it is all 1s, and the obvious
assumption is that someone seeded a fake row. It is wrong.

There are **24 litters** with IDs in the `11111111-1111-4111-8111-1111111110xx` range. They are the
entire DogBreederPro history, imported on 20 July 2026 with deterministic sequential UUIDs so the
import could be re-run without creating duplicates. Between them they carry **155 real puppies**.

The one that crashes is **`...001` — Claire x Santini, born 10 July 2026, 10 puppies, go-home
6 September 2026.** Matt's most recent whelped litter.

**Do not delete it. Do not "clean up test data". Do not regenerate the IDs.**

## What I ruled out

The row is not malformed. Checked live:

| | |
|---|---|
| dam / sire | Claire (female) / Santini (male) — both present, both correct sex |
| `actual_date` | 2026-07-10 |
| `go_home_date` | 2026-09-06 |
| puppies linked | 10 |
| puppies with no date of birth | 0 |
| puppies with no sex | 0 |
| `heat_cycle_id` | **null** |
| `pairing_id` | **null** |

The two nulls are the only thing unusual, and they are worth looking at first: an imported litter has
no heat cycle and no pairing record, because it predates both features. **A tab that assumes every
litter came from a planned pairing will throw on all 24 imported litters.**

The live deploy is `59d320f`. The litter detail page gained a lot recently — the whelping flow, the
weights grid, financials, contracts, handover packs, the guide lead. One of them is the culprit.

## Task

### 1. Get the actual error, do not guess it

The digest is **3477876745**. Vercel: the project, Logs, filter on that digest. It gives the
unminified message and the component. React 19 minifies in production, so `#441` on its own is not a
diagnosis.

**Do not start fixing before you have read that line.** Paste it into your report.

### 2. Reproduce it locally

```
/admin/litters/11111111-1111-4111-8111-111111111001
```

against the live database. It fails every time, so there is nothing intermittent to chase.

If it does not reproduce locally but still fails in production, say so — that difference is itself
the finding, and usually means a production-only code path such as minification, a missing env var,
or a server/client boundary that only breaks when bundled.

### 3. Fix the cause, not the symptom

Whatever it is, the fix must hold for **all 24 imported litters**, not just this one. They all have
null `heat_cycle_id` and null `pairing_id`.

**A missing heat cycle or pairing is normal, not an error.** Every litter bred before those features
existed has neither, and so will every litter entered by hand. A tab with nothing to show should
render *"No heat cycle recorded for this litter"* and stop. It must never throw, and it must never
render an empty panel with no explanation.

### 4. Make one bad tab stop taking the page down

This is the part that matters beyond today. A litter page is a dashboard of eight or nine tabs. One
of them failing should cost Matt that tab, not the whole record.

Wrap each tab in an error boundary that renders *"This section could not load"* with a Retry, and
logs to `error_events` with the tab name in the message. He keeps the puppies, the weights and the
photos even when financials breaks.

### 5. Walk the rest of them

Load all 24 imported litters plus three recent hand-entered ones and confirm each renders. **List
every one you loaded and its result** — not a summary. If a second one fails for a different reason,
that is a separate finding and I want to see it.

### 6. Tests

- The litter page renders with `heat_cycle_id` null and `pairing_id` null
- A tab that throws is caught by the boundary and the rest of the page survives
- The boundary writes an `error_events` row naming the tab

---

## Do not

- Do not delete, rename or re-key any `11111111-...` litter. They are 24 real litters and 155 real
  puppies.
- Do not "fix" it by hiding the tab for imported litters. Find out why it throws.
- Do not guess what React error #441 means. Read the Vercel log.
- Do not mark the `error_events` rows resolved until the page loads.
- Do not create test litters in production.

---

## Report

1. The unminified error from Vercel, with the component named.
2. The cause, in one sentence.
3. The fix, and why it covers all 24 imported litters rather than this one.
4. The per-tab error boundary, with a screenshot of a deliberately broken tab not killing the page.
5. The list of 27 litters loaded, each with its result.
6. `npx tsc --noEmit` clean.
