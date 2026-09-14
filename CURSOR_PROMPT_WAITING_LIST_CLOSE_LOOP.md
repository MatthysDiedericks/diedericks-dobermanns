# CURSOR PROMPT — Waiting List scope + client "received" confirmation

**Repo:** `diedericksdobermann-web` (mirror to the app per the standing parity rule).
**Supabase:** `nlmwxodvquwbjinhhbmr`. Brand: bg `#111008`, gold `#C4A35A`, Cinzel / Lato.

---

## Read this first — the fulfilment side already exists, do not rebuild it

`/admin/fulfilment` (`src/app/admin/(panel)/fulfilment/`) already has three tabs — Paid &
waiting, Allocated not delivered, Delivered — and `updateDogHandover()` in
`src/app/admin/(panel)/fulfilment/actions.ts` already does the admin-side "tick that it was
delivered on this date": it stamps `dogs.handover_status`, `handover_date`, `delivered_at`,
`delivery_method`, `delivery_notes`, and moves the matching `waiting_list` row's
`pipeline_stage` to `handover_complete`. **This has just never been used** — `handover_status`
is `null` on all 173 dogs. Do not write a second "mark delivered" path.

The pipeline stages already exist in `src/lib/waitlist/pipeline.ts`:
`enquiry → application → approved → quote_sent → deposit_paid → matched → reserved →
handover_complete`, plus terminal `on_hold / do_not_sell / withdrawn`.

The two real gaps are below.

---

## 1. Waiting List page shows the whole CRM pipeline — narrow it

`src/app/admin/(panel)/waitlist/page.tsx` currently queries **every** `waiting_list` row with
no default filter, so enquiry/application/approved/quote_sent people (who haven't paid a
cent) sit in the same list as clients who paid a deposit and are actually waiting for a dog.
Matt's rule: **only a recorded payment earns a place on this list.**

- Change the default query (no `?stage=` param) to only include
  `pipeline_stage in ('deposit_paid','matched','reserved')`.
- Remove the `enquiry`, `application`, `approved`, `quote_sent` stage-filter chips from this
  page entirely — those prospects are already tracked on `/admin/applications` and
  `/admin/quotes`; they do not need a second home here.
- `handover_complete` and the three terminal stages (`on_hold`, `do_not_sell`, `withdrawn`)
  must **never** appear on this page, regardless of any filter — delivered dogs belong on
  `/admin/fulfilment`'s Delivered tab, which already exists.
- `src/app/admin/(panel)/waitlist/follow-ups/page.tsx` queries `waiting_list` independently
  by `follow_up_date`, not through this page's rows — leave it exactly as is, it still needs
  to reach pre-deposit prospects for chasing.
- Add a link from `/admin/waitlist` to `/admin/fulfilment` next to the existing Match /
  Follow-ups links, labelled "Fulfilment" — right now nothing points to it.

## 2. Client-facing "I've received my puppy" — the one missing piece

Nothing today lets a client say they've got their dog. Add a button in the client portal
(`src/app/portal/(panel)/dogs/`), on a dog's detail view, shown only when
`dogs.handover_status` is `'ready'` or `'scheduled'` (i.e. delivery is imminent/arranged) and
`delivered_at` is still null:

> **"I've received my puppy"**

On tap:

- Do **not** set `handover_status = 'delivered'` directly from the client side — delivery is
  an admin-confirmed fact (it can trigger contract/pedigree-transfer steps), the same reason
  `PAYMENT_PROOF_UPLOADED` is a client-raised flag that an admin still actions, not an
  auto-completing payment.
- Instead: log it the same way, via `logError()` (`src/lib/errors/logError.ts`) with a new
  code `DELIVERY_CONFIRMED_BY_CLIENT` — add it to `ERROR_CODES` and `CODE_SEVERITY`
  (`"warning"`) in `src/lib/errors/codes.ts`, area `"other"`, and add it to
  `IMMEDIATE_ALERT_CODES` so it pages Matt the same way a payment proof upload does.
  `entityType: "dog"`, `entityId: dogId`.
- Show the client a confirmation state after tapping ("Thanks — we'll follow up to close this
  out") so it's clear something happened.
- On `/admin/fulfilment`'s "Allocated, not delivered" tab, show a small badge on any row with
  an unresolved `DELIVERY_CONFIRMED_BY_CLIENT` event for that dog — that's Matt's cue to open
  the dog, confirm the date, and click the existing "Mark Delivered" action, which then closes
  the loop for real and moves the row off the Waiting List automatically.

## Critical warnings

- Do not touch `updateDogHandover()`'s logic — it already does the right thing end to end.
- Do not delete any `waiting_list` rows or historical `pipeline_stage` data — this is a
  display/filter change on one page, not a data migration.
- `requireAdmin()` stays on every admin action; the client button uses the request-scoped
  portal client so RLS applies — no `createAdminClient()` in the portal route.
- No file over 300 lines. Loading, empty and populated states everywhere.
- Mirror the waiting-list filter change and the new portal button into the app repo per the
  standing parity rule.

## Verify

- [ ] `/admin/waitlist` with no filter shows only `deposit_paid`, `matched`, `reserved` rows.
- [ ] The enquiry/application/approved/quote_sent stage chips are gone from this page.
- [ ] A dog marked Delivered on `/admin/fulfilment` disappears from `/admin/waitlist` on
      next load (its stage is now `handover_complete`).
- [ ] `/admin/waitlist/follow-ups` still surfaces pre-deposit prospects due for a follow-up.
- [ ] A new "Fulfilment" link sits next to Match / Follow-ups on `/admin/waitlist`.
- [ ] A client whose dog is `ready`/`scheduled` sees "I've received my puppy"; tapping it logs
      `DELIVERY_CONFIRMED_BY_CLIENT` and does **not** change `handover_status` itself.
- [ ] That event pages Matt the same way `PAYMENT_PROOF_UPLOADED` does, and shows as a badge
      on the matching row in Fulfilment's "Allocated, not delivered" tab.
- [ ] Marking that dog Delivered afterwards still works exactly as it does today.
- [ ] `npx tsc --noEmit` exits 0; `npx next build` succeeds.

## Commit

From `diedericksdobermann-web/`, `git add -A`, one commit, after confirming
`git ls-files --others --exclude-standard src/` is empty.
