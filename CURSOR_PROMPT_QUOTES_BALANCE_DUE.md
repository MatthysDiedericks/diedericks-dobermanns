# CURSOR PROMPT — Show the balance still owed on the Quotes list

Matt is reading the Quotes list to find out who still owes money and cannot see it. Today that answer
lives only inside each linked invoice, so finding it means opening quotes one at a time. Every figure
needed is already in the database — nothing new has to be stored.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns`. The app quotes list gets the same
column; parity is a standing rule on this project and CI now enforces it.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Brand `#111008 / #1C1A0E / #C4A35A / #F5F0E8`, Cinzel/Lato.
**No migration. No schema change. No new tables.**

---

## Where the number comes from

`invoices.quote_id` links an invoice back to its quote. The invoice already carries `total_amount`,
`amount_paid` and `amount_outstanding` (a generated column — read it, never write it).

Verified against live data on 4 Sep 2026: every **accepted** quote has exactly one linked invoice, and
every **sent** quote has none. Current state is 8 quotes owing **R246,000**, 3 fully paid, 11 sent
with no invoice yet.

Extend the existing quotes list query with a left join to `invoices` on `quote_id`. **Left join, not
inner** — a quote with no invoice must still appear.

## The column

Add **Balance due**, to the right of Total.

- **Invoice exists and `amount_outstanding` > 0** → the amount, in gold `#C4A35A`, same money
  formatting as the Total column (`R 45 000,00`).
- **Invoice exists and `amount_outstanding` = 0** → the word `Paid`, in the same green as the
  ACCEPTED chip. Not `R 0,00`.
- **No invoice yet** → an em dash `—` in muted text.

**Never print `R 0,00` for a quote with no invoice.** A quote that has been sent but not accepted owes
nothing yet; showing zero makes it look settled and is the one way this column can mislead.

## Totals — Matt asked for these specifically

**Two places, both computed, never hard-coded.**

**1. A line beside the existing header** ("22 total — scan the Payment column for uploaded proof."):

`R246 000,00 outstanding across 8 quotes`

Omit it entirely when nothing is owed.

**2. A totals row pinned to the bottom of the table.** Three figures so the row reconciles and Matt
can check it against his bank:

| | Total | Paid | Balance due |
|---|---|---|---|
| **8 quotes owing** | R350 000,00 | R104 000,00 | **R246 000,00** |

- Style it as a footer row: top border in gold `#C4A35A`, bold, same money formatting as the rows
  above. Visibly part of the table, not a floating card.
- **Total only the rows currently on screen.** If a filter or search is applied, the total must
  reflect that filter — a total that ignores the filter is worse than no total, because it silently
  contradicts what he is looking at. When the filter is DRAFT or SENT the balance total will be R0
  and the row should say so rather than disappearing.
- Quotes with no invoice contribute **nothing** to the Paid and Balance columns, but their quote
  value **does** count toward Total.
- On the app, pin it as the `FlatList` footer so it stays visible after scrolling.

Make the column sortable, alongside the existing Newest / Status / Total sorts. Sorting by balance
should put the largest amount owing first — that is the order Matt will actually use it in. Quotes
with no invoice sort last regardless of direction; they are not "zero", they are "not applicable".

## Rules
- Read `amount_outstanding`; do not recompute `total_amount - amount_paid` in the UI. The database
  already derives it and a second formula will drift.
- Pass `userId` into every scoped query. The portal scoping bug on 26 Aug came from a screen that
  omitted it.
- One query. Do not fetch invoices per row — that is what made sign-in slow.
- TypeScript strict, no `any`, no file over 300 lines. The app list stays a `FlatList`.
- `ls` every file you create and paste the output.

## Verify — paste output, not descriptions

Use the real records. **Do not create test quotes or invoices** — Cursor has previously left `VERIFY`
rows on a real client's ledger on this project.

- [ ] Screenshot the website Quotes list showing the new column. **DD-1139 must read R55 000,00,
      DD-1158 R45 000,00, DD-1163 R5 000,00, and DD-1156 must read `Paid`.**
- [ ] Confirm the 11 sent quotes show `—` and not `R 0,00` — say how many you counted.
- [ ] Screenshot the app quotes list showing the same figures.
- [ ] Sort by balance on both and screenshot the top row.
- [ ] Paste the header summary line exactly as rendered.
- [ ] Screenshot the totals row. It must read **R350 000,00 / R104 000,00 / R246 000,00** on the
      unfiltered list.
- [ ] Apply the SENT filter and screenshot the totals row again — the balance must fall to R0,00 and
      the row must still be visible.
- [ ] `npx tsc --noEmit` clean on the website; on the app, no new errors beyond the known set — paste
      the count before and after.
- [ ] `node scripts/check-parity.mjs --strict` — paste the exit code. Must be `0`.
- [ ] `npm run preflight` passes in both repos.

### Prove it reached the remote
- [ ] `git log origin/main -1` matches `HEAD` in **both** repos — paste both hashes.
- [ ] Vercel **Ready** on `diedericksdobermanns-web-v145`.

## Commit
One commit per repo. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the **parent**
folder.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`,
`scripts/send-portal-invite-emails.mjs`.
