# CURSOR PROMPT — Scope every portal page to the client, then finish the client tools

**Section 1 is urgent and comes first.** The rest is feature work.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Currency ZAR, `R1 234,56`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

# 1 · URGENT — the portal has no client filter of its own

Opening Josef Kotze's portal shows **128 invoices** — every invoice in the business, including
`DD-2026-0006` (R65 000, shayistea@gmail.com) and `DD-2026-0007` (R60 000,
thebrowroomplz@gmail.com). Josef's own is `DD-2026-0010`, R20 000.

## What was actually verified

**No client has seen another client's data.** Row Level Security blocked it. Tested with Josef's
real session against the admin totals:

| table | exists | Josef can read |
|---|---|---|
| invoices | 128 | **1** |
| quotes | 13 | **1** |
| quote_items | 21 | **2** |
| notifications_log | 192 | **1** |
| applications | 18 | **1** |
| documents | 133 | 41 — 39 public pedigree/DNA/health records, plus **his own 2** proof-of-payment docs (10 exist) |

The exposure is confined to the **admin view-as preview**, which runs under the admin's session, and
to any staff account opening `/portal/*` directly.

## The actual defect

`src/lib/portal/invoices.ts` is written correctly and its own comment states the rule:

```ts
/** Read-only invoice list for this client. Filter by userId — admin RLS would otherwise return every invoice. */
export async function fetchMyInvoices(userId?: string) { … if (userId) q = q.eq("client_id", userId); … }
```

**The `userId` parameter is optional, and the deployed invoices page does not pass it.**
`origin/main:src/app/portal/(panel)/invoices/page.tsx` line 27:

```ts
fetchMyInvoices(),                          // ← no argument, so no filter
fetchClientStatement(supabase, user.id),    // ← this one is scoped
```

The dashboard calls `fetchMyInvoices(userId)` correctly. The invoices page does not.

**These deployed portal pages have the same fault** — verified against `origin/main`:

```
invoices/page.tsx          fetchMyInvoices()
invoices/[id]/page.tsx     fetchMyInvoiceById(id)
quotes/page.tsx            fetchMyQuotes()
quotes/[id]/page.tsx       fetchMyQuoteById(id)
notifications/page.tsx     fetchMyNotifications()
reservation/page.tsx       fetchMyReservation()
application/page.tsx       fetchMyApplication()
training/page.tsx          fetchMyBookings()
```

These already do it correctly — copy them: `page.tsx` (dashboard), `documents/page.tsx`,
`contracts/page.tsx`, `health/page.tsx`, `profile/page.tsx`.

## 1.1 Pass the resolved user id everywhere

Every one of those pages: `const userId = resolvePortalUserId(user.id)` and pass it in. The
`[id]` detail pages must pass it too — a scoped detail fetch is what stops a client opening another
client's invoice by guessing a URL.

## 1.2 Make the parameter required — this is the real fix

Passing the id by hand on 13 pages is a rule someone will forget again, exactly as happened here.

**Change the signature on every `fetchMy*` function from `userId?: string` to `userId: string`.**
TypeScript then fails the build on any page that omits it. `npm run preflight` runs `tsc`, so this
cannot reach production again.

Delete every `if (userId)` guard and filter unconditionally. A missing id must be a compile error,
never a silent full-table read.

Applies to: `fetchMyInvoices`, `fetchMyInvoiceById`, `fetchMyQuotes`, `fetchMyQuoteById`,
`fetchMyNotifications`, `fetchMyReservation`, `fetchMyApplication`, `fetchMyBookings`,
`fetchMyProofsForQuote`, `fetchMyDocuments`, `fetchMyContracts`, `fetchMyDogs`, `fetchMyProfile`,
`fetchMyWaitlistEntries`, `fetchMyDogJourney`.

**Do not weaken any RLS policy.** RLS is what saved this. Belt and braces: the query scopes, and
RLS scopes.

## 1.3 The preview must be honest

The whole point of view-as is checking what a client sees. Right now it shows Matt everything and
tells him nothing is wrong.

- Also fix the greeting: previewing Josef reads **"Welcome back, Felicia"** — the admin's name.
  `src/app/portal/(panel)/page.tsx` line 88 uses `profile` from `requireClient()` (the session user)
  instead of `fullProfile` (the resolved user).

---

# 2 · Remove the waiting list from the client portal

Clients do not need it, and it is currently broken anyway:

