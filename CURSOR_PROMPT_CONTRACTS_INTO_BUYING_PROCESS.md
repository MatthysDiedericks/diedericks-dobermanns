# CURSOR PROMPT — Contracts as part of the buying process

Deposit paid → the agreement appears in the buyer's portal → they tick each clause and
accept → it is signed, filed and legally evidenced. No paper, no email attachments, no
"I never agreed to that".

**Repo:** `diedericksdobermann-web`. **Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## The schema is already applied — do not create these

Applied to the live database on 10 Aug 2026. Read it, use it, do not redefine it.

```
contract_templates  + programme_tier ('puppy'|'elite_developed'|'protection_dog'|null)
                    + is_addendum boolean
                    + version integer

contract_clauses(id, template_id, clause_ref, label, sort_order, is_required)
    One row per tickbox on a template.

contract_acknowledgements(id, contract_id, clause_ref, label_snapshot,
                          acknowledged_at, ip_address, user_agent)
    What a specific buyer ticked. INSERT-only by RLS — no update, no delete,
    by anyone. That is what makes it evidence. Do not try to "correct" a row.

contract_events(id, contract_id, event_type, actor_id, actor_label,
                ip_address, user_agent, detail jsonb, created_at)
    event_type: created | sent | viewed | clause_acknowledged | signed_by_client
              | signed_by_breeder | declined | voided | reminder_sent
    Append-only. No update or delete policy exists.

contracts           + parent_contract_id  (an addendum points at its main agreement)
                    + body_snapshot_at
                    + template_version
```

`contracts` already has `body_html`, `esign_token`, `client_ip_on_sign`,
`client_signature_url`, `client_signature_device`, `signed_by_client`,
`client_signed_at`, `signed_by_breeder`, `breeder_signed_at`, `status`, `litter_id`.

### Numbering — already handled by the database, do not reimplement

`contracts.contract_number` is assigned by a `BEFORE INSERT` trigger
(`assign_contract_number`). It takes the numeric root of the quote behind the sale, so
the whole paper trail lines up:

```
Quote      DD-1133
Invoice    DD-INV-1133
Agreement  DD-AGR-1133
Addendum   DD-AGR-1133-A     <- inherits its parent's number
```

Insert contracts **without** a `contract_number` and let the trigger assign it. Never
compute one in TypeScript — two admins confirming payments at the same moment would
produce the same number, and the unique index would reject the second.

Print `{{contract_number}}`, `{{quote_number}}` and `{{invoice_number}}` in the document
header so a buyer holding any one of the three can find the others.

---

## 1. Load the real contract text — you write it, Matt applies it

The two templates in the database are stubs (890 and 672 characters). The real documents
are in the repo:

- `LEGAL/PUPPY_SALE_AGREEMENT.md` — the main agreement, all tiers
- `LEGAL/ADDENDUM_A_ELITE_DEVELOPED_PUPPY.md` — attaches when tier is `elite_developed`

Write **one SQL migration** in `diedericks-dobermanns/supabase/migrations/` that:

1. Upserts the main agreement into `contract_templates` (`programme_tier` NULL — it
   applies to every tier), converting the markdown to clean semantic HTML for `body_html`.
2. Inserts the addendum as a second template with `is_addendum = true`,
   `programme_tier = 'elite_developed'`.
3. Inserts one `contract_clauses` row for every `☐` line in each document, with
   `clause_ref` set to the clause it sits under (`4`, `7`, `A2`, `A5`, `ack_1` …),
   `label` set to the exact wording after the ☐, and `sort_order` in document order.

**Do not invent, reword, shorten or reorder any clause text.** The wording was drafted
against Consumer Protection Act s49 and is pending attorney review. Copy it verbatim.

Placeholders in the markdown use `{{token}}`. Leave them in `body_html` exactly as they
are — they are filled at contract-creation time, not now.

`{{breeding_penalty}}` resolves from `app_settings.breeding_penalty_amount`, which is
present but **blank**. Where it is blank, the contract must not be sendable — see §3.

**Say clearly at the end of your run that the migration still needs applying.** You
cannot reach Supabase. Six migrations have already been left unapplied on this project,
and one of them took every dog page down for weeks.

## 2. Create the contract when payment is confirmed

`confirmQuotePayment()` in `src/app/admin/(panel)/quotes/payment-actions.ts` currently
does not create a contract. That is the broken link — nothing reaches the buyer.

On successful payment confirmation, and only once:

1. Resolve the dog and its `programme_tier`.
2. Pick the main template, plus the addendum whose `programme_tier` matches.
3. Render `body_html` with the buyer, breeder, dog, litter, price and payment values —
   the same `CompanyProfile` the quote letterhead uses, so the two documents never
   disagree about who the kennel is.
4. Insert the contract with the **rendered** body into `contracts.body_html`, stamp
   `body_snapshot_at` and `template_version`.
5. Insert the addendum as a second contract row with `parent_contract_id` set to the first.
6. Record a `created` event, then a `sent` event.
7. Email the buyer: their agreement is ready in the portal, with a link.

**The snapshot is the point.** Never render the template live when the buyer views it. If
Matt edits a template next year, an already-issued contract must still read exactly as it
did the day it was accepted.

If a contract already exists for that dog and client, do nothing and return quietly.
Confirming a payment twice must not produce two agreements.

## 3. Refuse to send an incomplete contract

Block creation, with a clear message naming what is missing, when:

- any `{{token}}` remains unresolved in the rendered body;
- `app_settings.breeding_penalty_amount` is blank (it is currently set to
  **R250 000,00** — but do not hardcode it, read the setting); or
- the dog has no `programme_tier`.

