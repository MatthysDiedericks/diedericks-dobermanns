# CURSOR PROMPT — Quotes list: show the buyer, and put Edit/Resend on the row

Two things, and the first is a bug introduced by the buyer-link work.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Bug — a correctly linked quote displays as "Unassigned"

**DD-1137 shows `Unassigned` in the quotes list**, despite being correctly linked to Dwayne
Lombard's contact record. It is the only quote in the system that was linked *properly*, and it is
the only one that looks broken.

`src/components/finance/QuotesTable.tsx` line ~129:

```ts
{q.client?.full_name ?? q.historical_client_name ?? "Unassigned"}
```

and `src/lib/finance/quoteServerQueries.ts`:

```ts
const CLIENT_JOIN = "client:users!quotes_client_id_fkey(full_name, email)";
```

The write path was updated to use `quotes.contact_id`; **the read path was not**. The list joins
`users` only, so a contact-linked buyer resolves to nothing.

**Fix the resolution in one shared helper**, not in each component — this will otherwise be wrong
again in the next place a quote is listed:

```
buyer name  = client (users) → contact → historical_client_name → "Unassigned"
buyer email = client (users) → contact → application email
```

Add the contacts join alongside `CLIENT_JOIN`, excluding merged contacts. Apply the helper
everywhere a quote shows a buyer: the quotes table, `DashboardWidgets.tsx` line ~236, the quote
detail page, the PDF, and the app.

**"Unassigned" must mean genuinely unassigned.** Show a small gold marker beside a buyer who has no
portal account yet — *"no portal account"* — because that is a different and useful fact, and it
tells Matt who to nudge.

## Add Edit and Resend to the list row

Both already exist and work — `updateQuote`, `sendQuoteToRecipient`, and the append-only
`quote_revisions` trail were built in `d43cf12`. **Do not rebuild any of it.** They are only
reachable from the quote detail page, so Matt has to open a quote to do anything with it.

Put them on the row, with the guards that already exist honoured:

- **Edit** → `/admin/quotes/[id]/edit`. Hidden when the quote is `accepted` or converted to an invoice; those already require an explicit reopen with a reason, and the server rejects them regardless.
- **Resend** → the existing send path. Prompts for the change note, bumps to the next revision, re-attaches the PDF.
- **Open** → the detail page.

Keep the row uncluttered: an icon or a compact menu, not three full buttons per row. **Resend must
confirm before sending** — it emails a real client, and a mis-click sends a document.

**Show the revision** when it is above 1: `DD-1135 · rev 2`. Two people looking at the same quote
number and seeing different totals is exactly what the revision trail exists to prevent.

## Small things on the same screen

- **Sent** and **Valid until** are cut off at the right edge on an iPad. Let the table scroll horizontally, or drop `Accepted` on narrow screens — a truncated date is worse than an absent column.
- The **Payment** column is referenced in the header text (*"scan the Payment column for uploaded proof"*) but is not visible at that width. Same fix.
- Sorting by **Status** should group by workflow order — draft, sent, accepted, declined, expired — not alphabetically.

## The app

Same buyer-name helper, same Edit and Resend on the quote row, same confirm before resending.

---

## Rules

- One shared buyer-resolution helper. No component resolves the name on its own.
- Merged contacts are never used as a buyer name.
- Resend always confirms first.
- Do not change the revision, pricing or delivery logic — display and access only.
- No file over 300 lines. `requireAdmin()` on every action.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify

- [ ] **DD-1137 shows "Dwayne Lombard"**, not "Unassigned", in the quotes list, on the dashboard widget, on the detail page and in the PDF.
- [ ] A quote with only `historical_client_name` still shows that name.
- [ ] A quote with genuinely no buyer still shows "Unassigned".
- [ ] A buyer with no portal account carries the "no portal account" marker.
- [ ] Edit opens the editor for a `sent` quote and is hidden on an `accepted` one — and the server still rejects it if the URL is used directly.
- [ ] Resend asks for confirmation, then sends, bumps the revision and stamps `sent_at`.
- [ ] A quote at revision 2 shows `rev 2` in the list.
- [ ] On an iPad width, Sent, Valid until and Payment are all reachable.
- [ ] Sorting by Status follows workflow order.
- [ ] The app shows the same buyer names and the same two actions.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**.
- [ ] App: `npx tsc --noEmit` exits 0.

### Build the commit, not the working tree

```powershell
git clone --no-hardlinks . ../_buildcheck
cd ../_buildcheck; git checkout <commit you are about to push>
npm ci; npx next build
cd ..; Remove-Item -Recurse -Force _buildcheck
```

- [ ] The clean checkout builds.
- [ ] If this needs a migration, **apply it and confirm the columns exist in the live database before reporting done.** Migration 0074 was written and deployed but never applied, and the quote builder would have failed on first save.
- [ ] After pushing, report Vercel status. **Do not request GitHub or Vercel authentication** — Matt reads the dashboard.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Push both, then `git log origin/main -1` in each and confirm it matches `HEAD`.

Do not modify (committing is fine): `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/lib/issues/capture.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
