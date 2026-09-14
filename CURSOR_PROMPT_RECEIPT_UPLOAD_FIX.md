# CURSOR PROMPT — Expense receipt upload: bucket now exists, viewing needs signed URLs

**Repo:** `diedericksdobermann-web` + mirror into `diedericks-dobermanns` (standing parity rule).
**Supabase:** `nlmwxodvquwbjinhhbmr`.

## What was wrong

`src/components/finance/ExpenseReceiptControl.tsx` uploads to `bucket="receipts"` (lines 22 and
56). **That bucket did not exist**, and no `storage.objects` policy referenced it. Uploads went
through `uploadValidatedFile` in `src/lib/uploads/clientUpload.ts`, which calls
`supabase.storage.from(bucket).upload(...)` **client-side with the user's own session**, so every
attempt failed with a storage error — for every user, admin or not. Nothing in
`supabase/migrations/` ever created it.

## Already done in the live database — do not repeat

A migration has been applied by hand creating the bucket and its policies:

- bucket `receipts`, **private** (`public = false`), 20 MB limit
- four `storage.objects` policies — select / insert / update / delete — each
  `bucket_id = 'receipts' and is_admin()`

**Add the matching migration file to the repo** so the schema is reproducible, using the next free
number, with the same contents. Do not re-run it against production and do not change the
policies.

Private was deliberate: a receipt carries supplier, amount and account detail. Do not make this
bucket public.

## What you need to fix in code

`clientUpload.ts` finishes with `supabase.storage.from(bucket).getPublicUrl(path)` and returns
that as the URL. For a private bucket that URL does not resolve, so the **"Current receipt →"**
link on an existing expense will not open.

Store the **storage path**, not a public URL, and sign on demand:

1. `uploadValidatedFile` already returns `storagePath`. For private buckets, persist that rather
   than the public URL. `expenses.receipt_url` currently holds a URL string — keep the column but
   store the path, and handle both shapes on read so existing rows do not break.
2. Serve the file through a route that signs it — follow the existing pattern already used for the
   `documents` bucket (signed URLs of the form
   `/storage/v1/object/sign/documents/...` are already in use), or add
   `/api/expenses/[id]/receipt` behind `requireAdmin()` that creates a short-lived signed URL and
   redirects. Do **not** hand the client a service-role key and do not use `createAdminClient()`
   in a client component.
3. Make the same change anywhere else a private bucket is uploaded to via `getPublicUrl` — check
   every `ImageUploader` call site and fix the ones pointing at private buckets. `dog-media`,
   `gallery` and `equipment` are public and are fine as they are.

## Surface the real error

`ImageUploader` shows `error.message` from Supabase, which is why this read as "it just doesn't
work" rather than "that bucket is missing". When a storage upload fails, log it via `logError()`
with `SECURITY_UPLOAD_REJECTED` or a new `UPLOAD_FAILED` code, including the bucket name, so a
broken bucket shows up on the errors dashboard instead of dying silently on someone's phone.

## Context worth knowing

Felicia has two accounts: `felicia03@rocketmail.com` (role `admin`, the one she actually signs in
with) and `felicianell6@gmail.com` (role `client`, last used 17 Aug). `is_admin()` covers
`admin` and `super_admin`, so her admin account passes the new policies. **Do not** merge or delete
either account as part of this work — flag it to Matt instead.

## Verify — in a browser, on a phone and a desktop

- [ ] Signed in as an **admin who is not super_admin**, adding an expense with a photographed
      receipt uploads successfully from a phone camera and from a desktop file picker.
- [ ] The saved expense's "Current receipt →" link opens the file.
- [ ] Replacing a receipt works, and the original stays attached until the new upload succeeds.
- [ ] An existing expense whose `receipt_url` holds an old-style URL still opens.
- [ ] Signed in as a **client**, the receipt file cannot be fetched — check the network response,
      not just the absence of a link.
- [ ] A failed upload now writes an `error_events` row naming the bucket.
- [ ] `npx tsc --noEmit` exits 0; `npx next build` succeeds.

## Commit and push

Commit **both** repos and push both. Confirm `git rev-list --left-right --count origin/main...HEAD`
reads `0 0` in each.
