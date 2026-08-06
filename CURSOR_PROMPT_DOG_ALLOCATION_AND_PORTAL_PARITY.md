# CURSOR PROMPT — Dog Allocation + Website Portal Parity

Two connected jobs:

1. **Allocation** — give admins a way to link a dog to a client's login. Nothing does this today, which is why the client portal shows every client an empty page.
2. **Portal parity** — the website portal has 7 pages, the mobile app has 28. Build the core client-value pages on the website, including the sire/dam pedigree and health certificates for the dog a client was allocated.

---

## Context

**Repo:** `diedericksdobermann-web` (Next.js 15 App Router, TypeScript strict, Tailwind v4)
**Supabase project:** `nlmwxodvquwbjinhhbmr`
**Brand:** background `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel headings, Lato body. Premium, dark, restrained.

**Read before writing code:**

- `src/lib/portal/dogs.ts`, `documents.ts`, `health.ts`, `training.ts`, `auth.ts`
- `src/app/portal/(panel)/page.tsx` (dashboard), `dogs/[id]/page.tsx`
- `src/lib/dogs/health-documents.ts` — already written; signs public certificates server-side
- `src/components/dogs/HealthCertificates.tsx` — the public-page equivalent; match its visual language
- `src/components/pedigree/PublicDogPedigreeSection.tsx` — reuse, do not rebuild
- `src/app/admin/(panel)/dogs/[id]/page.tsx` and `actions.ts`

### Data model facts — verified against the live database, do not assume otherwise

| Fact | Value |
|---|---|
| Dogs total | 175 |
| Marked `sold` | 121 |
| With `owner_id` set | **0** |
| Rows in `reservations` | **0** |
| With direct `mother_id`/`father_id` | **3** |
| Linked to a litter (`litter_id`) | **155** |
| Dogs whose parents hold certificates | **150** |
| Client user accounts | 2 |

**Parentage lives on the litter, not the dog.** `litters.mother_id` / `litters.father_id` is the real lineage link for 155 dogs; the direct columns on `dogs` are set for only 3. Any query that resolves a dog's parents MUST fall back to the litter:

```sql
coalesce(dogs.mother_id, litters.mother_id)
coalesce(dogs.father_id, litters.father_id)
```

Getting this wrong makes the feature work for 3 dogs instead of 150. This is the single most important detail in this prompt.

### Database work already applied — do NOT recreate

Migrations `documents_scope_to_owned_dogs_and_parents` and `my_dog_parent_ids_resolve_via_litter` are live:

- `public.my_dog_ids()` — dogs the caller owns (`dogs.owner_id`) or has a `confirmed`/`completed` reservation for.
- `public.my_dog_parent_ids()` — the sire and dam of those dogs, resolved via **both** the direct columns and the litter.
- RLS policy `Clients view own dog and its parents documents` — a client sees all documents on their own dog, plus `dna_test` / `hip_elbow_score` / `pedigree` / `registration` on the sire and dam. Category `other` is **excluded** because it holds private kennel paperwork (invoices, correspondence).

Verified by test: allocating one dog to a client yielded 1 own-dog document + 17 parent lineage certificates + 0 private documents leaked.

**Do not weaken these policies.** If a query returns nothing, the fix is the query or the allocation data — never the policy.

---

## Part 1 — Allocate a dog to a client

### 1.1 Server action

Create `src/app/admin/(panel)/dogs/allocation-actions.ts`:

- `allocateDogToClient(dogId: string, clientUserId: string)` — sets `dogs.owner_id`, and inserts a `reservations` row with `status = 'confirmed'` so both ownership paths agree.
- `deallocateDog(dogId: string)` — clears `owner_id` and cancels any active reservation. Sales fall through; this must be reversible.
- Both must verify the caller is an admin (`is_admin()`), return `{ error }` rather than throwing, and call `revalidatePath` on the admin dog page and `/portal`.

Never trust a `clientUserId` from the form without confirming it exists in `users` with role `client`.

### 1.2 UI

On `src/app/admin/(panel)/dogs/[id]/page.tsx`, add an **Ownership** card:

- Current owner (name + email) or "Not allocated".
- A searchable client picker — typeahead over `users` where `role = 'client'`, matching name or email. A plain `<select>` will not survive a few hundred clients.
- "Allocate" and "Remove allocation" buttons, each with a confirmation step naming the dog and the client.
- Show what the client will gain: *"They will see this dog's records, plus the health certificates and pedigree of {sire} and {dam}."* Resolve those names via the litter fallback.

### 1.3 Back-filling the 121 historical sales

The buyer's name currently sits inside the dog's `name` ("Puppy 4 GOLD Michael Steyn Elite", "Sasha Nagel"). **Do not attempt to parse names out of these strings** — it is unreliable and would silently mis-assign a client's records to a stranger.

Instead, add an admin page `src/app/admin/(panel)/dogs/unallocated/page.tsx` listing every dog with `status = 'sold'` and `owner_id IS NULL`, with the name string shown verbatim and an allocate control on each row. Matt links them by hand as buyers register. Include a count badge so the backlog is visible.

---

## Part 2 — Portal dog page: pedigree + lineage certificates

Extend `src/app/portal/(panel)/dogs/[id]/page.tsx`.

### 2.1 New data helper

Create `src/lib/portal/lineage.ts`:

```ts
export type LineageParent = {
  id: string;
  name: string;
  role: "sire" | "dam";
  photoUrl: string | null;
  hipScore: string | null;
  elbowScore: string | null;
  dcmStatus: string | null;
  documents: PortalDocument[];   // signed URLs
};

