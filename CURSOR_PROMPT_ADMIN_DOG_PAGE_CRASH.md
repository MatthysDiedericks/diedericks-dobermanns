# CURSOR PROMPT — /admin/dogs/[id] crashes on every dog: a function crosses the RSC boundary

**Repo:** `diedericksdobermann-web` + mirror into `diedericks-dobermanns` (standing parity rule).
**Supabase:** `nlmwxodvquwbjinhhbmr`. Deployed HEAD is `2901b9f`, in sync with `origin/main`.
No migration needed — this is a code bug only.

## The bug, confirmed on production

`src/components/pedigree/AdminDogPedigreeSection.tsx` is a **server** component. At HEAD it passes:

```tsx
downloadHref={
  cert ? (depth) => `/api/pedigree/${dogId}/pdf?gens=${depth}` : undefined
}
```

That prop travels through `InheritedPedigreeSection` (also a server component, prop typed
`downloadHref?: (depth: number) => string`) into `PedigreeCertificate`, which is **`"use client"`**
and calls `downloadHref(depth)` at line 73.

**A plain function cannot be serialised from a Server Component to a Client Component.** React
throws while streaming, and the whole route's error boundary renders "Something went wrong".

### Evidence, not inference

Fetching the route's RSC payload on production returns the pedigree rendered correctly, with an
Error object standing in for that one prop:

```
"coiDepth":4,"downloadHref":"$63","allowAncestorUpload":true
...
63:E{"digest":"1597386086"}
```

and the browser console shows `Minified React error #441` — "An error occurred in the Server
Components render." Verified on two unrelated dogs:
`94fb5036-b7ff-4ed0-95c9-3fa8719c2d73` (Zues) and `f4fb4826-cb2a-4294-9f42-ce4b6ff20348` (Bruce).

`cert` is truthy for every dog with pedigree rows, which is all of them — hence every dog fails.
`/admin/dogs` (the list) and the public `/dogs/[slug]` are unaffected: `DogProfileReader` line 100
already passes a **string** (`downloadHrefBase`), which is why the public page renders fine.

## The fix

Pass a string, build the URL on the client.

1. `src/components/pedigree/PedigreeCertificate.tsx` — replace the prop
   `downloadHref?: (depth: number) => string` with `downloadHrefBase?: string`, and at line 73 use
   ``href={`${downloadHrefBase}?gens=${depth}`}``. Guard on `downloadHrefBase` instead of
   `downloadHref`.
2. `src/components/pedigree/InheritedPedigreeSection.tsx` — change its prop the same way and pass
   it straight through.
3. `src/components/pedigree/AdminDogPedigreeSection.tsx` — pass
   ``downloadHrefBase={cert ? `/api/pedigree/${dogId}/pdf` : undefined}``.

Then **check every other call site** of `PedigreeCertificate` and `InheritedPedigreeSection` and
make them consistent — `src/components/dogs/profile/DogProfileReader.tsx:100`,
`src/app/admin/(panel)/dogs/[id]/pedigree/print/page.tsx:46` and
`src/app/portal/(panel)/dogs/[id]/pedigree/print/page.tsx:48` already pass a string base, so this
change should make the whole family agree rather than leaving two spellings in the codebase.

Note: the working tree already has a partial version of this fix in
`AdminDogPedigreeSection.tsx` and `loadCertificate.ts`, uncommitted. Reconcile with it; do not
duplicate it.

## Two things to fix while you are here

**The error boundary lies.** It says "We have logged this automatically", but no `error_events`
row is written — the table has nothing across four confirmed crashes. Make the boundary actually
log, with the digest, so the next 500 is not invisible.

**One rejected panel kills the page.** `src/app/admin/(panel)/dogs/[id]/page.tsx` awaits ~15
helpers in two `Promise.all` blocks. Move the non-essential ones to `Promise.allSettled`: the dog
record, its media and its owner are essential; timeline, ancestors, siblings, progeny, litter
history, health reminders and weight logs are not — a rejection there should render that panel as
"Could not load" and leave the rest of the page working. `AdminDogPedigreeSection` already has its
own try/catch and still took the page down, because the failure happens during serialisation
*after* the component returns — so the fan-out guard matters independently of the fix above.

## Clean the tree before committing

`git ls-files --others --exclude-standard src/ supabase/` is not empty:
`src/lib/dogs/identifiers.ts`, `src/lib/apply/buyerLocation.ts`,
`supabase/migrations/0162_dog_identifiers.sql`, `0163_lock_dog_identifier_columns.sql`,
`0167_buyer_location.sql`. `npx tsc --noEmit` reports 28 errors, all in the dog-identifiers work
(`loadPack.ts`, `loadCertificate.ts`, `loadPedigreeDocument.ts`, `portal/dogs.ts`,
`admin/dogs/[id]/page.tsx`, `admin/dogs/page.tsx`) — several are
`column 'pedigree' does not exist on 'dogs'`, which is true: that column is not in the live
database. Finish that work or revert it. Do not commit this fix on top of a red tree.

## Do not

- Do not change `updateDogHandover()` or anything in `/admin/fulfilment`.
- Do not touch `dogs` table data. Zues (`94fb5036…`) is deliberately `status='available'`,
  `ownership_status='returned'`, `programme_tier='protection_dog'`.

## Verify — in a browser as a signed-in admin

- [ ] Both dog ids above load their full admin detail page.
- [ ] The pedigree download link on that page still works and still respects the generation depth
      selector (3 vs 4 generations).
- [ ] The admin and portal pedigree print pages, and the public `/dogs/[slug]`, are unchanged.
- [ ] A dog with no pedigree rows loads and shows "Pedigree not yet recorded".
- [ ] Forcing one non-essential helper to throw degrades that panel only.
- [ ] A deliberate crash writes an `error_events` row carrying the digest.
- [ ] `npx tsc --noEmit` exits 0; `npx next build` succeeds.

## Commit and push

Commit **both** repos and push both. Confirm `git rev-list --left-right --count origin/main...HEAD`
reads `0 0` in each, and that the deployment goes green.

---

## One-line wording change, do it in the same commit

`src/components/forms/ApplicationForm/labels.ts:75` reads
`protection_dog: "Fully Trained Personal Protection Dog"`. Change it to
`"Elite Family Protection Dog"`. Matt does not use the phrase "fully trained" — he does not
believe a finished dog exists, and the claim invites a dispute. The `pricing_tiers` row is already
updated in the live database; this is the last place in the code that still says it.
