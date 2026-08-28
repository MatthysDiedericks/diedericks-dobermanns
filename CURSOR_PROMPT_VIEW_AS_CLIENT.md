# CURSOR PROMPT — "View as client": see exactly what a buyer sees, read-only

When a client says *"I can't see my documents"* or *"my statement looks wrong"*, Matt currently has
no way to look at their portal. He guesses, or he asks them to send a screenshot. **This builds a
read-only view of any client's portal, from the admin side.**

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Verified live — build on these

- Portal routes live under `src/app/portal/(panel)/` — `invoices` is one of them.
- `src/components/portal/StatementSummary.tsx` renders the statement; `src/app/api/statements/pdf/route.ts` renders the PDF.
- Admin client detail already has `ClientApplicationsSection`, `ClientContractsSection`, `ClientDogsSection`, `ClientGroupsSection`, `ClientInvoicesSection`, `ClientNotesSection`.
- `requireAdmin()`, `is_admin()` and `is_trainer_or_above()` exist. **Never revoke `EXECUTE` on the latter two** — they are used inside RLS policies and doing so took the site down for 6.7 hours in July.
- `audit_log` exists. Use it. Do not create a second audit table.
- There are **8 client accounts** today.

---

## 1 · The rule that makes this worth building — or worthless

**It must show exactly what the client sees. Not approximately.**

If the admin view shows one document more than the client's portal does, Matt will tell a buyer
"it's right there" when it isn't, and the feature has made him *less* informed than having nothing.

**So: do not write new queries for this.** Reuse the **same functions the portal itself calls**,
parameterised by user id instead of reading `auth.uid()` internally. One code path, two callers.

If a portal function currently takes no arguments and reads `auth.uid()` inside, refactor it to
accept an explicit user id and have the portal pass its own. **Two implementations of "what may this
person see" will drift, and the drift will be invisible until it matters.**

Where a page genuinely cannot be reproduced this way, **say so on screen** — *"This section cannot
be previewed"* — rather than showing a best guess.

## 2 · Never create a session as the client

**Do not sign in as the client. Do not mint a token for them. Do not set any cookie that a client
browser could ever receive.**

The admin stays authenticated as themselves. The pages render server-side with the admin's own
session, `requireAdmin()` enforced, and the target client's id passed explicitly.

Route: `/admin/clients/[id]/view-as` — under the admin panel, never under `/portal`.

**Why this matters:** an impersonation feature that issues real client credentials is a
privilege-escalation hole waiting to be found. Nothing here should be capable of producing a session
that belongs to someone else.

## 3 · Read-only, and obviously so

**Every action is disabled.** No upload, no accept quote, no decline, no sign contract, no profile
edit, no payment proof, no message send. Not hidden — **visibly present but inert**, because Matt
needs to see the button the client is describing.

A disabled control shows a tooltip: *"Disabled in preview."*

**A persistent banner across the top, in gold on surface, on every previewed page:**

```
PREVIEW — viewing Jocelyn Makenzie's portal · read only · you are still signed in as Matt   [Exit preview]
```

It must not be dismissible and must not scroll away. **Someone will eventually forget which account
they are looking at, and the cost of that confusion is a wrong decision about a client's money.**

## 4 · Audit every entry

Write to `audit_log` on entry: who previewed, which client, and when.

This is client personal information — contracts, ID documents, financial balances. Under POPIA
that access needs a legitimate purpose and a record. **A feature that reads client PII with no trail
is the one an auditor asks about first.**

Surface it on `/admin/security` alongside the other events, and show a "last previewed" line on the
client's admin record.

## 5 · Where it opens from

A **"View as client"** button on the admin client detail page, beside the existing sections.

Land on the portal home, with the portal's own navigation working inside the preview so Matt can
move between statement, documents, dogs and contracts exactly as the client would.

**Exit returns to that client's admin page**, not to the dashboard — he was in the middle of
something.

## 6 · One thing to fix while you are in here

The statement currently lists the **deposit (17 Aug) before the invoice (19 Aug)**, because the
invoice was raised two days after the payment landed. The closing balance is correct, but read
top-down it briefly shows the client in credit for R10 000 before anything has been charged.

Order statement lines so a charge precedes the payment that settles it where they belong to the same
invoice, or date the invoice from the sale rather than the capture date. **Say which you chose and
why.** The arithmetic is already right — this is about a premium document not reading like an error.

---

## The app

Matt takes these calls on his phone, which is exactly when he needs this.

- Same button on the client record, same preview, same banner, same read-only rules.
- Statement, documents and dogs are the sections worth previewing on mobile.
- **The banner is more important on a small screen, not less** — there is no browser chrome to remind him where he is.

## Rules

- The preview reuses the portal's own data functions. No parallel queries.
- No session, token or cookie is ever created for the client.
- `requireAdmin()` on every preview route.
- Every mutation is disabled, visibly.
- The banner is persistent and non-dismissible.
- Every entry is written to `audit_log`.
- Never revoke `EXECUTE` on `is_admin()` or `is_trainer_or_above()`.
- No file over 300 lines. Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output, not descriptions

- [ ] Previewing Jocelyn Makenzie shows **R65 000 invoiced, R10 000 paid, R55 000 outstanding** — matching `DD-2026-0006` exactly.
- [ ] **Open the same client's portal in a separate browser signed in as that client, and compare the two side by side.** Every section must match — same documents, same dogs, same counts. Paste both lists. **This is the test that decides whether the feature is trustworthy.**
- [ ] A client with **no** dogs and no invoices previews as empty, not as an error, and not showing another client's data.
- [ ] Every action control is present and disabled, with the tooltip.
- [ ] Attempting a mutation by calling the underlying action directly while in preview is **refused server-side**, not merely hidden in the UI. Show the refusal.
- [ ] The banner is visible on every previewed page and cannot be dismissed.
- [ ] Exiting returns to that client's admin page, and Matt is still himself throughout — `auth.uid()` never changes. Prove it.
- [ ] **A non-admin cannot reach `/admin/clients/[id]/view-as`.** Test with a real client account and paste the response.
- [ ] No cookie, token or session for the client is created — inspect the response headers and paste them.
- [ ] Each preview writes an `audit_log` row naming the admin and the client. Show two rows.
- [ ] The preview appears on `/admin/security` and as "last previewed" on the client record.
- [ ] The statement line ordering is fixed, and you have said which approach you took.
- [ ] App: same preview, same banner, same read-only enforcement — test from the app.
- [ ] For each app file, `ls` the path and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. App: `npx tsc --noEmit` exits 0.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel build succeeded — state the status. **Committing is not shipping.**

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: shared portal data functions, the preview route, audit
logging, statement ordering, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
