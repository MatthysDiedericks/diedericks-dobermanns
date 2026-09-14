# CURSOR PROMPT — Every puppy needs a working profile of its own

Matt clicked a dog on `/admin/dogs` and got "Something went wrong". That page is the doorway to every
puppy's records, so nothing else here matters until it opens.

**Do section 1 first and do not start section 2 until the page loads.** Building profile features on
top of a crashing page wastes the build.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns`. Parity is enforced in CI now.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Brand `#111008 / #1C1A0E / #C4A35A / #F5F0E8`, Cinzel/Lato.
**No migration.** Every field named below already exists.

---

## 1. The dog profile page crashes — find out why, properly

`src/app/admin/(panel)/dogs/[id]/page.tsx`. Matt saw it on the Dogs list; the visible dogs were
COOPER, KAISER, MAX and BAILEY, all older imported records.

**The error boundary is lying.** `src/app/admin/(panel)/error.tsx` tells the user "We have logged this
automatically" — but **nothing reached `error_events`**. I checked: the only row in the last three
hours is an unrelated payment upload. So the promise on screen is false and we have no stack trace.

**Fix that first.** `ClientErrorBoundaryFallback` in `@/components/issues/ErrorCapture` must call
`logError` with code `PAGE_RENDER`, area `admin`, the route, the message and the `digest`. Then
reproduce and read the real cause instead of guessing.

**I have already ruled out the data.** There are zero dogs with a broken owner, buyer or litter link
— so it is not a dangling foreign key. The page fires about fifteen queries across two
`Promise.all` blocks, and only `fetchDogOwnerBundle` and `fetchHealthRemindersForDog` have a
`.catch()`. Any of the others throwing takes the whole page down. Likely suspects, in order:
`resolveParentIdsAsAdmin`, `fetchAncestorAnalysisPayload`, `fetchDogProfileBundle`,
`fetchDogLitterHistory`.

Load the page as Matt for **COOPER specifically**, get the actual error, and fix that. Then make the
page resilient: a failure in pedigree analysis or litter history should collapse that one card to a
short "could not load" message, not blank the entire profile.

**Note before you start:** this repo has local commits that were never pushed — `HEAD` is
`b12818a`, `origin/main` is `d75b395`. Establish which commit is actually live before concluding
anything about the bug.

## 2. A litter filter on the Dogs list

`/admin/dogs` has 173 dogs and filters for category, status and programme tier — but no way to see
one litter. Finding the Claire × Santini pups means scrolling 173 rows.

Add a **Litter** dropdown beside the existing three. Newest litter first, labelled as the litter is
named (`Claire × Santini – Jul 2026`), with a count: `Claire × Santini – Jul 2026 (10)`. Include an
"No litter" option — most of the 173 are older dogs with no litter recorded.

Filters must combine, and the row count line ("173 of 173") must reflect the result.

## 3. The puppy profile itself

Clicking a puppy must open **its own** profile. Each of the 10 Claire × Santini pups already has: a
collar colour, sex, price, programme tier, a linked owner contact, and **10 weight readings**. The
page must show them.

**Weights.** The litter weight table already renders well — reuse that formatting, per dog, as a
growth line over time rather than a wall of numbers. Puppy 10 has no weights and is deceased; show a
plain empty state, not a broken chart.

**Documents and health.** The dog profile is where a puppy's own papers live — vaccination card,
microchip, health certificates, pedigree. Right now only 4 of the 10 pups have any document at all.
Make attaching one obvious from the profile, and make it clear which are visible to the owner and
which are internal. **Do not invent a new visibility rule** — the three-tier model already exists
(public health certificates / client-scoped / private) and must be reused as-is.

**Owner link.** Show the linked owner with a link through to their client record.

## 4. Weights must reach the new owner

Matt's words: the weights "need to pull through as individual to the new owner". A buyer should open
their portal and see their own puppy's growth — the same chart, their dog only.

The portal already scopes dogs to the signed-in client. Add the growth chart to the portal dog page,
reusing the same component as the admin profile. **Pass `userId` into the query.** The portal scoping
bug on 26 Aug came from a screen that omitted it, and this is exactly that shape of screen.

## 5. One data problem to surface, not to fix

**Puppy 9 (Yellow) has two different people on it** — owner contact is **Shanel Halgreen**, buyer
contact is **Elrid Gerber**. Every other pup in the litter has the same person in both fields.

Do not guess which is right and do not change it. Surface it: where owner and buyer differ, show both
on the profile with a quiet note that they differ, so Matt can correct it himself. Getting this wrong
means one client seeing another client's puppy records.

## Rules
- Pass `userId` into every scoped query.
- One query per list. Do not fetch per row — that is what made sign-in slow.
- TypeScript strict, no `any`, no file over 300 lines. App lists stay `FlatList`.
- Do not weaken any permission check to make something work.
- `ls` every file you create and paste the output.

## Verify — paste output, not descriptions

Use real records. **Do not create test dogs, litters or clients** — Cursor has previously left
`VERIFY` rows on a real client's ledger on this project.

- [ ] Paste the actual error from the dog page before you fix it, and the `error_events` row it now
      writes. "It works now" without the cause is not acceptable.
- [ ] Screenshot COOPER's profile loading.
- [ ] Screenshot the Litter filter set to Claire × Santini — must show exactly **10** dogs.
- [ ] Screenshot **Puppy 3 (Gold)** — elite tier, R55 000, owner linked, 10 weights charted.
- [ ] Screenshot **Puppy 10** — deceased, no weights — showing an empty state, not a crash.
- [ ] Screenshot **Puppy 9 (Yellow)** showing both Shanel Halgreen and Elrid Gerber flagged.
- [ ] Sign in to the portal as a real buyer and screenshot their puppy's growth chart. Confirm they
      see **only** their own dog — say which account you used.
- [ ] `npx tsc --noEmit` clean on the website; on the app, no new errors beyond the known set.
- [ ] `node scripts/check-parity.mjs --strict` — paste the exit code. Must be `0`.
- [ ] `npm run preflight` passes in both repos.

### Prove it reached the remote
- [ ] `git log origin/main -1` matches `HEAD` in **both** repos — paste both hashes.
- [ ] Vercel **Ready** on `diedericksdobermanns-web-v145`.

## Commit
One commit per section. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`,
`scripts/send-portal-invite-emails.mjs`.
