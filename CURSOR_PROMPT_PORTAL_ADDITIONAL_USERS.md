# CURSOR PROMPT — Additional users on a client portal (household members)

A client buys a dog. Their partner also wants to see the vaccination schedule, upload the
four-monthly photos and read the training updates. Today the only way to do that is to **share the
buyer's password**. That is the actual current behaviour and it is the thing we are fixing.

Password sharing destroys three things at once:

- **Attribution.** Every clause acknowledgement, photo upload and document is stamped with the
  buyer's `auth.uid()` regardless of who really did it. Our contract audit trail becomes unusable
  as evidence.
- **Revocation.** You cannot remove the second person without changing the buyer's password.
- **POPIA.** We cannot show who accessed a record.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.
**Next migration number: `0142`.** Last applied is `0141_death_vet_report_owner_blind.sql`.

---

## The model — read this before writing anything

There is **one account holder** per portal. That is the person on the contract and the invoice. They
may add up to **two additional users**. Additional users are *guests on the account holder's
portal*, not clients in their own right. They never become owners, never sign, never appear on a
contract.

We are **not** introducing a "household" or "organisation" entity that data hangs off. That would
mean re-rooting ownership on every table and rewriting 27 RLS policies, and we have already had one
production incident this year from a scoping change (invoices visible across clients, August). We
widen the *lookup*, we do not move the *ownership*.

### The linchpin

Every client-facing policy today compares against `auth.uid()`. We replace that single value with a
**set** — me, plus any account holder who has granted me active membership.

```sql
-- 0142: the whole design in one function.
create or replace function public.my_client_ids()
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select auth.uid()
  union
  select m.account_holder_id
    from public.portal_members m
   where m.member_user_id = auth.uid()
     and m.status = 'active'
$$;
```

`auth.uid()` is always in the set, so **a client with no members behaves exactly as before**. That
property is what makes this safe, and the verification section below makes you prove it.

> **HARD RULE — do not revoke EXECUTE on this function.**
> `my_client_ids()` is used inside RLS policies. Revoking EXECUTE from `authenticated` or from
> `PUBLIC` will make every table using it return zero rows for clients. This exact mistake caused a
> **6.7 hour public outage** on this project in July. Grant it, never revoke it:
> `grant execute on function public.my_client_ids() to authenticated, anon;`

---

## 1. Schema — migration `0142_portal_members.sql`

Write it into **both** repos' `supabase/migrations/` folders, byte-identical. Both repos carry a
full migrations folder for the one database; they were reconciled to matching files on 26 Aug and
must stay that way.

```sql
create table public.portal_members (
  id uuid primary key default gen_random_uuid(),

  -- The client whose portal is being shared. Always a real portal client.
  account_holder_id uuid not null references auth.users(id) on delete cascade,

  -- The guest. Null until they accept — we invite by email first.
  member_user_id uuid references auth.users(id) on delete cascade,

  invited_email text not null,
  full_name text not null,
  relationship text,                         -- free text: "Wife", "Son", "Handler"

  status text not null default 'pending'
    check (status in ('pending', 'active', 'revoked')),

  -- OFF by default and deliberately so. See section 3.
  can_view_financials boolean not null default false,

  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One membership per person per portal, and never to yourself.
create unique index portal_members_holder_email_uniq
  on public.portal_members (account_holder_id, lower(invited_email));
create unique index portal_members_holder_member_uniq
  on public.portal_members (account_holder_id, member_user_id)
  where member_user_id is not null;
alter table public.portal_members
  add constraint portal_members_not_self
  check (member_user_id is null or member_user_id <> account_holder_id);

-- The hot path is "who am I a member of" — index for it.
create index portal_members_member_active_idx
  on public.portal_members (member_user_id, status)
  where status = 'active';
create index portal_members_holder_idx
  on public.portal_members (account_holder_id);
```

**The two-member cap is enforced in the database, not only in the UI.** A UI-only cap is not a cap.
Use a `before insert` trigger that counts non-revoked rows for the account holder and raises if it
would exceed 2. Explain the limit in the error message so the UI can surface it verbatim.

