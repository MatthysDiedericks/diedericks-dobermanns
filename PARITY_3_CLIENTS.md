# PARITY PROMPT 3 — Clients on the website

Client management is app-only. Building it on the web is what makes the **121 unallocated
historical sales** practical to back-fill: today the buyer's name only exists inside the
dog's name text, and each one has to be linked to a real client account by hand.

**Repo:** `diedericksdobermann-web`. **Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, Cinzel headings.

## Read first

- `diedericks-dobermanns/app/(admin)/clients/index.tsx`, `[id].tsx`
- `diedericks-dobermanns/app/(admin)/client-groups/index.tsx`, `[id].tsx`
- `src/app/admin/(panel)/dogs/unallocated/page.tsx` and
  `src/app/admin/(panel)/dogs/allocation-actions.ts` — the allocate flow already built
- `src/components/admin/ClientPicker.tsx`, `OwnershipCard.tsx` — reuse, do not duplicate

## Tables — already exist

```
client_groups(id, name, description, litter_id, type, colour, member_count int,
              created_by, created_at, updated_at)
client_group_members(id, group_id, client_id, dog_id, litter_id, added_at)
client_dog_notes(id, client_id, dog_id, nickname, personal_notes,
                 vet_practice, vet_name, vet_phone, updated_at)
```

Clients are rows in `users` with `role = 'client'`. There are only **2 client accounts**
today, so build for growth but expect an near-empty list initially — the empty state must
explain that clients appear once they register, not look broken.

## Screens

### 1. `admin/(panel)/clients/page.tsx`
Searchable list: name, email, phone, dog count, application status, joined date. Search by
name or email. Sort by name or recency.

### 2. `admin/(panel)/clients/[id]/page.tsx`
One place to see everything about a client:

- **Profile** — name, email, phone, address, joined
- **Their dogs** — via `dogs.owner_id` and confirmed/completed `reservations`. Each with an
  allocate/deallocate control reusing `allocation-actions.ts`
- **Applications** — status and link
- **Contracts** — status, signed date
- **Invoices** — outstanding vs paid, total
- **Groups** they belong to
- **Notes** — `client_dog_notes` per dog: nickname, personal notes, vet practice/name/phone

### 3. `admin/(panel)/clients/groups/page.tsx` and `groups/[id]/page.tsx`
List groups with member count and colour. Detail: add/remove members (client + optional
dog/litter), rename, recolour, delete. Groups are how litter buyers get messaged together —
link to the messaging screen from the group.

## Wiring

- Sidebar: Clients, with Groups nested under it.
- From the **Unallocated Sales** page, each row's client picker should link through to the
  client detail page.
- From a dog's admin page, the owner name should link to their client detail.

## Rules

- `requireAdmin()` in every server action; return `{ error }`, never throw.
- **Never** widen RLS to make a screen work. If a query returns nothing, the fix is the
  query or the data — not the policy. Revoking or loosening policies has taken this site
  down before.
- Do not use `createAdminClient()`.
- Client personal data (address, phone, vet details) appears only in admin routes — never
  leaks into a public page or another client's portal.
- No file over 300 lines. Loading, empty and populated states everywhere.

## Verify

- [ ] Client detail shows dogs, applications, contracts, invoices for the right client only.
- [ ] Allocating a dog from client detail makes it appear in that client's portal.
- [ ] Deallocating removes it, and removes the parent lineage certificates with it.
- [ ] A client with no dogs shows friendly empty states, not errors.
- [ ] Group membership add/remove updates `member_count`.
- [ ] `npx tsc --noEmit` exits 0; `npx next build` succeeds.

## Commit

From `diedericksdobermann-web/`, `git add -A`, one commit, after confirming
`git ls-files --others --exclude-standard src/` is empty.
