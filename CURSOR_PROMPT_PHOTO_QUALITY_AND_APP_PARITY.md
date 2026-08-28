# CURSOR PROMPT — Fix the photo quality properly, and bring the app back in step

Two jobs. **Part 2 is the more important one.**

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns`.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

# PART 1 — Photo quality: raise the parameters, do not revert

The thumbnail transformation fixed a real problem — 124 images at 27 MB in one page load, which is
why tiles were failing. **Do not revert it.** Reverting brings back the broken gallery.

The images look soft because the transform is too small and too compressed for the screens they are
viewed on. Matt works on an iPad and a laptop, both high-DPI: a 400 px-wide image shown in a 400 px
tile is displayed at half the pixel density it needs, so it looks blurry even though nothing is
technically wrong.

**Fix the numbers:**

- **Grid tiles: `?width=900&quality=82`** — roughly twice the rendered tile width, so it is sharp on a 2× display. About 60–80 KB per image rather than 226 KB, and a fraction of the page weight.
- **Lightbox and full view: the original**, no transformation at all. When Matt opens an image he wants the real thing.
- **Dog and litter hero images: `?width=1600&quality=85`.**
- **Small avatars and list rows: `?width=200&quality=80`.**

Use a **`srcset`** with 1× and 2× variants so the browser picks correctly and a laptop does not
download the retina version needlessly.

**Keep** `loading="lazy"`, `decoding="async"`, the pagination, and the `onError` placeholder. Those
were right — only the quality settings were wrong.

Put the widths in one shared module — `IMAGE_SIZES.grid`, `.hero`, `.avatar` — so nobody tunes a
number in one component and leaves the rest soft.

**Verify by eye, not by theory.** Open the gallery on a high-DPI screen and compare against the
original. If it still looks soft at 900/82, raise to 1200/85 and say so. **Matt is the judge of
this, not a lighthouse score.**

---

# PART 2 — The app has fallen five days behind

Standing rule on this project: **the website and the app have the same functions.** I checked every
feature built in the last five days. Four exist on the website and are **completely absent** from
`diedericks-dobermanns` — no file references them at all:

### 1. Whelping temperatures — the most urgent

`whelping_temperatures` is not referenced anywhere in the app. This is the feature that was
explicitly specified as *"make this the fastest screen in the app"*, because temperatures are taken
two or three times a day and the critical readings happen at 3am, on a phone, in a kennel.

**Odessa is due 26 September and Hannah 1 October.** Both are confirmed pregnant. This needs to
work before then.

Build: temperature entry on the heat cycle screen — large numeric input, time defaulting to now,
one tap to save, running list with any drop below 37.2 °C highlighted, and the push notification
that already exists on the website side. Nobody will use it if it takes more than ten seconds.

### 2. ID number validation

Applications can be reviewed in the app, but the ID format check exists only on the website. The
same rules: SA ID 13 digits with the Luhn check digit and a valid embedded date, Namibia 11,
passport 6–12 alphanumeric. **Flag, never block.** Share the validation logic — do not write a
second copy that can drift from the first.

### 3. Marketing consent

`marketing_opt_in` is not referenced in the app at all. Any client editing their profile there
cannot give or withdraw consent, and any application captured through the app collects none — which
means the app is quietly building a list nobody may email.

Add the same unticked, separate consent box to the app's application flow and portal profile,
writing `marketing_opt_in`, `marketing_opt_in_at` and `marketing_opt_in_source`.

Campaign composing stays on the website — that is a desk job. **Consent capture is not.**

### 4. The Elite Developed programme page

The curriculum is live at `/elite-developed` on the website and does not exist in the app. Add it
under Training, reading from a shared content module so the two can never say different things
about what the programme includes.

---

## Before you start: check for anything else

Do not treat that list as complete. Compare the last five days of commits in both repos and
**report anything else the app is missing** before building. I checked for the features I knew
about; there may be more.

---

## Rules

- Do not revert the image transformation — tune it.
- Image sizes live in one shared module.
- Shared logic — ID validation, consent fields, programme content — is shared, not duplicated.
- Flag, never block, on ID validation.
- Consent is never pre-ticked and never bundled with terms.
- No file over 300 lines.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify

- [ ] Gallery tiles are sharp on a high-DPI screen; page weight is well under 5 MB.
- [ ] Opening an image in the lightbox loads the untransformed original.
- [ ] No broken tiles on a full page load.
- [ ] Every image size in the codebase comes from the shared module.
- [ ] **App: a whelping temperature can be recorded in under ten seconds**, and 36.8 °C raises the alert and the push.
- [ ] App: an application with a 9-digit "SA ID" is flagged and still submits.
- [ ] App: the consent box appears on the application flow and the portal profile, unticked, and writes the timestamp and source.
- [ ] App: the Elite Developed programme is readable under Training and matches the website word for word.
- [ ] You have reported any *other* website features the app is missing.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**.
- [ ] App: `npx tsc --noEmit` exits 0.

### Build the commit, not the working tree

```powershell
git clone --no-hardlinks . ../_buildcheck
cd ../_buildcheck; git checkout <commit you are about to push>
npm ci; npx next build
cd ..; Remove-Item -Recurse -Force _buildcheck
```

- [ ] The clean checkout builds.
- [ ] **Confirm every change is in `origin/main`, not only in the working tree.** Three times this week work has been correct locally and absent from the remote — most recently the corrected Elite Developed content, which is still uncommitted as I write this.
- [ ] After pushing, report Vercel status. **Do not request GitHub or Vercel authentication** — Matt reads the dashboard.

## Commit

Separate commits: image sizing, then each app feature. **Website:** from `diedericksdobermann-web/`.
**App:** repo root is the **parent** folder. Push both, then `git log origin/main -1` in each and
confirm it matches `HEAD`.

Do not modify (committing is fine): `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/components/layout/WhatsAppButton.tsx`,
`scripts/import-dbp-contacts.mjs`.