```
column waiting_list.client_visible_note does not exist
```

Confirmed against the live schema — `waiting_list` has `preference_notes`, `admin_notes`,
`stage_change_note`, and no `client_visible_note`.

- Remove **Waiting List** from the portal sidebar, the app, and the preview nav.
- Delete the route, or redirect `/portal/waitlist` to `/portal` so an old bookmark is not a 404.
- **The admin waiting list stays untouched** — it is Matt's pipeline and it is not going anywhere.
- Where a client is genuinely on the list with no reservation yet, the dashboard already has
  `WaitingListPlainMessage`. That single line on the dashboard is enough.

---

# 3 · The reservation photo is too big

`src/components/portal/ReservationSummary.tsx` renders the dog photo at full bleed — it fills the
entire viewport and the buyer has to scroll past a close-up of a collar to reach the reservation
details, which are the point of the page.

- Cap it: **max 420px tall**, `object-cover`, `object-position: 50% 30%`, full card width.
- The **details come first** — dog, deposit, balance, go-home date — with the photo beneath as
  support, or beside it on desktop.
- Use `src/lib/thumbs.ts` (`hero` size), **not `next/image`** — Vercel's optimizer returns
  `402 PAYMENT_REQUIRED` on the Hobby plan.

---

# 4 · Health — let the client record their own vet visits

Today the health screen is read-only. Buyers take their puppy to their own vet and Matt never hears
about it, so his records go stale and the portal starts telling a paying client things they know to
be wrong.

## 4.1 The client sets their own reminder

New table `health_reminders`:

```
id, client_id (not null), dog_id (not null), kind ('vaccination'|'deworming'|'vet_visit'|'other'),
title, due_date (not null), note, is_done, done_at, created_at, created_by
```

- RLS: a client reads and writes **only their own rows**. Test it with a real JWT.
- **"Remind me"** on any health item pre-fills the kind, dog and date from that item.
- Reminders show on the health screen and in the dashboard's due list, clearly marked as
  **set by the owner** and visually distinct from the kennel's own schedule.
- Matt sees them on the admin dog profile, read-only. They are the client's notes, not his.
- **Nothing sends automatically.** Show it in the portal and the app. If Matt later wants email or
  WhatsApp, that is a separate decision and he presses send.

## 4.2 The client uploads the vet's paperwork

**No new schema — `documents` already supports this exactly.** Use:

```
entity_type   'health'
category      'vaccination_record' | 'health_certificate' | 'microchip' | 'other'
provided_by   'client'
review_status 'pending'   → Matt sets 'verified' or 'rejected'
client_visible true
is_public      false
```

`provided_by` and `review_status` are already in the schema with the right CHECK constraints — they
were designed for this. Do not invent a parallel table.

- Accept a phone photo or screenshot: **JPEG, PNG, HEIC, PDF**. Compress client-side with
  `browser-image-compression`, which is already a dependency.
- A pending upload shows as **"Sent to Diedericks Dobermanns — awaiting confirmation"**. Never
  "rejected" in red on a client's screen; if Matt rejects it, say what is needed instead.
- Matt gets a queue of pending client uploads in admin, with approve and reject.

---

# 5 · Documents — show the papers a buyer actually asks for

**No migration needed.** `documents_category_check` already allows `microchip`, `pedigree`,
`registration`, `dna_test`, `health_certificate`, `vaccination_record`, `hip_elbow_score`,
`puppy_birth_certificate`, `puppy_guarantee`, `transfer_of_ownership`, `training_certificate`,
`purchase_agreement` and more. The portal simply does not surface them.

Group the client's documents under headings, in the order a new owner needs them:

```
Your puppy      microchip certificate · birth certificate · registration · transfer of ownership
Health          vaccination record · health certificate · hip & elbow · DNA · eye · heart
Breeding        pedigree
Agreements      purchase agreement · puppy guarantee · health warranty
Training        training certificate · training report · PSA certificate
Payments        proof of payment
```

- **Empty categories are not hidden — they are stated.** *"Microchip certificate — not yet on file"*
  tells the buyer what is coming; a missing row tells them nothing.
- Each document: name, date, and a download. Keep the three-tier visibility model as it is.
- **Matt needs a fast way to attach a microchip certificate to a puppy** from the dog profile. Nine
  puppies go home on 6 September and this is the document buyers ask for first.

---

# 6 · Applications — let an existing client apply for another dog

