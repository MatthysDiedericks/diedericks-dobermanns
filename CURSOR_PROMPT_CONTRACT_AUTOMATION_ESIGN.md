# Cursor Prompt — Contract Auto-Generation, Release Trigger & In-App Signature

## Context

Diedericks Dobermanns app. Supabase project `nlmwxodvquwbjinhhbmr`. Brand: `#111008` bg / `#C4A35A` gold / `#F5F0E8` text, Cinzel headings, Lato body.

**Already built — do not rebuild these, extend them:**
- `contracts` table already has everything needed for this feature: `id, reservation_id, client_id, dog_id, litter_id, template_id, contract_title, body_html, document_url, status, signed_by_client, client_signed_at, signed_by_breeder, breeder_signed_at, esign_token, esign_expires_at, esign_sent_at, client_ip_on_sign, notes, created_at`. RLS already correct (admins manage all, clients view own) — do not touch RLS.
- `contract_templates` table with `name, body_html, contract_title` — **2 templates already exist**: "Puppy Sales Contract" and "Protection Dog Sales Agreement" (matching the standard-puppy vs elite-protection-dog product tiers). This prompt merges these templates with real data — it does not need new template content from Matt.
- `hooks/useContracts.ts` (admin, all contracts) and `hooks/useLitterContracts.ts` (per-litter) — both have `createContract()` and a `sendEsign()` that currently only writes a fake token, no real send. This prompt replaces the "fake" half of `sendEsign` with real generation + delivery; keep the function name/shape where reasonably possible so existing call sites don't all need rewiring.
- `components/litters/LitterContractsTab.tsx` + `CreateLitterContractSheet.tsx` — draft-creation UI already exists and works.
- Admin contracts screen: `app/(admin)/contracts/index.tsx`. Portal: `app/(portal)/contracts.tsx` (list) + `app/(portal)/contracts/[id].tsx` (detail) — currently "signing" is just a checkbox + button flipping `signed_by_client`. This prompt replaces that with a real signature capture.
- `supabase/functions/send-email/` exists and works — reuse for sending the contract link to the client.

**What's missing (the actual task) — confirmed with Matt:**
1. Trigger: a **manual "Release" button** (not automatic on status change, not a cron) — admin clicks it once a puppy is confirmed collected/going home, and the system generates + sends the contract right then.
2. Real contract document generation: merge `contract_templates.body_html` with the actual client, puppy, litter, and price data — not just a title.
3. Real signature capture: an **in-app signature pad** (drawn signature, not a checkbox), saved as an image with a timestamp + IP/device audit trail.
4. Auto-save: once the client signs, the contract flips to signed with the signature image attached — no manual admin step needed to "close it out."

---

## Task 1 — Migration: signature storage + release tracking