**No transitive membership.** A member may not add members. Enforce it in the insert policy:
`account_holder_id = auth.uid()` — a member's `auth.uid()` is never their host's id, so they
physically cannot insert a row that shares someone else's portal.

### RLS on `portal_members` itself

- Account holder: full `ALL` on rows where `account_holder_id = auth.uid()`.
- Member: `SELECT` only, on rows where `member_user_id = auth.uid()` (so they can see their own
  access and that it is real). **No UPDATE** — a member must not be able to grant themselves
  `can_view_financials`. This is the single most likely privilege-escalation hole in this feature.
  Test it explicitly.
- Admin: `is_admin()` full access.

---

## 2. Widen the existing scoping — the careful part

### 2a. Widen the three helper functions at source (this is most of the work, done free)

These already exist and are already used by several policies. Change `auth.uid()` inside them to
`in (select public.my_client_ids())`:

| Function | Current predicate | Becomes |
|---|---|---|
| `my_dog_ids()` | `d.owner_id = auth.uid()` and `r.client_id = auth.uid()` | `in (select my_client_ids())` |
| `my_contact_ids()` | `c.user_id = auth.uid()` | `in (select my_client_ids())` |
| `my_dog_parent_ids()` | calls `parent_ids_for(auth.uid())` | **read `parent_ids_for` first** and widen it the same way, or call it per id in the set |

Widening these three automatically fixes: `documents` (dog documents), `contracts` (the
`contact_id` branch), and anything else routed through them. **Paste the `\df+` or
`pg_get_functiondef` output for all three before and after.**

### 2b. Policies that compare `auth.uid()` directly — change these

These are the ones I verified against the live database. For each, replace the direct comparison
with `in (select public.my_client_ids())`:

| Table | Policy | Note |
|---|---|---|
| `dogs` | `dogs owner read` | `owner_id` |
| `dogs` | `Clients can view reserved dogs` | `r.client_id` |
| `dog_media` | `Owners/reservers can view dog media` | both branches |
| `dog_media` | `Owners can add media to their own dog`, `Owners can insert own dog media` | members may upload photos — that is the point |
| `vaccinations` | `Clients can view own dog vaccinations`, `vaccinations read` | |
| `reservations` | `Clients can view own reservations` | |
| `waiting_list` | `Client can view own waiting list entry` | |
| `client_dog_notes` | `client own dog notes` | |
| `documents` | `Client can view own health documents`, `Client can view own health paperwork` | `uploaded_by` — **see the warning below** |

### 2c. Gated on `can_view_financials` — NOT a plain widening

| Table | Policy |
|---|---|
| `invoices` | `Client can view own invoices` |
| `payments` | `payments client read own` |
| `quotes` | `Client can view own quotes`, `Client can view application-linked quotes` |
| `documents` | `Client can view own proof of payment` |

Add a second helper for these, and use it instead:

```sql
create or replace function public.my_financial_client_ids()
returns setof uuid
language sql stable security definer set search_path to 'public'
as $$
  select auth.uid()
  union
  select m.account_holder_id
    from public.portal_members m
   where m.member_user_id = auth.uid()
     and m.status = 'active'
     and m.can_view_financials
$$;
grant execute on function public.my_financial_client_ids() to authenticated, anon;
```

Same no-revoke rule applies.

### 2d. DO NOT WIDEN — leave these on `auth.uid()`

Getting this list wrong is the difference between a feature and a liability.

| Table | Policy | Why |
|---|---|---|
| `contracts` | `contracts client sign` (UPDATE) | **A member must never sign or acknowledge a clause.** Only the buyer can bind themselves. Our clause-level acknowledgement audit trail is only worth having if this holds. |
| `applications` | `Users can view own applications`, `clients_insert_own_applications` | An application is a personal declaration — experience, home, children, references. It is not household data and a member has no business filing one in someone else's name. |
| `documents` | `Client can insert death vet report` | Reporting a dog's death is an act with contractual consequences. Buyer only. |
| `users` (profile) | any self-update policy | A member edits their own profile, never the holder's. |