A happy owner coming back for a second Dobermann is the best customer there is, and right now the
portal has no way to let them.

- **"Apply for another dog"** on the application screen and the dashboard, for any client with a
  submitted or approved application.
- Pre-fill everything that does not change — name, address, contact, home environment, vet, references.
  **Do not make a returning client retype what Matt already holds.**
- They fill in only what is specific to the new dog: which dog or litter, sex, colour, purpose, timing.
- It is a **new** `applications` row, never an edit of the old one. The previous application and its
  approval stay exactly as they are.
- Link the applications so Matt sees *"Second application — first dog Puppy 1 (Pink), collected
  6 Sep 2026"*. A returning buyer should be obvious at a glance, and reviewed faster.
- `applications.status` still has **no CHECK constraint**. Add one while you are in here, matching
  the values actually in use.

---

# Out of scope

**Contracts.** Matt is reviewing them himself and will come back with changes. Do not touch
`contracts`, `contract_clauses`, `contract_templates`, or `/sign/[token]` in this prompt.

---

## The app

Website and app must match — this is a standing rule on this project.

- Section 1 applies to the app wherever it reads portal data. **Check every app query scopes to the
  signed-in client and paste what you found**, even if the answer is that it was already correct.
- Waiting list removed from the app nav too.
- Reservation photo capped on the app.
- Health reminders and vet-paperwork upload work on the app — **this is the one that matters most on
  a phone**, because that is where someone standing in a vet's waiting room will photograph a card.
- Document grouping and "apply for another dog" both on the app.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on
this filesystem.**

## Rules

- Every portal query filters by the resolved client id. RLS is the second line, never the only one.
- `fetchMy*` takes a **required** `userId`. No optional parameter, no `if (userId)` guard.
- No RLS policy is weakened anywhere in this work.
- Nothing sends automatically. Matt presses send.
- No `next/image` for Supabase photos — use `src/lib/thumbs.ts`.
- Client-facing wording stays calm. No red for things the client has not done wrong.
- No file over 300 lines. Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output, not descriptions

**Section 1 — do these first**

- [ ] Josef's portal invoice list shows **exactly one** invoice, `DD-2026-0010`. Screenshot.
- [ ] The same in the view-as preview. Screenshot.
- [ ] Sign in as a **second** real client and confirm they see only their own. Name the client.
- [ ] Opening another client's invoice by URL returns **404**, not the invoice. Paste the URL and result.
- [ ] `grep -rn "userId?: string" src/lib/portal src/lib/finance` returns **nothing**.
- [ ] Temporarily drop the argument from one call site and paste the `tsc` error proving the build fails.
- [ ] Re-run the RLS comparison with a real JWT and paste both rows — client counts must stay 1/1/1/1.
- [ ] The preview greeting reads **"Welcome back, Josef"**. Screenshot.

**The rest**

- [ ] Waiting List is gone from the portal sidebar, the app, and the preview. `/portal/waitlist` does not 500.
- [ ] The admin waiting list still works. Screenshot.
- [ ] Reservation photo is capped and the details sit above it. Screenshot on desktop and at 375px.
- [ ] A client sets a reminder on a health item; it appears on the health screen and the dashboard,
      marked as owner-set. Screenshot. Paste the `health_reminders` row.
- [ ] A **second** client cannot read that reminder. Test with a real JWT and paste the result.
- [ ] A client uploads a vaccination screenshot; it lands with `provided_by='client'`,
      `review_status='pending'`. Paste the row. Matt sees it in the pending queue. Screenshot.
- [ ] Documents are grouped, and a missing microchip certificate is **stated**, not hidden. Screenshot.
- [ ] Matt attaches a microchip certificate to Puppy 1 (Pink) from the dog profile; Josef sees it. Screenshot.
- [ ] An approved client submits a second application. Paste **both** rows — the first is unchanged.
- [ ] `applications.status` has a CHECK constraint. Paste it.
- [ ] App: every item above. Say which device.
- [ ] Website: `npm run preflight` passes.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel reaches **Ready** — paste the deployment id.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder.

**Commit and deploy Section 1 on its own, before starting anything else.** Then separate commits
for: waiting list removal, reservation photo, health reminders, client document upload, document
grouping, repeat applications, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
`src/lib/portal/dogs.ts`, `src/lib/portal/training.ts` and `src/lib/portal/buyerJourneySteps.ts` are
otherwise frozen, but **the `userId` signature change in Section 1 applies to them** — that change
only.
