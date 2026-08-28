# CURSOR PROMPT — Let an elite quote go out without a delivery charge

Matt could not send **DD-1140 — Reef Scott, R60 000, elite** because of delivery validation. He does
charge delivery on elite pups as a rule, but he must be able to quote one **without** it when the
buyer is collecting or when delivery is agreed separately.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Currency ZAR.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## What is actually wrong — I read the code and the live data, do not re-diagnose

**The elite rule is NOT a hard lock and must not be removed.**
`defaultDeliveryDecision()` in `src/lib/finance/catalogue.ts` returns `decision: "charged"` for
`elite_developed` and `protection_dog`. That is a **default**, applied when the quote is built.
`DeliveryDecisionFields.tsx` contains no `disabled` and no elite branch — Matt can already change it.
**Keep the default. It protects revenue and it is the correct business rule.**

**The real blocker is a stale delivery line.**

`syncDeliveryLine()` in `src/lib/finance/quoteDelivery.ts` handles `"included"`, `"charged"` and
`"to_be_confirmed"`. For **`"collection"` and `"not_applicable"` it returns `items` unchanged** —
so a delivery line added under the earlier default just sits there.

`lineFromCatalogue()` creates catalogue lines with **`allowZeroPrice: false`**. A delivery line with
no amount then fails line validation in `prepareQuoteLines.ts` with **"Description and amount are
required."**

**Confirmed live on DD-1140:** status `draft`, `delivery_decision = 'not_applicable'`,
**1 delivery line, amount R0.** Matt set the decision correctly. The leftover line blocked him, and
the error he saw did not mention delivery at all — so there was nothing to tell him what to do.

---

## 1 · Switching to collection or not-applicable must clear the delivery line

In `syncDeliveryLine()`, add explicit handling for `"collection"` and `"not_applicable"`:

**Remove the delivery line entirely.** Not zero it, not hide it — remove it. A quote where the buyer
collects should have no delivery row on the PDF at all; a R0 line invites the question *"why is
delivery on here?"* at exactly the wrong moment.

If the line carries a hand-typed description Matt clearly wrote himself, keep the line but set
`allowZeroPrice: true` so it can pass at R0 — **never silently delete something a person typed.**

## 2 · "To be confirmed" must not demand an amount

`assertDeliveryReadyToSend()` blocks send when the decision is `charged` **or `to_be_confirmed`**
and there is no amount above zero.

**Requiring an amount on a decision literally named "to be confirmed" is self-contradictory.** That
option exists precisely for the case where the figure is not known yet.

- `to_be_confirmed` → **may send with no amount.** The quote shows: *"Delivery / travel — to be confirmed, quoted separately."*
- `charged` → still requires an amount. That one is correct: if you say you are charging, say how much.

## 3 · The error must name the way out

Current message when send is blocked:

> Delivery is marked charged / to be confirmed — enter an amount on the delivery line before sending.

It names one escape and Matt hit a different error entirely. Replace with a message that offers both
routes:

> **Delivery is marked "charged" but has no amount.** Either enter the delivery amount, or change
> the delivery decision to **Collection** or **Not applicable** if the buyer is collecting or
> delivery is being agreed separately.

And when a **line-level** validation fails on a delivery line specifically, say so rather than the
generic "Description and amount are required" — name the line and the fix.

**A blocked send that does not say how to get unblocked is the defect.** Matt lost a live R60 000
quote to a message that described the wrong problem.

## 4 · Show the elite default as guidance, not an obstacle

When the elite default sets `charged`, show the reason near the field as helper text, not an error:

> Elite and protection dogs do not include delivery — charge it, or switch to Collection if the
> buyer is collecting.

**It should read as a reminder of Matt's own rule, not as the system refusing him.** He sets the
policy; the software reminds him of it.

## 5 · A second quote was lost, and it left no trace at all

Matt also lost a quote for **Tim Hastie**. This one is worse than Reef Scott's, and it is a
**different failure**.

Verified live:

- **No quote for Tim Hastie exists.** Not draft, not deleted.
- Quote numbers run **DD-1133 → DD-1140 with no gaps**, so nothing was created and removed.
- `audit_log` shows quote activity only for DD-1140.
- **`error_events` has nothing in the last six hours.**

