# CURSOR PROMPT — Daily landing-page photo shuffle + waiting list gated on payment

Two unrelated small features, one prompt. Do the waiting-list gate first — it is business logic;
the shuffle is polish.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — both, where applicable.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Brand: `#111008 / #1C1A0E / #C4A35A / #F5F0E8`.
**Migration number: check what is free.** `0142`–`0144` are taken; other prompts may have claimed
`0145`+. Take the next gap, byte-identical in both repos' migration folders.

---

## Part 1 — Nobody reaches the waiting list without money attached

**The rule, in Matt's words:** clients should only pull through to the waiting list once a payment
is recorded against their name. Approval alone is not commitment — some clients get a quote and
never act. Today they land on the waiting list anyway and it fills with people who may never buy.

### The intended pipeline

```
application approved → quote sent → PAYMENT RECORDED → waiting list
                                  ↘ no payment: stays under Applications,
                                    clearly marked "Approved — awaiting payment"
```

### Before writing anything, map what exists

The pipeline was built across several earlier passes (`0034_waiting_list_history`,
`0069_pipeline_and_matching`, `0040_waitlist_quote_invoice_link`, the fulfilment work in `0056`).
**Read the current flow first and paste a short summary of where waitlist rows are created today**
— UI actions, RPCs, and any automatic creation on approval or quote acceptance. Do not guess; the
gate must close every path, and a gate on the UI path only is not a gate.

### The gate

A client "has a payment" when a `payments` row (or an invoice with `amount_paid > 0`) is linked to
them or their quote. Implement as one helper — SQL function `client_has_payment(p_client_id,
p_contact_id)` — used by **every** waitlist-creation path, and enforce it in the database with a
`before insert` trigger on `waiting_list` (or a CHECK via the function if you can do it cleanly).
UI enforcement alone is not acceptable; a second admin screen or a script must hit the same wall.

- Admin override: allowed (deposit paid cash, arrangement made) — but it is an explicit "override,
  give a reason" action, recorded in `audit_log`, never the silent default.
- **Applications screen** gains a lane/filter: **Approved — awaiting payment**, showing days since
  approval. This is Matt's follow-up list — the people to phone.
- When a payment lands (proof approved, or payment recorded on the invoice), the client becomes
  eligible; if the flow previously auto-created the waitlist entry, keep that but only fire it at
  payment time, not approval time.

### Existing data — report, do not purge

Some current waitlist rows will have no payment. **Do not delete or demote them.** Produce the
list (name, entered date, quote/invoice state) as part of your report and leave the decision to
Matt. New entries follow the new rule from deploy.

### Verify (paste, not describe)
- [ ] The map of creation paths, and proof each is gated (attempt each without a payment → refused).
- [ ] Direct SQL insert into `waiting_list` as an admin for a payment-less client → trigger refuses.
      Paste the error. Then with an override → succeeds and the audit row exists. Paste both.
- [ ] Screenshot the "Approved — awaiting payment" lane with a real case.
- [ ] The list of existing no-payment waitlist rows, handed to Matt, untouched.
- [ ] App parity: same lane and same gate on the app's waitlist/application screens.

---

## Part 2 — Shuffle the landing-page dog photos daily

The landing page shows the same dogs in the same order every visit; regulars stop looking. Rotate
daily so the site feels alive, at zero ongoing cost.

### How — deterministic daily order, server-side

No randomness per request (thrashes the cache and looks broken when two visits differ within
minutes), and no client-side shuffle (layout flash, SEO sees different content).

- Order by a hash seeded on the **date**: `md5(current_date::text || dog.id)` or the JS equivalent
  in the server component. Same order all day for everyone; new order tomorrow.
- Next.js: the landing page fetch uses ISR — `revalidate` of 3600 is fine; the order key changes
  at midnight and the next revalidation picks it up. Do **not** set `force-dynamic` for this; the
  homepage must stay cached. Check what caching the page uses today and keep it.
- **Eligibility unchanged.** Shuffle only reorders what the page already shows. Deceased dogs and
  non-public photos must stay excluded — reuse the existing query and reorder its result; do not
  write a new query with new (buggy) filters. Cover photos per dog still come from
  `pickProfilePhoto` — the shuffle reorders dogs, never overrides Matt's pinned choices.
- 402 trap: images keep going through `src/lib/thumbs.ts` (Supabase render endpoint), NOT
  `next/image` — the Vercel Hobby image-optimisation quota has already been hit once.
- App parity: if the app home screen shows a dog strip, apply the same seeded order there.

### Verify
- [ ] Load the landing page twice today — identical order. Paste both orders.
- [ ] Compute tomorrow's order (run the hash with tomorrow's date) — different. Paste it.
- [ ] Confirm the page still serves from cache (response headers / build output route table).
- [ ] Confirm no deceased dog and no non-public photo appears — name the query you reused.
- [ ] `npx tsc --noEmit` clean; `npm run preflight` passes.

---

## Ship
- Two separate commits per repo (gate, then shuffle) so either can be reverted alone.
- `git log origin/main -1` matches `HEAD` in both repos — paste hashes. Vercel **Ready** on
  `diedericksdobermanns-web-v145`.

Do not modify: `src/lib/analytics/visitorHash.ts`, `src/components/layout/WhatsAppButton.tsx`,
`scripts/import-dbp-contacts.mjs`, `scripts/send-portal-invite-emails.mjs`.