Show the admin what to fix and where. Do not send a half-filled legal document.

## 4. The buyer's side — `portal/(panel)/contracts/[id]`

The screen that has to be effortless. On one page:

- The agreement, rendered, readable, in the brand's dark theme.
- Each clause's tickboxes **inline, at the clause they belong to** — not collected at the
  bottom. The buyer ticks as they read. This is the whole legal point: they acknowledged
  *that* term, not a wall of them.
- Where an addendum exists, it appears below the main agreement in the same flow, with
  its own tickboxes. One page, one journey, one Accept.
- Ticking writes a `contract_acknowledgements` row immediately with `label_snapshot` set
  to the exact wording shown, plus IP and user agent. Do not batch until submit — if they
  close the tab halfway you want the record of what they had already accepted.
- **Accept is disabled until every `is_required` clause is ticked**, on both documents.
  Show a live count: "3 of 24 acknowledged".
- Accepting sets `signed_by_client`, `client_signed_at`, `client_ip_on_sign`,
  `client_signature_device`, and writes a `signed_by_client` event.
- A typed-name or drawn signature is optional extra evidence, not a substitute for the
  acknowledgements.

After acceptance the page becomes read-only, with **Download PDF** and a line stating when
and from where it was accepted. The buyer must always be able to get back to it — this is
their contract, not something that disappears once signed.

Record a `viewed` event the first time they open it.

### Make it genuinely easy to sign

A buyer who finds this hard will phone Matt instead, and the paperwork he is trying to
escape comes straight back.

- **Mobile first.** Most buyers will do this on a phone, at night, one-handed. Tickboxes
  at least 44px, comfortable line length, no horizontal scrolling, no pinch-to-read.
- **A sticky progress bar** at the top: "8 of 24 acknowledged" with the Accept button in
  it, disabled until complete. The buyer always knows how far they have to go.
- **Jump to next outstanding.** One tap moves to the next unticked box. Nobody should
  hunt a page for the one they missed.
- **Save as they go.** Every tick is persisted immediately. Closing the tab and returning
  the next day resumes exactly where they were, boxes still ticked.
- **A plain-language summary at the top** — five or six lines covering what they are
  agreeing to: no breeding, no rehoming, we can inspect, we will take the dog back. Then
  the full agreement below. The summary never replaces the clauses and must say so.
- **Sign in should not be a wall.** The `esign_token` on the contract already supports a
  direct link. A buyer arriving from the email lands on the contract itself; if they have
  no account yet, prompt registration *after* they have read it, not before.
- **Confirm before committing.** A short modal on Accept: "You are accepting Agreement
  DD-AGR-1133 for [dog]. This is legally binding." One clear confirm.
- **Receipt.** On acceptance, email them the signed PDF immediately and show a clear
  confirmation with the agreement number.

## 5. The admin's side — `/admin/contracts/[id]`

- Status, both parties, the dog, the rendered body.
- **Acknowledgement list**: every clause, ticked or not, with timestamp.
- **Audit trail**: the `contract_events` history, newest first, with IP and device.
- Download PDF. Resend. Void, with a reason, which writes a `voided` event.
- On the contracts list: filter by status, and surface anything sent but unsigned for
  more than 7 days.

## 6. Easy to reach

A contract nobody can find is paper by another name.

- Portal sidebar: **Contracts**, with a badge when one is awaiting acceptance.
- Portal dashboard: a prominent card while any contract is unsigned.
- Admin: link from the quote, the dog, the client and the fulfilment board.
- The dog's page in the portal links to its agreement.

---

## Critical warnings

- **Never** update or delete a `contract_acknowledgements` or `contract_events` row. RLS
  has no policy permitting it, deliberately. Code that tries will fail, and should.
- **Never** re-render a signed contract from its template. Read `contracts.body_html`.
- `requireAdmin()` on every admin action. Portal routes use the request-scoped client so
  RLS applies — no `createAdminClient()` in a portal route, ever. A leak here exposes
  another buyer's contract, ID number and address.
- Do not reword the legal text to fit a component. Change the component.
- Money is `numeric`; format with `formatAmount`.
- No file over 300 lines.
- Mirror the portal screens into the app repo per the standing parity rule.

## Verify

- [ ] Confirming payment on a `puppy` dog creates one contract, no addendum.
- [ ] Confirming payment on an `elite_developed` dog creates the agreement **and** Addendum A, linked by `parent_contract_id`.
- [ ] Confirming the same payment twice creates nothing further.
- [ ] With `breeding_penalty_amount` blank, creation is blocked with a message naming that setting.
- [ ] Accept stays disabled until every required box on both documents is ticked.
- [ ] Ticking a box writes a row immediately, with the exact label shown, IP and user agent.
- [ ] Editing the template afterwards does not change the issued contract.
- [ ] A second client cannot open the first client's contract by guessing the URL.
- [ ] The audit trail shows created → sent → viewed → each acknowledgement → signed.
- [ ] `npx tsc --noEmit` exits 0; `npx next build` succeeds.

## Commit

From `diedericksdobermann-web/`, `git add -A`, one commit, after confirming
`git ls-files --others --exclude-standard src/` is empty. The migration goes in the app
repo (`diedericks-dobermanns/supabase/migrations/`) — commit it there and **state that it
still needs applying**.

Then `git push origin main`. Committing is not shipping.

Do not touch `src/lib/documents/`, `src/components/documents/`,
`src/components/admin/DogPicker.tsx`, `src/lib/admin/dogs.ts`,
`src/lib/admin/litterGroups.ts`, or `src/app/admin/(panel)/waitlist/` — being edited in
parallel.