`supabase/migrations/00XX_contract_signature_release.sql` (check latest migration number, increment; comment explaining purpose at top):
- `alter table contracts add column if not exists client_signature_url text;`
- `alter table contracts add column if not exists client_signature_device text;` (basic user-agent string captured at sign time, alongside the existing `client_ip_on_sign`)
- `alter table dogs add column if not exists released_at timestamptz;` — tracks when the Release button was clicked for that puppy, independent of `status` (so this doesn't require inventing a new status value or touching the existing `dogs_status_check` constraint).
- New Supabase Storage bucket `contract-signatures` (private, not public) — signature images are personal data, must not be publicly readable. Access via signed URLs only, same pattern as any other private document storage already used in this project (check `documents` storage bucket policy and mirror it).

## Task 2 — Contract document generation (merge template + data)

Create `lib/contracts/generateContract.ts` (keep under 200 lines; split into a `templateMerge.ts` helper if it grows):
- `mergeContractTemplate(bodyHtml: string, data: ContractMergeData): string` — simple `{{placeholder}}` token replacement (e.g. `{{client_name}}`, `{{puppy_name}}`, `{{litter_name}}`, `{{price}}`, `{{date}}`, `{{microchip_number}}`, `{{registration_number}}`). Check what tokens the 2 existing `contract_templates.body_html` values actually use before inventing the token list — read the real content from the DB first, don't guess the placeholder names.
- `ContractMergeData` type pulls from: `dogs` (name, microchip_number, registration_number, colour, sex, date_of_birth), `litters` (name, mother/father names via join), `users`/client record (full_name, address, phone, email), and price — check where price currently lives (likely `reservations` or a `price` field on `dogs`) before assuming a column name.
- Output is HTML — reuse the existing `expo-print` (`Print.printToFileAsync`) pattern already used in `PuppyGrowthChart.tsx`'s PDF export for consistency, to turn the merged HTML into a PDF, upload it to the existing `documents`-style storage pattern, and store the resulting URL in `contracts.document_url`.

## Task 3 — The "Release & Send Contract" action

Add a `releaseAndSendContract(puppyId, clientId, templateId)` function in `hooks/useLitterContracts.ts` (or a new `hooks/useContractRelease.ts` if it would push the file over 300 lines):
1. Set `dogs.released_at = now()`.
2. Create (or reuse an existing draft) `contracts` row, call `mergeContractTemplate()` from Task 2 to build `body_html` + generate the PDF.
3. Generate `esign_token` (reuse existing token-generation logic from the current `sendEsign`) and set `esign_sent_at`, `status = 'sent'`.
4. Call `send-email` Edge Function with a link to the portal signing screen (`app/(portal)/contracts/[id].tsx`), addressed to the client.
5. Surface this as a **"Release & Send Contract"** button on the puppy row inside `LitterContractsTab.tsx` (and/or the puppy detail screen — wherever admin would naturally mark a puppy as going home; check `app/(admin)/litters/[id]` puppies tab for the most natural placement) — only enabled once a client is actually linked to that puppy (reserved/sold with a `client_id` present), disabled with an explanatory tooltip/label otherwise.

## Task 4 — In-app signature pad

Install a signature-capture library appropriate for Expo (check for one that supports Expo's managed workflow without requiring a custom dev client rebuild if possible — e.g. a canvas-based pure-JS/react-native-svg approach is safest given this project's existing SVG usage in `PuppyGrowthChart.tsx`; avoid a library requiring native linking unless there's no SVG-based alternative, since that adds an EAS rebuild step Matt would need to run).

Create `components/contracts/SignaturePad.tsx` (under 150 lines):
- Draw-to-sign canvas, "Clear" button, "Confirm Signature" button (disabled until something is drawn).
- On confirm: export the drawing as a PNG/base64, upload to the `contract-signatures` bucket from Task 1, return the storage path.

Edit `app/(portal)/contracts/[id].tsx`:
- Replace the current checkbox-and-button "signing" flow with: render the merged contract HTML/PDF for review (reuse `document_url`), then present `SignaturePad`.
- On signature confirm: upload signature image, capture device user-agent, set `contracts.signed_by_client = true`, `client_signed_at = now()`, `client_signature_url`, `client_signature_device`, `client_ip_on_sign` (reuse however IP is currently captured elsewhere, or via the Edge Function if client-side IP isn't reliably available — check existing pattern before inventing one), `status = 'signed'` — **this is the "auto-save as signed" step**, no separate admin action needed to finalize it.
- Show a clear confirmation state once signed (contract now read-only, signature displayed).

## Task 5 — Admin visibility

`app/(admin)/contracts/index.tsx` and `LitterContractsTab.tsx`: show the new `released_at` and signature status clearly in the list (e.g. a "Signed ✓ {date}" badge with the signature thumbnail visible on tap), so admin can see at a glance which released puppies still have a contract outstanding.

---

## Critical warnings

- Do NOT make the signature-images bucket public — this is personal legal data.
- Do NOT invent a new `dogs.status` value for "released" — use the new `released_at` timestamp column instead, so the existing `dogs_status_check` constraint and every screen that already filters on `status` keeps working unchanged.
- Do NOT guess the template placeholder tokens — read the actual `contract_templates.body_html` content from the DB first.
- Do NOT pick a signature-pad library that requires a custom native module unless no SVG/canvas-based pure-JS option exists — a native module means Matt has to run a new EAS build before this feature works, which is a much bigger ask than a JS-only library.
- Keep every touched/new file under 300 lines.

## Testing checklist

- [ ] Release button only appears/enables when a client is linked to the puppy
- [ ] Clicking Release generates a real PDF with the actual client/puppy/price data merged in (not placeholder text)
- [ ] Client receives an email with a working link to the signing screen
- [ ] Client can draw and clear their signature before confirming
- [ ] Confirming saves the signature image, flips `signed_by_client`/`status` automatically — no admin step required
- [ ] Signed contract is visible (with signature) in both portal and admin views afterward
- [ ] A puppy with no linked client cannot be released
- [ ] `npx tsc --noEmit` passes cleanly
- [ ] No file over 300 lines