`contracts read own` (SELECT) **may** be widened — but gate it on `can_view_financials`, because a
contract carries the purchase price.

> **Warning on the `documents` `uploaded_by` policies.** Two policies scope on
> `uploaded_by = auth.uid()` — meaning "documents I personally uploaded", not "documents about my
> dog". Widening them means the buyer can see health paperwork their partner uploaded, which is
> what we want. But `uploaded_by` must keep recording **the real actor**, never the account holder.
> Do not "helpfully" stamp the holder's id on a member's upload. List both policies, state what you
> changed, and confirm `uploaded_by` still records the actor.

---

## 3. Why financial access is off by default

Do not change this default without asking Matt.

The second person is typically a spouse, an adult child, or a professional handler. The buyer
frequently does not want the purchase price, the payment schedule or the outstanding balance
visible to them — a handler especially has no business seeing it. Off by default, switched on
deliberately by the account holder, is the only defensible starting position. The UI must state
plainly what the toggle exposes: **invoices, quotes, payments, proof of payment and the contract.**

---

## 4. The invite flow — reuse what exists, do not build a second one

We already have a working invite mechanism: `portal_invites` with a 7-day expiry, a 6-digit code
and a click-through link, redeemed at `/portal/auth/confirm`. Reuse it exactly.

- `portal_invites.source` has a CHECK constraint allowing only `('application','waiting_list','client')`.
  **Migration 0142 must extend it** to include `'member'`. Drop and recreate the constraint; do not
  invent a new column.
- `portal_invites.source_id` holds the `portal_members.id`.
- On successful redemption, set `portal_members.member_user_id` and `accepted_at`, and flip status
  `pending` → `active`. Do this inside the existing redeem path, in one transaction with the
  session creation, so a half-redeemed invite cannot leave an orphan row.
- **Do not send email automatically.** Matt's standing rule: never send on his behalf without
  approval. The account holder pressing "Invite" is the approval for *that* message — that is fine,
  it is the client's own action on their own portal. But there must be no background or bulk send.
- Reuse `sendInviteEmail` in `src/lib/admin/portalInviteEmail.ts`. Write a member-specific subject
  and body: it must say **who** invited them and **which** portal they are being added to, or it
  reads like a phishing mail. Suggested: `{Holder} has added you to their Diedericks Dobermanns
  portal`.

**Revocation must be immediate and hard.** Set `status = 'revoked'`, stamp `revoked_at` and
`revoked_by`. Because `my_client_ids()` filters on `status = 'active'`, access dies on their very
next request — no session invalidation needed. Verify this by loading a page as the member *after*
revoking, in the same browser session, without signing out.

---

## 5. UI — website

New page: `/portal/(panel)/profile/access` (or a section on the existing profile page — your call,
but it must be reachable in one tap from the portal dashboard).

**Account holder sees:**
- List of current members: name, email, relationship, status, financial access on/off, date added.
- "Add someone to my portal" — name, email, relationship, financial toggle (off, with the plain
  explanation from section 3). Disabled with an explanation once 2 non-revoked members exist.
- Per member: toggle financial access, resend invite, remove access (confirm dialog that says the
  removal is immediate).

**Member sees, on their own profile:**
- A clear, permanent banner: *"You have guest access to {Holder}'s portal."* They must never be
  confused about whose data they are looking at — that confusion is how someone uploads a vet
  report to the wrong dog.
- What they can and cannot do, stated plainly. Especially: they cannot sign contracts.

**Everywhere else in the portal**, when the signed-in user is a member, show a persistent
low-key marker in the header identifying whose portal is on screen.

## 6. UI — app (`diedericks-dobermanns`)

**Parity is a standing rule on this project: the website and the app must have the same functions.**
Do not ship this to the website only.