So the quote never reached the database, and **nothing anywhere recorded why**. Reef Scott's at least
saved as a draft. Tim's work simply disappeared.

**The quote builder has no error trail.** The apply route was instrumented this morning with
`APPLY_*` codes; the quote builder was not. Do the same here:

| Code | When |
|---|---|
| `QUOTE_VALIDATION_FAILED` | which field or line, and why |
| `QUOTE_SAVE_FAILED` | Postgres `sqlstate` and message |
| `QUOTE_SEND_FAILED` | the send-time reason |
| `QUOTE_UNHANDLED` | anything else, with the stack |

Record the buyer, the line count and the step reached. **No buyer PII in the log** — names and
presence of fields only, consistent with the apply route.

### Never lose typed work again

**Autosave the draft as the quote is built.** Matt assembles a R60 000 quote line by line; losing it
to a failed save, a refresh or a dropped connection is not acceptable, and he will not notice it has
gone until the buyer asks.

- Save the draft on line changes, debounced.
- If a save fails, **say so on screen immediately** — never fail silently — and keep the work in the form so it can be retried.
- A quote that cannot be saved must still be recoverable by the person who typed it.

**This is the actual lesson from both losses:** a quote that fails to send is an annoyance, but a
quote that fails to save is a customer who never gets a price.

## 6 · Fix DD-1140

Once built, send Reef Scott's quote through the UI. Report the outcome.

Then **rebuild Tim Hastie's quote** so Matt can send it — he is on the waiting list at stage
`application` with no litter assigned.

---

## The app

Quotes are built on the website, but the same validation modules are shared. **Confirm nothing in
the app relies on the old behaviour**, and that a quote saved on the app with `collection` or
`not_applicable` carries no delivery line.

If quote building is website-only, say so and skip — **but say so explicitly rather than leaving it
unstated.**

## Rules

- **Do not remove the elite delivery default.** It stays `charged`.
- `collection` / `not_applicable` → delivery line removed, unless hand-written, then R0-allowed.
- `to_be_confirmed` → sends with no amount.
- `charged` → still requires an amount.
- Every blocked send names the specific line and the way out.
- Never silently delete text a person typed.
- No file over 300 lines. Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output, not descriptions

- [ ] **DD-1140 (Reef Scott, R60 000) sends successfully.** Paste the resulting `status` and `sent_at`.
- [ ] Building a new elite quote still defaults the decision to `charged` with the reason shown as helper text.
- [ ] Switching that quote to **Collection** removes the delivery line — show the line count before and after.
- [ ] Switching to **Not applicable** does the same.
- [ ] A delivery line with a hand-typed description is **kept** at R0, not deleted.
- [ ] `to_be_confirmed` with no amount **sends**, and the quote PDF reads "to be confirmed, quoted separately".
- [ ] `charged` with no amount is still refused, with the new message naming both escapes. Paste the message.
- [ ] A delivery line failing validation names the delivery line, not the generic "Description and amount are required".
- [ ] An elite quote **with** a real delivery charge still totals correctly — R60 000 + delivery. Show the maths.
- [ ] The three already-sent quotes with `delivery_decision = 'included'` (DD-1137, DD-1138) are unaffected. Re-open and confirm.
- [ ] Standard Puppy quotes still default to delivery included.
- [ ] Each of the four `QUOTE_*` codes writes to `error_events` — trigger all four and paste the rows.
- [ ] No buyer name, email, phone or address appears in any `QUOTE_*` row. Show one.
- [ ] Building a quote and killing the connection mid-way leaves the work recoverable — the draft is saved or the form still holds it. Describe what you did to test this.
- [ ] A failed save shows an immediate on-screen error. **It must never fail silently.**
- [ ] Tim Hastie's quote has been rebuilt and is sendable. Paste the quote number.
- [ ] App: confirmed unaffected, or updated — say which.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. App: `npx tsc --noEmit` exits 0.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel build succeeded. **Committing is not shipping.**

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: the sync fix, the to-be-confirmed relaxation, the error
messages.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
