# CURSOR PROMPT — Make the contract system usable: create, read, edit, sign without an account

Nine puppies from the Claire × Santini litter go home on **6 September**. One leaves **this weekend**.
**Not one of them has a contract**, and there is no way for Matt to make one.

The signing machinery is already built and good. Three specific things stop it being used at all.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Currency ZAR, `R1 234,56`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Verified live — most of this exists. Do not rebuild it.

**Already working:**

```
/sign/[token]/page.tsx                    public signing, no account needed
components/contracts/ClauseTick.tsx       per-clause tick boxes
ContractHtmlWithTicks.tsx                 the body with ticks inline
ContractProgressBar.tsx                   how far through they are
AcceptConfirmModal.tsx                    final confirmation
lib/contracts/{events,merge,parseBody,resolveTemplates,signingQueries}.ts
admin/(panel)/contracts/[id]/page.tsx     admin view
portal/(panel)/contracts/…                portal view
```

Database: `contract_templates` (**4**), `contract_clauses` (**41**), `contracts`,
`contract_acknowledgements`, `contract_events`. `esign_token`, `esign_expires_at`,
`client_ip_on_sign`, `client_signature_url` all exist.

**And yet: `contracts` = 0 rows. `contract_acknowledgements` = 0. `contract_events` = 0.**

### The three reasons

**1. `contracts.client_id` is `NOT NULL`.** A contract cannot exist for a buyer without a portal
account. Eight of the nine Claire × Santini buyers have no account. This is a schema-level block on
the exact thing Matt needs.

**2. `createContractsForPaidQuote` is the only creation path, and it bails immediately:**
`src/lib/contracts/createFromPayment.ts` line 43 — `if (!quote.client_id) return`. Josef paid in full
on 26 August and still got no contract, because his `quotes.client_id` was null until it was set by
hand an hour later.

**3. There is no manual create and no edit.** `admin/(panel)/contracts/actions.ts` exports exactly
two functions: `voidContract` and `resendContract`. Matt cannot create a contract, and
`AdminContractActions.tsx` contains no body editing at all.

---

## 1 · A contract must not require a portal account

- Make `contracts.client_id` **nullable**, and add `contact_id uuid references contacts(id)`.
- A contract is for a **person**, identified by a contact. If that person later gets a portal account, `claim_my_records()` attaches it — the same pattern already used for quotes and invoices.
- `/sign/[token]` already works without a session. **That route is the primary path, not the fallback.** Most buyers will sign from a WhatsApp link and never log in.
- RLS: a portal client sees contracts where `client_id = auth.uid()` **or** their contact matches. Verify with a real JWT that one client cannot read another's.

## 2 · Matt creates a contract himself

**Create contract** on the dog profile, the client record, and the litter contracts tab.

- Pick the template. **Default it from `dogs.programme_tier`** — `puppy` → Puppy Sale and Placement Agreement, `elite_developed` → that plus Addendum A, `protection_dog` → Protection Dog Sales Agreement. He can override.
- Merge in buyer, dog, price and dates from the records that already exist. Leave nothing for him to retype.
- Land in **draft** so he can read it before anyone sees it.
- **Bulk create for a litter**: nine puppies, nine contracts, one action, each with the right buyer and dog. That is today's actual job.

## 3 · Read it and edit it — this is what Matt asked for

- Open a contract and read the whole thing in the admin panel. No download required.
- **Edit `body_html` while the contract is in draft.** A rich-text editor is not needed — a clean editable body with the merge fields visible is enough.
- **Once sent, the body is frozen.** `body_snapshot_at` exists for exactly this. Editing after sending must create a **new version** (`parent_contract_id` is already there) and re-request signature. Never silently change a document someone has agreed to.
- Show clearly which template and version it came from, and flag when the template has changed since.
- Editing a draft writes to `contract_events`. Editing a sent contract writes an `audit_log` row too.

## 4 · Signing: ticks, then one confirmation

The pieces exist — wire them into a flow that holds together.