- New screen `app/(portal)/profile/access.tsx`, matching the website's capabilities.
- The existing portal screens are in `app/(portal)/` — `dashboard.tsx`, `profile.tsx`,
  `contracts.tsx`, `invoices/`, `quotes/`, `documents.tsx`, `add-photos/[dogId].tsx` and the rest.
  Every one of them must respect the member's permissions. In particular `contracts/[id].tsx` must
  **hide or disable the sign / acknowledge action** for a member.
- Financial screens (`invoices/`, `quotes/`) must not merely be hidden from the nav — hiding a tab
  is not access control. RLS is the control; the hiding is only so the member does not tap into an
  empty screen.
- `ls` each file you touch and paste the output. **Do not rely on grep — it has returned false
  negatives on this filesystem.**

---

## 7. Rules

- No file over 300 lines. Split into hooks and components.
- TypeScript strict. No `any`. Regenerate `database.types.ts` after the migration.
- Every Supabase call checks `error`. Loading, empty and error states on every list.
- Never expose the service role key to the client.
- Do not delete or re-categorise any existing client record.
- Migration goes into **both** repos, byte-identical.

---

## 8. Verify — paste output, not descriptions

> **Read this first.** RLS tests run as an admin cannot detect an unscoped query — the admin sees
> everything by design, so the test passes while the page leaks. This is exactly how the August
> invoice exposure was missed **twice**. For every check below, **load the actual page as the
> actual user and count what renders.** A passing SQL test is not evidence.

**The no-op guarantee (do this first — if it fails, stop):**

- [ ] Pick an existing client with **no** members. Load their portal end to end — dogs, documents,
      invoices, contracts, vaccinations. Screenshot. It must be **identical** to before this
      change. Paste a row count per screen from before and after.

**Member access, positive:**
- [ ] Create a test member on a real client portal. Redeem the invite. Confirm they see the
      holder's dogs, documents, vaccinations and photos.
- [ ] Member uploads a photo. Confirm it appears for the holder, and that `dog_media.uploaded_by`
      is **the member's** uuid, not the holder's. Paste the row.

**Member access, negative — these are the ones that matter:**
- [ ] With `can_view_financials = false`, the member's `/portal/invoices` renders **0 rows**.
      Screenshot the rendered page, not a query.
- [ ] Same for quotes, payments and proof-of-payment documents.
- [ ] Flip `can_view_financials = true`. Reload. Now they render. Screenshot both states.
- [ ] The member **cannot sign or acknowledge a contract**. Show the disabled UI *and* prove the
      database refuses it — run the UPDATE directly as the member's JWT and paste the rejection.
- [ ] The member cannot insert an application.
- [ ] **Escalation test:** as the member, attempt
      `update portal_members set can_view_financials = true where member_user_id = auth.uid();`
      Paste the failure.
- [ ] **Transitive test:** as the member, attempt to insert a `portal_members` row for the holder's
      portal. Paste the failure.
- [ ] **Cap test:** attempt a third member. Paste the trigger's error.
- [ ] **Cross-client test:** confirm the member sees **nothing** belonging to any other client.
      This is the August regression — check it explicitly, on a real page.

**Revocation:**
- [ ] Revoke the member while they are signed in. Without signing out, reload their portal. Confirm
      the holder's data is gone. Screenshot.

**Function grants:**
- [ ] Paste `\df+ public.my_client_ids` and `\df+ public.my_financial_client_ids` showing
      `authenticated` has EXECUTE. If either is missing, every client portal is dead.

**Build:**
- [ ] Website: `npm run preflight` passes. `npx tsc --noEmit` clean in both repos.
- [ ] App: screen loads on a device. Say which device.

### Prove it reached the remote
- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
      Committing is not deploying — this has cost a full morning before.
- [ ] Vercel reaches **Ready** on **`diedericksdobermanns-web-v145`** — the project bound to the
      live domain. The other three are duplicates; ignore them.
- [ ] Confirm migration `0142` is applied to the live database, and that the file is present and
      identical in both repos.

## 9. Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`,
`scripts/send-portal-invite-emails.mjs`.
