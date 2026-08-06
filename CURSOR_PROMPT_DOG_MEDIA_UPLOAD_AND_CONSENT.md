# CURSOR PROMPT — Upload Media Against a Specific Dog + Client Consent

Today the gallery uploader can only dump a photo into a flat category. There is no way
to say *"this is a photo of Hunter-King"*. Fix that, and let owners contribute photos of
their own dog under the kennel's control.

**Repos:** `diedericksdobermann-web` (Next.js 15) and `diedericks-dobermanns` (Expo).
**Supabase project:** `nlmwxodvquwbjinhhbmr`
**Brand:** bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel headings.

---

## Database — ALREADY APPLIED, do not recreate

Migration `dog_media_client_uploads_and_publish_control` is live. New columns on `dog_media`:

| Column | Meaning |
|---|---|
| `is_public` (bool, default **true**) | Shown on the public website |
| `client_consent` (bool, default false) | Owner ticked "Diedericks Dobermanns may make this public" |
| `uploaded_by` (uuid) | Who uploaded it |
| `approved_by`, `approved_at` | Who published it and when |

RLS already in place:

- **Public** sees an item only if `dog_media.is_public = true` **and** the dog is public.
- **Owners** see everything on a dog they own (published or not).
- **Owners may INSERT** on their own dog, but the policy forces `is_public = false`. A client
  physically cannot self-publish. Do not try to work around this.

`is_public` defaults to **true** so the 256 existing photos stayed live. Staff uploads keep
that default; **client uploads must explicitly insert `is_public: false`.**

---

## Dog groupings

Build one shared helper — do not hardcode these lists in each screen:

```ts
// src/lib/dogs/groups.ts  (mirror in the app under lib/)
export const DOG_GROUPS = [
  { key: 'breeding',   label: 'Breeding Stock',              match: (d) => ['keep','stud'].includes(d.status) },
  { key: 'training',   label: 'In Training',                 match: (d) => d.status === 'in_training' },
  { key: 'elite',      label: 'Elite Developed',             match: (d) => d.programme_tier === 'elite_developed' },
  { key: 'protection', label: 'Elite Family Protection Dogs',match: (d) => d.programme_tier === 'protection_dog' },
  { key: 'puppies',    label: 'Available Puppies',           match: (d) => d.status === 'available' },
  { key: 'sold',       label: 'Sold / Placed',               match: (d) => d.status === 'sold' },
];
```

Live counts today: breeding 12, in training 2, elite developed 2 (Bruce, Jazzmine),
protection 0, available 11, sold 121. A group with no dogs must not render an empty heading.

---

## Part 1 — Admin: attach uploads to a dog

Extend the gallery uploader (`src/components/admin/GalleryManager.tsx`, which already has a
Timeline mode — follow that pattern, do not rebuild the uploader).

Add a **Destination** selector with three modes:

1. **Gallery category** — current behaviour, unchanged.
2. **A specific dog** — new. Shows a grouped dog picker (grouped by `DOG_GROUPS`, searchable
   by name). On upload, insert into `dog_media` with `dog_id`, `type` (`photo`/`video`),
   `url`, `uploaded_by`, and `is_public` from a tick box labelled
   **"Also show on the public website"** (default ticked for staff).
3. **Timeline** — existing behaviour, unchanged.

Reuse `ImageUploader` with `confirmBeforeUpload` so the preview-and-confirm step still applies.
Surface any insert error in the UI — a silently swallowed error is what previously hid the
gallery category bug.

Also add the same dog picker to the mobile admin media screen.

## Part 2 — Admin: review client uploads

New page `src/app/admin/(panel)/media/pending/page.tsx` (+ nav item, with a count badge).

Lists `dog_media` where `is_public = false`, newest first, showing per item: the photo, the
dog's name, who uploaded it, when, and a clear **consent badge**:

- `client_consent = true` → gold "Owner approved publishing"
- `client_consent = false` → muted "Owner did NOT give permission"

Actions per item: **Publish** (sets `is_public = true`, `approved_by`, `approved_at`),
**Keep private**, **Delete**.

**Publish must be blocked when `client_consent = false`** on a client-uploaded item — disable
the button and explain why in the tooltip. This is a permission the owner gave you; do not let
the UI bypass it.

## Part 3 — Client: upload photos of their own dog

Website: `src/app/portal/(panel)/dogs/[id]/` — add an "Add Photos" section.
App: the existing `app/(portal)/add-photos/[dogId].tsx` screen.

Both must:

- Only offer dogs the client owns (RLS enforces it; the UI should not show others).
- Insert with `is_public: false` and `uploaded_by: auth.uid()`.
- Show a **required** tick box before upload is enabled:

  > **Are Diedericks Dobermanns allowed to make this photo public?**
  > Ticking this lets us use your photo on our website and social media. Leave it unticked and
  > only you and the kennel will see it.

  The tick sets `client_consent`. Unticked is allowed — it just means private.
- After upload, show the item with a **"Awaiting kennel review"** chip so the client is not
  confused about why it is not on the public page.

---

## Critical warnings

- **Never** let a client set `is_public = true`. RLS blocks it; the UI must not try.
- **Never** use `createAdminClient()` in a portal route — RLS does the scoping there.
- Do not change the `is_public` default on `dog_media`; it is what keeps the 256 existing
  photos live.
- Every Supabase call checks `error` and surfaces it. No file over 300 lines.
- Storage: `dog-media` bucket. Staff and owners can INSERT; only staff can delete/update.

## Execution order

1. `npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > src/types/database.types.ts` (both repos).
2. `src/lib/dogs/groups.ts` shared helper.
3. Part 1 (admin attach-to-dog), then Part 2 (review queue), then Part 3 (client upload).
4. `npx tsc --noEmit` and `npx next build` must both pass.

## Testing checklist

- [ ] Upload to a specific dog as admin with the tick on → appears on that dog's public profile.
- [ ] Same with the tick off → appears in the admin review queue, NOT on the public site.
- [ ] Public dog pages still show all their existing photos (regression check — 256 rows today).
- [ ] As a client, upload to your own dog → lands with `is_public=false`, shows "Awaiting kennel review".
- [ ] Client cannot see or select another client's dog.
- [ ] Publish button is disabled for an item where `client_consent = false`.
- [ ] Dog groups with zero dogs do not render an empty heading.

## Commit

One commit, `git add -A`. Confirm `git ls-files --others --exclude-standard src/` returns
nothing before committing — untracked files shipping alongside their importer has broken
every previous build here. Run from the correct repo folder: the website repo root is
`diedericksdobermann-web/`, the app repo root is the **parent** folder.
