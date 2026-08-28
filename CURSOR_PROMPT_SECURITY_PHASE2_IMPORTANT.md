# CURSOR PROMPT — Security Phase 2 (IMPORTANT)

**Run only after `CURSOR_PROMPT_SECURITY_PHASE1_CRITICAL.md` is applied and verified.**
Findings: `SECURITY_AUDIT_2026_08_18.md`.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.

---

## Verified facts — do not re-derive

- Public buckets: **`dog-media`, `gallery`, `training-videos`.** Private: `documents`, `litter-media`, `broadcasts`, `contract-signatures`.
- `Auth insert dog-media` and `Auth insert gallery` are `bucket_id = X AND auth.role() = 'authenticated'` — **no path restriction at all**.
- `apply_marketing_opt_out(p_contact_id uuid)` is `SECURITY DEFINER`, anon-callable, and has **no guard**.
- **`is_admin()` / `is_trainer_or_above()` are used in RLS. Never revoke `EXECUTE` on them.**

---

## 1 · Stop bucket enumeration

Public **reads** on `dog-media`, `gallery` and `training-videos` are intended — the website serves
images straight from them. Public **listing** is not.

Anyone can currently enumerate every object name in those buckets. That exposes filenames, upload
patterns, and anything ever put in the wrong bucket. **A file nobody linked to is not a file nobody
can find.**

Add policies that permit `select` on a **specific object** but deny listing to `anon`. Keep
`authenticated` listing where the admin UI needs it.

**Verify by attempting it as `anon`, not by reading the policy.**

## 2 · Scope uploads to the media buckets

Any signed-in client can currently write anywhere in `dog-media` and `gallery` — meaning a buyer can
upload into your public gallery.

- **`gallery` and `training-videos`: staff only** (`is_trainer_or_above()`).
- **`dog-media`: staff anywhere; a client only under `{auth.uid()}/…`**, if client dog-photo upload is a feature you want. If it is not, make it staff-only and say so.
- Keep the existing delete/update policies. Do not widen them.

## 3 · Upload validation

Applicants upload documents from the public internet, and nothing is checked.

- **Whitelist** `pdf, jpg, jpeg, png, webp, heic`. Never blacklist — a blacklist is a list of the attacks you already thought of.
- **Verify magic bytes, not the extension.** A `.exe` renamed `.pdf` must be refused.
- **10 MB per file, 5 files per application.**
- Store as `{owner_scope}/{uuid}.{ext}` — **never the user-supplied filename.** Path traversal, script-named files and overwrite collisions all die at this line.
- Strip EXIF from uploaded images. Buyer photos carry GPS coordinates of their home.
- Enforce identically in the app. **The app uploads to the same bucket**, so a check that exists only on the website is not a check.

## 4 · Signed unsubscribe tokens

`apply_marketing_opt_out(contact_id)` takes a bare UUID and is callable by anyone, unauthenticated.
Guess or scrape a contact ID and you can opt that person out.

**Do not simply revoke `anon`** — the unsubscribe link in an email has no session, and breaking it
would breach POPIA s69, which is a worse outcome than the nuisance it prevents.

Replace the bare ID with a **signed, expiring token**: HMAC of `contact_id + purpose + expiry` using
a new server-only `UNSUBSCRIBE_SECRET`. The function verifies the signature before acting.

- Token valid 90 days. Expired tokens land on a page with a working "unsubscribe me" form, never a dead end.
- Unsubscribing must keep working without logging in. **Never make someone authenticate to leave a mailing list.**

## 5 · Two dashboard items — list these at the end of your reply

1. **Enable leaked-password protection** — Supabase Dashboard → Authentication → Policies. Two minutes. Open since 31 July. Portal accounts hold contracts and ID documents.
2. **`felicia03@rocketmail.com` holds `admin`** — confirm or downgrade to `client`.

---

## The app

Same upload whitelist, size caps, magic-byte check, EXIF stripping and storage paths. Same scoped
bucket policies apply automatically — **test them from the app** rather than assuming.

## Rules

- Whitelist, never blacklist.
- User-supplied filenames are never used as storage paths.
- Unsubscribe never requires a login.
- Never revoke `EXECUTE` on `is_admin()` or `is_trainer_or_above()`.
- `UNSUBSCRIBE_SECRET` server-only, distinct from every other salt.
- No file over 300 lines. Regenerate types in **both** repos with `Set-Content -Encoding utf8`.

## Verify — paste output

- [ ] As `anon`, listing `gallery`, `dog-media` and `training-videos` returns nothing; a direct object URL still loads an image. Paste both.
- [ ] The public gallery page still renders every image. **Load it, don't infer it.**
- [ ] A non-staff client cannot upload to `gallery`.
- [ ] A `.exe` renamed `.pdf` is rejected on magic bytes.
- [ ] An 11 MB file is rejected with a readable message; a 9 MB file succeeds.
- [ ] A file named `../../evil.php` lands as a UUID under the correct folder — paste the stored path.
- [ ] An uploaded photo with GPS EXIF has it stripped — show before and after.
- [ ] An unsubscribe link from a real email works while logged out.
- [ ] A tampered or hand-made token is refused.
- [ ] An expired token shows the manual form, not an error page.
- [ ] `apply_marketing_opt_out` with a bare contact ID and no valid token now fails.
- [ ] App: same upload rules enforced — test from the app.
- [ ] App: a client cannot upload into `gallery`.
- [ ] For each app file, `ls` the path and paste it. Do not rely on grep.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. App: `npx tsc --noEmit` exits 0.
- [ ] `git log origin/main -1` matches `HEAD` in both repos — paste both hashes.
- [ ] After any policy change, load the live public site and a live client portal.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
