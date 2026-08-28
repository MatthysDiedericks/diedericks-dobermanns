# CURSOR PROMPT — Photos from a phone will not upload

Felicia cannot attach a photo from her phone as a supporting document on an invoice. **Nothing is
logged** — `error_events` has no row for it — so it is failing in the browser before any request
leaves. Silent failures are the worst kind: she cannot tell you what went wrong and neither can we.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## What is actually wrong — four findings, fix all of them

**Start by asking Felicia which screen and what she sees** — greyed-out photos in the picker, an
error, or a spinner that never finishes. That single answer separates the causes below. Do not skip
it and guess; that has cost a day on this project already.

### 1 · `heif` is missing from the whitelist

`src/lib/uploads/constants.ts`:

```ts
export const UPLOAD_EXT_WHITELIST = ["pdf", "jpg", "jpeg", "png", "webp", "heic"] as const;
```

iPhones produce **both** `.heic` and `.heif`, and iOS frequently reports the MIME type as
`image/heif`. Add `heif` to the whitelist and to `UPLOAD_MIME`.

### 2 · Every uploader accepts a different list

```
RecordPaymentPanel.tsx      …image/heic  … no heif
ProofOfPaymentUpload.tsx    application/pdf,image/jpeg,image/png  … no HEIC at all
VetPaperworkUpload.tsx      …image/heic,image/heif…               correct
ExpenseReceiptControl.tsx   image/*,application/pdf
```

A restrictive `accept` list makes iOS **grey out the photos in the picker** — they are visible but
cannot be tapped, which is exactly "I cannot upload photos from my phone". Export one shared
`ACCEPT_DOCUMENT` constant from `src/lib/uploads/constants.ts` and use it in every document
uploader. `VetPaperworkUpload` already has the right list — make it the standard.

### 3 · HEIC uploads "succeed" and then will not display

`src/components/ui/ImageUploader.tsx` line 129:

```ts
try {
  payload = await imageCompression(file, { maxSizeMB: 1.5, maxWidthOrHeight: 2000, useWebWorker: true });
} catch {
  payload = file;      // silently keeps the original
}
```

`browser-image-compression` decodes through a canvas, and **Chrome and Firefox cannot decode HEIC**.
The catch swallows the failure and uploads the raw HEIC. It stores fine, then renders as a broken
image for Matt on desktop — a bug that looks like a *display* problem days later, far from its cause.

- Convert HEIC/HEIF to JPEG in the browser before compressing (`heic2any` or equivalent).
- If conversion genuinely fails, **say so** — "iPhone photo format could not be read, please try
  again" — and do not upload the file. Never a silent fallback.
- Add a comment saying why, so nobody restores the quiet `catch`.

### 4 · No camera option, and a 10 MB cliff

- No uploader sets `capture`. On a phone, offering **Take a photo** directly is the natural action
  for a receipt or a vet slip. Add it where a camera makes sense.
- `MAX_UPLOAD_BYTES = 10 MB`, and when compression fails the file is not shrunk at all, so a large
  phone photo can sail past the limit. Compress **before** the size check, and if it is still too
  large say the actual size next to the limit.

## Rules

- One shared accept list. No uploader invents its own.
- A failed upload always shows a specific reason. No silent catch, ever.
- Compress before checking size.
- No file over 300 lines.

## Verify — paste output, not descriptions

- [ ] **Felicia uploads a photo from her own iPhone to the invoice she was blocked on.** Screenshot.
      This is the only test that matters — the rest is theory until she does it.
- [ ] A `.heic` file uploads, converts to JPEG, and **renders** in admin on desktop. Paste the stored
      `mime_type` — it must be `image/jpeg`, not `image/heic`.
- [ ] A `.heif` file works too.
- [ ] Force a conversion failure and confirm a visible error, and that nothing was uploaded.
- [ ] A file over 10 MB gives a message naming its size and the limit.
- [ ] `grep -rn 'accept=' src --include=*.tsx` — every document uploader uses the shared constant.
- [ ] Android photo upload still works. Say which device.
- [ ] App: same on a real device. Say which.
- [ ] Website: `npm run preflight` passes.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel reaches **Ready** on **`diedericksdobermanns-web-v145`** — the project bound to the live
      domain. The other three are duplicates; ignore them.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
