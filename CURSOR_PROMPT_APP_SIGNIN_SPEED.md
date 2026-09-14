# CURSOR PROMPT — Make signing in fast on the phone app, the same way the website was fixed

The website fix is done, deployed and confirmed faster by Matt. This applies the same change to the
app so the two do not drift apart.

**Repo:** `diedericks-dobermanns` only. The website is already correct — do not touch it.
**Supabase:** `nlmwxodvquwbjinhhbmr`. **No migration. No schema change. No new tables.**

---

## What was actually wrong, measured on the live site

Not guessed — measured from a browser against production on 4 Sep 2026:

| What | Time |
|---|---|
| Login page itself | under 1s — fine |
| One database read | ~290ms |
| **One `supabase.auth.getUser()` call** | **~500ms** |

`getUser()` is a network round trip to the auth server every single time it is called. The website
called it in **22 separate places**, at least three of them one after another on a single sign-in —
sign in, then link records, then load the portal — before any of the user's actual data was fetched.
That was the delay.

A region change was tried first and made no difference. The distance was never the problem; the
repetition was.

## The fix that worked on the website

`src/lib/portal/auth.ts` now holds one cached getter, and every server component and action calls it
instead of `getUser()`:

```ts
export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  return (await supabase.auth.getUser()).data.user;
});
```

React's `cache()` deduplicates within a single server request, so layout, page and nested work share
one network call. Exactly one raw `getUser()` remains in the whole website, inside that wrapper.

`claimMyRecords()` no longer performs its own check either — it now takes the verified user id as an
argument from the caller.

## What to do here

1. Find every `supabase.auth.getUser()` call in this repo and **paste the count** before changing
   anything.

2. Add one shared helper that performs the check once and reuses the result for the rest of that
   screen load.

   **`cache()` is a React server-side tool and this is Expo — it will not apply the same way.** Do
   not force it. If there is no server request boundary to cache against, use the auth state the
   Supabase client already holds in memory and only re-verify when it is missing or stale. **State in
   your report which approach you took and why.** Getting this reasoning right matters more than
   matching the website's file layout.

3. Route every screen and action through that helper instead of calling `getUser()` directly.

4. **Do NOT substitute `getSession()`.** It reads the stored session without verifying it and is not
   safe for authorisation. The fix is calling the verified check *once*, not calling it carelessly.

## Rules

- TypeScript strict, no `any`, no file over 300 lines.
- Do not weaken any permission check to make something faster.
- `ls` every file you create and paste the output — grep has false-negatived on this filesystem.

## Verify — paste output, not descriptions

Use a real existing account. **Do not create test accounts** — Cursor has previously left `VERIFY`
rows on a real client's ledger on this project.

- [ ] Count of `getUser()` calls **before** and **after** — paste both.
- [ ] Paste the new helper in full.
- [ ] Time a sign-in on a real device before and after — paste both numbers in seconds.
- [ ] Confirm no permission check was removed or loosened. Name any file where auth logic changed.
- [ ] `npx tsc --noEmit` — no new errors beyond the known pre-existing set. Paste the count before
      and after.
- [ ] `npm run preflight` passes.
- [ ] `node scripts/check-parity.mjs --strict` — paste the exit code. Must be `0`.

### Prove it reached the remote
- [ ] `git log origin/main -1` matches `HEAD` — paste the hash.

## Commit

App repo only. Repo root is the **parent** folder of `diedericks-dobermanns`.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`,
`scripts/send-portal-invite-emails.mjs`.
