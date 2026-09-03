# CURSOR PROMPT — Buyer journey: 8 steps, and say the quiet parts out loud

The journey breadcrumb already exists and is well built — `JourneyBreadcrumb`, derived from real
records rather than a stored counter, rendered in three places on each surface. **Do not rebuild
it.** This changes the step list and the derivation, nothing else.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Brand `#111008 / #1C1A0E / #C4A35A / #F5F0E8`, Cinzel/Lato.
**No migration.** Every input below is derivable from tables that already exist.

---

## Why this matters more than it looks

Seven clients have created accounts on this system. Until 08:10 today, **not one had ever signed
in.** They stalled in a gap the journey does not admit exists: it jumps from "we review it" straight
to "quotation issued to your portal", as though getting into the portal were automatic. It is not,
and that gap is where the entire client base has been stuck.

Step 3 below is the fix for that. It is the most important line in this prompt.

## The new list

Replace `BUYER_JOURNEY_STEPS` in `src/lib/portal/buyerJourneySteps.ts` (and the app's copy):

```ts
export const BUYER_JOURNEY_STEPS = [
  "Application submitted",              // 1
  "Application approved",               // 2
  "Open your portal",                   // 3  ← new, and the one that matters
  "Quotation issued — pay your deposit",// 4
  "Upload your proof of payment",       // 5
  "Invoiced and added to the waiting list", // 6  ← new
  "Your puppy is allocated",            // 7
  "Go-home day",                        // 8
] as const;

export type BuyerJourneyStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
```

Three deliberate changes beyond adding steps:

**Step 2 says "approved", not "we review it personally".** A client Matt has actually approved
currently sees the same words as one still waiting. Being accepted by a breeder who screens people
is the moment a buyer commits — say it. While the application is still `submitted`, the label for
step 2 should read **"We review it personally"**; once it is `approved`, it reads **"Application
approved"**. Same step number, label chosen by status.

**Step 4 merges the quotation and the deposit** because they are one action to the client: here is
the amount, please pay it.

**Step 6 reflects the real order — pay first, then invoice.** Matt invoices *after* payment lands, and
the waiting-list place is created at the same moment. That is now enforced in the database by
`trg_waiting_list_require_payment`, so this step is a genuine earned milestone, not decoration.

## Step 6 is skippable, and must look it

If a puppy is available immediately, the client never joins the waiting list — they go from proof of
payment straight to allocation. Render a skipped step **greyed with an em-dash instead of a number**,
not as a tick and not as pending. A client who was allocated a puppy at once should not see an
unfinished step behind them, and one who is waiting should not see a step they never passed through.

## The derivation

Extend `BuyerJourneyInput` and `deriveBuyerJourneyStep`:

```ts
export type BuyerJourneyInput = {
  hasApplication: boolean;
  applicationStatus: string | null;
  applicationApproved: boolean;   // new
  portalAccessed: boolean;        // new
  hasQuoteSent: boolean;
  hasQuoteAccepted: boolean;
  hasProofUploaded: boolean;
  paymentConfirmed: boolean;
  onWaitingList: boolean;         // new
  dogAllocated: boolean;
  goneHome: boolean;              // new
};
```

Derive highest-reached-first, as it does now. Sources:

- `applicationApproved` → `applications.status = 'approved'`
- `portalAccessed` → **the viewer has a session.** On the portal this is always true, so step 3 shows
  done. On the public apply-success page and in the confirmation email it is false, which is exactly
  where the client needs to see it. Do not over-engineer this into a stored flag.
- `onWaitingList` → a `waiting_list` row for this client or contact
- `goneHome` → `dogs.handover_status = 'delivered'` or `delivered_at` set on their dog

Keep the existing rule in the file header: **derived from real records, never a stored counter,
which would drift the moment anything is done by hand.** That comment is correct and earned.

## Where it renders

Already wired in both repos — do not add new call sites, just make sure each passes the new inputs:

- website: `src/components/forms/ApplicationForm.tsx`, `src/app/portal/(panel)/page.tsx`,
  `src/app/portal/(panel)/application/page.tsx`
- app: `app/(portal)/dashboard.tsx`, `app/(portal)/application-status.tsx`,
  `hooks/useBuyerJourney.ts`, `lib/portal/buyerJourney.ts`

**Eight steps will not fit across a phone.** The website component already falls back to a vertical
list below `md`. Check the app does the same and does not squeeze eight labels onto one row.

## Also put it where they will actually see it

The breadcrumb only helps someone already looking at it. Add a plain-text version of the **current
step and the next one** to the application confirmation email — the one they receive on submit,
before they have ever reached the portal. Two lines, no images, no table:

> **Where you are:** Application submitted.
> **Next:** We review every application personally. You will hear from us, and we will send you a
> 6-digit code to open your portal.

Do not restructure that email or add anything else to it.

## Rules
- Display and derivation only. **No table changes, no writes, no new records.**
- Do not touch `trg_waiting_list_require_payment` or `client_has_payment` — they were verified
  working on 1 Sep and the gate is correct.
- Both repos, TypeScript strict, no file over 300 lines.
- `ls` each app file you touch and paste the output — grep has returned false negatives on this
  filesystem, including on this exact component today.

## Verify — paste output, not descriptions

Use these **real** clients; do not create test rows. Cursor has previously left `VERIFY` rows on a
real client's ledger on this project.

- [ ] **Henko Burden** (`henko@atlasstaal.co.za`) — approved application, 2 quotes sent, no payment.
      Should sit on **step 4**. Screenshot his portal dashboard.
- [ ] **Ronel Emmenes** (`perfumebox24@gmail.com`) — application `submitted`, not approved, never
      signed in. Confirm step 2 reads **"We review it personally"**, not "approved".
- [ ] Approve Ronel's application in a transaction, re-render, confirm step 2 flips to **"Application
      approved"**, then roll it back. Paste before and after.
- [ ] The public apply-success page shows step 3 **"Open your portal"** as the next action, not as
      complete. Screenshot — this is the gap that stranded seven clients.
- [ ] A client with a `waiting_list` row: step 6 shows reached. Screenshot.
- [ ] A client allocated a puppy with **no** waiting-list row: step 6 shows **skipped (em-dash)**,
      not ticked, not pending. Screenshot. This is the case most likely to be got wrong.
- [ ] Mobile width: eight steps stack vertically on both surfaces. Screenshot each.
- [ ] Paste the confirmation email body showing the two "where you are / next" lines.
- [ ] `npx tsc --noEmit` clean in both repos; `npm run preflight` passes.

### Prove it reached the remote
- [ ] `git log origin/main -1` matches `HEAD` in **both** repos — paste both hashes.
- [ ] Vercel **Ready** on **`diedericksdobermanns-web-v145`**. That is now the only project; the
      three duplicates were deleted on 1 Sep, so a red build genuinely means broken.

## Commit
Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`,
`scripts/send-portal-invite-emails.mjs`.
