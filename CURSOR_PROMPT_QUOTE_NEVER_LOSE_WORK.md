# CURSOR PROMPT — A quote must never disappear without a trace

**You already did the delivery work in `CURSOR_PROMPT_QUOTE_DELIVERY_RELAX.md`, and it is correct.**
`syncDeliveryLine` now handles `collection` and `not_applicable`, `to_be_confirmed` no longer demands
an amount, and the new message names both escapes. That is verified and live — **do not redo it.**

**Section 5 of that prompt was skipped.** This task is only that section.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Why this matters — a real quote was lost and there is still no evidence

Matt built a quote for **Tim Hastie** and it vanished. Verified against the live database at the time:

- **No quote for him existed** — not a draft, not deleted
- Quote numbers ran **DD-1133 → DD-1140 with no gaps**, so nothing was created and removed
- `audit_log` had no row for it
- **`error_events` had nothing**

He rebuilt it the next morning as **DD-1141** and it went out fine. But the original work was simply
gone, and **nothing anywhere recorded why.**

**Confirmed still missing today:**

```
grep QUOTE_ in src        → only QUOTE_LABELS, QUOTE_STATUSES, QUOTE_TOTAL_MISMATCH,
                             QUOTE_VALIDITY_DAYS, QUOTE_LINE_DROPPED  (pre-existing constants)
quoteBuilderSave.ts       → no logError, no error_events, no captureIssue
autosave / draft recovery → no match anywhere in src/lib/finance or src/components/finance
```

**A quote that fails to send is an annoyance. A quote that fails to save is a customer who never
gets a price** — and Matt only finds out when the buyer goes quiet.

---

## 1 · Instrument every failure path in the quote builder

The apply route was instrumented on 19 Aug with `APPLY_*` codes and it worked — Cursor's own test
run produced `APPLY_VALIDATION_FAILED`, `APPLY_HONEYPOT`, `APPLY_TOO_FAST`, `APPLY_UPLOAD_FAILED`,
`APPLY_DB_ERROR` and `APPLY_UNHANDLED` rows in `error_events`. **Follow that exact pattern here.**

Every path in quote save and quote send that returns anything other than success writes to
`error_events` **before it returns**:

| Code | When |
|---|---|
| `QUOTE_VALIDATION_FAILED` | which field or line index failed, and why |
| `QUOTE_SAVE_FAILED` | the Postgres `sqlstate` and message |
| `QUOTE_SEND_FAILED` | the send-time reason, including email failures |
| `QUOTE_UNHANDLED` | anything else, with the stack |

Record: the step reached, the **line count**, the quote number if one was allocated, and whether a
contact was attached.

**No buyer PII.** Field names and whether they were populated — never names, emails, phone numbers,
addresses or amounts tied to a person. Same rule as the apply route; match its redaction helper
rather than writing a second one.

**Reuse `error_events`. Do not create a table.**

## 2 · Autosave the draft as it is built

Matt assembles a R55 000–R65 000 quote line by line. Losing it to a failed save, a refresh, a
closed laptop or a dropped connection is not acceptable.

- **Save the draft as lines change**, debounced — around 2 seconds after typing stops.
- The quote already saves as `draft` before it is sent, so **extend that path rather than inventing a second one.** Two save paths will drift.
- Show a quiet state indicator: *"Saved"* / *"Saving…"* / *"Not saved — retrying"*. Small, near the total. **Not a toast** — Matt should be able to glance at it, not chase a notification that has already gone.

### When a save fails

- **Say so immediately, on screen.** Never fail silently.
- **Keep the work in the form.** The user must be able to retry without retyping anything.
- Offer a retry that does not lose the current state.
- Write `QUOTE_SAVE_FAILED` with the reason.

**The failure mode to design against is not a crash — it is a save that quietly does nothing while
the screen still looks fine.** That is what happened to Tim's quote.

## 3 · Recover an interrupted draft

If the builder is opened and an unsent draft exists for that buyer, offer it:

> Unsent draft from 14:35 — 2 lines, R60 000. **Resume** · **Start fresh**

**Never silently resume**, and never silently discard. Matt must choose, because a stale draft
loaded without warning is how the wrong price reaches a buyer.

---

## The app

`AppQuoteBuilder` was updated in the last run, so quotes can be built on the app too.

- Same four `QUOTE_*` codes from the app's save and send paths.
- Same autosave and the same save-state indicator.
- **Autosave matters more on a phone** — a call comes in mid-quote and the app is backgrounded. Save on background, not only on typing pause.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**

## Rules

- Do not touch the delivery logic — it is correct and live.
- Reuse `error_events`; no new table.
- No buyer PII in any log row.
- One save path, extended — not a second one.
- A failed save always shows on screen and always keeps the work.
- Never silently resume or discard a draft.
- No file over 300 lines. Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output, not descriptions

- [ ] All four `QUOTE_*` codes appear in `error_events` — trigger each one deliberately and paste the rows.
- [ ] **No buyer name, email, phone, address or personal amount appears in any `QUOTE_*` row.** Show one row in full.
- [ ] Build a quote, kill the network mid-build, and confirm the work is still in the form with an on-screen error. **Say exactly how you simulated it.**
- [ ] With the network restored, retry succeeds without retyping. Paste the saved row.
- [ ] Typing a line and waiting 3 seconds writes a draft — show the row and its `updated_at`.
- [ ] The save-state indicator shows Saving → Saved, and shows the failure state when a save fails.
- [ ] Reopening the builder with an unsent draft offers **Resume / Start fresh** and does neither automatically.
- [ ] Choosing "Start fresh" does not delete the old draft until the new one is saved.
- [ ] **The delivery behaviour is unchanged:** a `collection` quote still has no delivery line, `to_be_confirmed` still sends with no amount, and `charged` with no amount still shows the two-escape message. Re-test all three and paste the results.
- [ ] DD-1141 (Tim Hastie, sent) is untouched and still visible in his portal.
- [ ] App: same codes, same autosave, and backgrounding the app mid-quote does not lose work. Test on a device and say which.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. App: `npx tsc --noEmit` exits 0.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel build succeeded — state the deployment id. **Committing is not shipping.**

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: error instrumentation, autosave, draft recovery, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