- Each clause has its own tick. **Progress is visible** — *"6 of 12 acknowledged"* — using the existing progress bar.
- **Every clause must be ticked before the confirm button enables.** No "accept all" shortcut: the per-clause record is the point.
- Final step: type full name, tick the declaration, confirm. Record `client_ip_on_sign`, device, and timestamp — all three columns already exist.
- Each tick writes a `contract_acknowledgements` row **as it happens**, not in one batch at the end. Someone who gets halfway and closes the tab must be able to resume.
- On a phone in a WhatsApp browser. That is where this will be used.

## 5 · Sending, without breaking the standing rule

- **Nothing sends automatically.** Matt presses send, every time.
- Give him the signing link with a copy button and a WhatsApp button, exactly like the portal invite panel.
- **The link must survive a preview fetch.** WhatsApp and Outlook both fetch links to render them. `GET /sign/[token]` must render the contract and consume nothing; signing happens on the confirm action. This is the same fault being fixed in `CURSOR_PROMPT_SIGNIN_LINK_CONSUMED_ON_GET.md` — do not repeat it here.
- State the real `esign_expires_at` on screen. An expired link offers a way forward, never a dead end.

## 6 · What Matt sees at a glance

On the litter contracts tab and the fulfilment board:

```
Puppy 1 (Pink)   Josef Kotse        Signed 26 Aug
Puppy 2 (Red)    Jacoline Pretorius Sent 26 Aug — not opened
Puppy 5 (Peach)  Nicolas Hohls      Not created      ← goes home this weekend
```

Unsigned contracts on a puppy inside 14 days of go-home belong on the dashboard. **This litter is 11
days out with nine contracts outstanding.**

---

## The app

- Read and send a contract from the app; Matt is at the kennel when buyers ask.
- Signing works in the app for clients who have it.
- Same status chips.
- **Editing the body is website-only** — a justified platform difference. Say so explicitly.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**

## Rules

- A contract never requires a portal account.
- Draft is editable; sent is frozen. Changes after sending create a version.
- Every clause ticked individually. No accept-all.
- Acknowledgements save per tick, resumable.
- `GET` on the signing link consumes nothing.
- Nothing auto-sends. Matt presses send.
- Reuse `/sign/[token]`, `ClauseTick`, `ContractProgressBar`, `AcceptConfirmModal`, `resolveTemplates`, `merge`. **Do not write a second signing flow.**
- No file over 300 lines. Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output, not descriptions

- [ ] `contracts.client_id` is nullable and `contact_id` exists. Paste the schema.
- [ ] Create a contract for **Leo Middelberg** — who has **no portal account** — and sign it end to end at `/sign/[token]` in a private window. Paste the contract row and the acknowledgement rows.
- [ ] `curl` the signing URL, then sign in a browser. **The curl must not consume the token.**
- [ ] Bulk-create contracts for the Claire × Santini litter: **9 contracts, 9 different buyers, 9 correct dogs.** Paste all nine.
- [ ] The template defaults from `programme_tier`. Show one `puppy` and one `elite_developed`.
- [ ] Matt can read the full body in admin without downloading. Screenshot.
- [ ] Editing a **draft** body saves and writes a `contract_events` row.
- [ ] Editing a **sent** contract creates a new version with `parent_contract_id` set, and the original is untouched. Paste both rows.
- [ ] Confirm stays disabled until **every** clause is ticked. Screenshot at 6 of 12 and at 12 of 12.
- [ ] Ticking 6 clauses, closing the tab, and returning resumes at 6. Paste the acknowledgement rows.
- [ ] Signing records `client_ip_on_sign`, device and timestamp. Paste the row.
- [ ] A client cannot open another client's contract. **Test with a real JWT.**
- [ ] Nothing sent automatically — prove no email left when the contract was created.
- [ ] The litter tab shows created / sent / signed per puppy. Screenshot.
- [ ] App: read and send a contract; a client can sign. Say which device.
- [ ] Website: `npm run preflight` passes — committed-tree import check, `tsc`, and `next build`.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel reaches **Ready** — paste the deployment id.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: the schema change, manual and bulk creation, admin read and
edit, the signing flow, sending and status, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