/** Sire and dam of a dog the client owns, with their health papers. */
export async function fetchDogLineage(dogId: string): Promise<LineageParent[]>
```

Requirements:

- Resolve parents with the `coalesce(dog, litter)` fallback above.
- Use the **request-scoped** client from `@/lib/supabase/server` — RLS is what enforces access here. Do **not** use `createAdminClient()`; that bypasses RLS and would hand every client every document.
- Sign each document with `createSignedUrl(path, 3600)`.
- Reuse `cleanDocumentTitle()` from `src/lib/dogs/health-documents.ts` — raw names are lab exports (`Test Results_DG2024_81490 (Electra Hannah)_Dilated Cardiomyopathy (PDK4)`) and carry HTML entities. Export it if it is not already exported; do not duplicate the logic.
- Return `[]` on error after `console.error`. A failed lookup must not 500 the client's dog page.

### 2.2 Component

`src/components/portal/LineageDocuments.tsx` — sire and dam side by side (stacked below `lg`), each with photo, name, health chips, and its certificates grouped by category. Match `HealthCertificates.tsx` styling. Links open in a new tab.

Copy above the section: *"The health testing and registration papers behind {dog name} — the lineage you bought into."*

Empty state when a parent has no documents: *"No documents on file for {parent name} yet."* Never render an empty card with no explanation.

### 2.3 Pedigree

Render `<PublicDogPedigreeSection dogId={dog.id} displayName={dog.name} />` below the lineage section. It already handles its own data fetching and empty state.

---

## Part 3 — Core portal pages

Build these on the website, mirroring the mobile app screens named in brackets. Match the existing portal layout (`AdminHeader`, `cardClass`, `force-dynamic`).

| Route | Mirrors | Content |
|---|---|---|
| `/portal/documents` | `documents.tsx` | **Exists — extend.** Group by dog, then category. Add the lineage documents so a client finds parent papers here too. |
| `/portal/vaccinations` | `vaccination-records.tsx` | Per dog, date administered, vaccine, next due. Overdue in red, due-within-30-days in gold. |
| `/portal/health` | `health-schedule.tsx` | Combined upcoming schedule across all their dogs — vaccinations, dewormings, vet visits. Sorted by date, overdue first. |
| `/portal/contracts` + `/portal/contracts/[id]` | `contracts.tsx` | List with status. Detail shows the document and signature state. Reuse `fetchMyContracts()` in `src/lib/portal/documents.ts`. |
| `/portal/invoices` + `/portal/invoices/[id]` | `invoices/` | Number, date, amount, paid/outstanding status, line items on detail. **Read-only — do not build payment initiation.** |
| `/portal/notifications` | `notifications.tsx` | Reverse-chronological, unread marker, mark-as-read action. |
| `/portal/profile` | `profile.tsx` | View and edit own name, phone, address. Email and role are **not** editable. |

Add every one to the portal navigation in `src/app/portal/(panel)/layout.tsx`, and surface counts on the dashboard (outstanding invoices, unsigned contracts, unread notifications, health items due).

**Out of scope this pass** — do not build: messages, expected litters, waitlist, reservation, puppy tracker, training bookings, training video library, milestones, client photo upload, groups.

---

## Critical warnings

- **Never** use `createAdminClient()` in a portal route. Portal pages are client-scoped and RLS must do the scoping. The admin client bypasses RLS entirely.
- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` to the browser, and never prefix it `NEXT_PUBLIC_`.
- The `documents` storage bucket is **private and stays private**. Access is via short-lived signed URLs only.
- Do not publish category `other` anywhere client-facing or public. It holds invoices and correspondence.
- No file over 300 lines. Split into components and hooks before you reach it.
- Every Supabase call checks `error`. Every list has loading, empty, and populated states.
- Do not "tidy" the self-referencing FK embeds (`mother:mother_id(...)`). The constraint-name form returns a 400 and silently 404s the page — there is a comment explaining this at each site.

## Execution order

1. Migration check — confirm `my_dog_ids()` and `my_dog_parent_ids()` exist; do not recreate them.
2. Regenerate types: `npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > src/types/database.types.ts`
3. Part 1 (allocation) — this unblocks all testing, since no client can see anything until a dog is allocated.
4. Part 2 (lineage + pedigree).
5. Part 3 (core pages).
6. `npx tsc --noEmit` then `npx next build`, both must pass.

## Testing checklist

- [ ] Allocate a dog to the test client, sign in as them, confirm the dog appears with sire/dam certificates.
- [ ] Confirm that client **cannot** see documents for a dog they were not allocated.
- [ ] Confirm no category `other` document appears anywhere in the portal for a parent dog.
- [ ] Deallocate; confirm the dog and its lineage documents disappear from that client's portal.
- [ ] A client with no dogs sees friendly empty states, not errors, on every new page.
- [ ] Certificate titles render cleaned (`Dilated Cardiomyopathy (PDK4)`, `von Willebrand's Disease Type I`) — never the raw lab string.
- [ ] Signed URLs open the correct PDF.
- [ ] `npx tsc --noEmit` exits 0; `npx next build` succeeds.
- [ ] No file over 300 lines.

## Commit

Commit the **entire** change set in one go. Partial change sets — a file left untracked while its importer ships — have caused every failed build on this project so far. Before committing, run `git status --short` and confirm nothing under `src/` is left unstaged.
