# CURSOR PROMPT — The four things Matt still has to open a laptop for

The app is 115 screens to the website's 140, and most of that difference is deliberate. **These four
are not.** Each one is a job Matt does regularly, on a phone, away from a desk — and currently
cannot.

Build them **in this order** and commit each separately. Do not start the next until the previous one
is verified. A shallow version of all four is worth less than a finished Contacts screen.

**Repo:** `diedericks-dobermanns` (the app). The website already has all four — **read its
implementation and match the behaviour**, do not reinvent it.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Brand `#111008 / #1C1A0E / #C4A35A / #F5F0E8`, Cinzel/Lato.
**No migration.** Every table, RPC and RLS policy these need already exists and is in use by the
website.

---

## 1. Contacts — `admin/contacts`, `admin/contacts/:id`, `admin/contacts/duplicates`

**The biggest gap. 255 contacts, and the phone cannot see any of them.**

Website reference: `src/app/admin/(panel)/contacts/`, and `src/lib/admin/` for the queries.

- **List** with the same search the website has — name, any phone format, email, merged alias. The
  app already has this pattern in its client search; reuse it, including the numeric keypad when the
  query looks like a phone number.
- **Detail** — contact fields, linked quotes, invoices, contracts, dogs, applications. Tap through to
  each. This is the screen Matt needs standing in a kennel with a buyer on the phone.
- **Duplicates** — the merge tool. Two "Invite Verify" rows and a Nicolas Hohls double were found by
  hand on 1 Sep; the merge path already exists on the website and must not be rebuilt differently.
  **Never delete a contact on merge** — the website keeps both rows and repoints references, and the
  app must do exactly the same.

`contact_type` is already `client | prospect | breeder | supplier | judge | staff | other`. Show it,
filter on it. The lapse ladder now writes `prospect`, so that filter will start earning its keep.

## 2. Create a sale agreement — `admin/dogs/:id` action, and from a client or litter

The app can **read and send** a contract but cannot **create** one. So the moment a payment lands
while Matt is out, the agreement waits for a laptop.

Website reference: `src/lib/contracts/createSale.ts`, `src/app/admin/(panel)/contracts/create-actions.ts`.

- **Call the same code path.** `createSaleContract()` resolves templates by `programme_tier`, merges
  tokens, attaches Addendum A for elite dogs and numbers the document by trigger. Do not write a
  second creation path — a divergent one is how a contract ends up without its addendum.
- Respect the new integrity gate: a contract with a blank price or leftover `{{tokens}}` **cannot be
  sent**, on either surface. Surface the blockers in the app the same way.
- Create from a **dog**, a **client**, or a **whole litter** (bulk), matching the website.

## 3. Document triage — `admin/documents/unlabelled`, `admin/documents/pending`, `admin/media/pending`

**67 dog documents are currently named `1`, `2`, `3`, `4`.** They can only be fixed at a desk, which
is why they have not been.

Website reference: `src/app/admin/(panel)/documents/`.

- List documents whose category is `other` or whose name is meaningless, with a preview.
- Rename and recategorise in place, against the existing `documents_category_check` list. Do not
  invent categories.
- Photo/media approval queue — the same approve/reject the website has.

This is a queue-shaped job done in spare minutes. It belongs on a phone more than on a desktop.

## 4. Unallocated sales — `admin/dogs/unallocated`

The website carries a nav badge showing **121** dogs sold with no owner linked. The app shows nothing,
so the number is invisible to the person most able to chip away at it.

Website reference: `src/app/admin/(panel)/dogs/unallocated/`.

List them, tap to open the dog, link an owner. Show the count as a badge on the app's admin nav the
same way.

---

## Rules

- **Read the website implementation first for each one and match its behaviour.** Where the website
  has a rule the app does not, the website is right — it has been in daily use.
- Reuse the existing RPCs and queries. If a query needs a `userId` for scoping, pass it — the portal
  scoping bug on 26 Aug came from a screen that omitted it.
- No new tables, no new RLS policies, no new categories.
- TypeScript strict, no `any`. **No file over 300 lines** — these are list + detail screens and will
  want splitting into a hook, a row component and the screen.
- Every list needs loading, empty and error states, and pull-to-refresh. Every list of any length
  uses `FlatList`, never `.map()`.
- `ls` every file you create and paste the output — grep has false-negatived on this filesystem.

## Verify — paste output, not descriptions

Use real records. **Do not create test contacts, dogs or contracts** — Cursor has previously left
`VERIFY` rows on a real client's ledger on this project.

**Contacts**
- [ ] Screenshot the list showing a real search: type `hohls` and show Nicolas Hohls found.
- [ ] Screenshot a contact detail showing linked quotes and invoices for a real buyer.
- [ ] Open the duplicates screen and screenshot it. **Do not merge anything** — just show it loads
      and finds the Nicolas Hohls pair.
- [ ] Filter by `prospect` and screenshot the result.

**Contract creation**
- [ ] Create a draft agreement for a real dog **in a transaction, then roll back**. Paste the
      contract number and the resolved purchase price before rolling back.
- [ ] Confirm an elite dog gets **Addendum A** automatically. Paste both contract numbers.
- [ ] Confirm the integrity gate refuses to send a draft containing `{{dog_microchip}}`. Screenshot.

**Documents**
- [ ] Screenshot the unlabelled queue showing real documents named `1`–`4`.
- [ ] Rename **one** real document properly and paste before/after. That is a genuine improvement,
      not test data — leave it renamed.

**Unallocated**
- [ ] Screenshot the list and the nav badge showing the real count.

**All four**
- [ ] `node scripts/check-parity.mjs` — paste the output and show these routes no longer flagged.
- [ ] `npx tsc --noEmit` clean; `npm run preflight` passes.
- [ ] `git log origin/main -1` matches `HEAD` — paste the hash. Four separate commits, one per
      section.

## Commit
App repo only. Repo root is the **parent** folder of `diedericks-dobermanns/`.
Four commits, in the order above.
