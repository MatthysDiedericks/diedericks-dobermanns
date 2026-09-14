# CURSOR PROMPT — Make the "received my puppy" loop work, and stop it being abusable

**Repo:** `diedericksdobermann-web` + mirror into `diedericks-dobermanns` (standing parity rule).
**Supabase:** `nlmwxodvquwbjinhhbmr`. Next migration number: **0166** (0165 is taken and already
applied to the live database by hand — leave that file alone, do not re-run it).

Follow-up to commit `d78ab65`, which is **still unpushed**. The waiting-list narrowing in it is
correct and stays. Three things to fix, then commit and push both repos.

---

## 1. [BLOCKER] The client button can never appear

`src/lib/fulfilment/clientConfirm.ts` shows it only when `dogs.handover_status` is `'ready'` or
`'scheduled'`. **Nothing in the product ever sets those two values.** The only writes are:

- `src/app/admin/(panel)/quotes/fulfilment-actions.ts:177` → `'awaiting_go_home'`
- `src/app/admin/(panel)/waitlist/actions.ts:215` → `'awaiting_go_home'`
- `src/components/admin/FulfilmentBoard.tsx:51` → `'delivered'`

A dog goes `awaiting_go_home → delivered` and never passes through the window the button needs. On
the live database `handover_status` is `null` on all 173 dogs. The feature is dead code.

**Fix — give Matt the two missing states.** Do *not* loosen the client gate to "any allocated dog";
a client should only be able to flag arrival once Matt has said the dog is on its way.

On `/admin/fulfilment`, "Allocated, not delivered" tab
(`src/components/admin/FulfilmentAllocatedTable.tsx`), add two actions beside the existing
"Mark delivered", both calling the existing `updateDogHandover()` from
`src/app/admin/(panel)/fulfilment/actions.ts` — **do not write a new action**:

- **"Ready"** → `handover_status: 'ready'` — ready to go, no date agreed yet.
- **"Scheduled"** → `handover_status: 'scheduled'` with a date input bound to `handover_date`.

Show the current state as a label per row (`Awaiting go-home` / `Ready` / `Scheduled — 14 Oct`).
"Mark delivered" stays exactly as it is and must remain reachable from all three states. Do not
touch the `delivered` branch's logic — the buyer-name guard, the `delivered_at` stamp and the
`waiting_list → handover_complete` move all stay untouched.

## 2. [HIGH] Anyone on the internet can page Matt

`error_events` has one INSERT policy, `error_events_insert_anon`, granted to **`anon` and
`authenticated`** with `WITH CHECK (true)`. Any visitor holding the public anon key can insert an
arbitrary row. The `error_events_maybe_alert` trigger fires a push for a fixed list of codes with
**no flood guard on any of them except `SECURITY_RATE_LIMIT`** — and `d78ab65` added
`DELIVERY_CONFIRMED_BY_CLIENT` to that list, so it inherits the same hole.

Nobody has abused this (135 events total, all legitimate), and client-side logging genuinely needs
an open insert — so do **not** remove the policy and do not add a `WITH CHECK` that blocks anon
logging.

Instead, in migration `0166`, add a flood guard inside `error_events_maybe_alert()` covering every
alerting code, not just rate-limit:

- Before setting `v_fire := true`, count rows with the same `code` in the last hour.
- If that count is above a small threshold (10 is sensible), skip the `net.http_post` and return.
- Keep the row insert itself unaffected — the dashboard should still record everything; only the
  push is suppressed.

**Trap — do not touch EXECUTE grants.** Do not `revoke execute` on `is_admin()` or any function
named in an RLS policy body while doing this. That has already caused a 6.7-hour outage here.

Copy `0165`'s body forward as the base; do not drop the codes it added.

## 3. [MEDIUM] A client can send the same confirmation over and over

`ReceivedPuppyCard` remembers "done" in `localStorage` only. That is per-browser: it clears on a
new device, a new browser, or private mode, and it is trivially bypassed. There is no server-side
dedupe, so each tap writes another `error_events` row and fires another push, and the "Client
confirmed" badge query (`resolved_at is null`) will match all of them.

In `confirmPuppyReceived` (`src/app/portal/(panel)/dogs/received-actions.ts`), before logging,
query `error_events` for an existing unresolved `DELIVERY_CONFIRMED_BY_CLIENT` row with
`entity_id = dogId`. If one exists, return success without logging again. The client-side
`localStorage` flag can stay as a fast path, but the server must be the one that decides.

Note that `error_events`'s SELECT policy is `is_admin()`, so a client's request-scoped read returns
nothing. Do the dedupe check with a `security definer` RPC that returns only a boolean for the
given dog id — **not** by reaching for `createAdminClient()` in a portal route.

## 4. Clean the tree before committing

`git ls-files --others --exclude-standard src/ supabase/` is not empty:
`src/lib/dogs/identifiers.ts`, `supabase/migrations/0162_dog_identifiers.sql`,
`supabase/migrations/0163_lock_dog_identifier_columns.sql`. Committed files already import
`identifiers.ts`, and `npx tsc --noEmit` reports **28 errors**, all in that identifier work
(`loadPack.ts`, `loadCertificate.ts`, `portal/dogs.ts`, `admin/dogs/*`) — none in `d78ab65`.
Finish and commit that work, or revert it. Do not commit on top of a red tree.

## Verify — rendered evidence, as the real user

SQL checks are not acceptable evidence for anything on this list.

- [ ] Signed in as admin: a dog on "Allocated, not delivered" can be set Ready, and Scheduled with
      a date; the row label updates.
- [ ] **Signed in as that dog's actual client** (not as admin, not in portal preview): the
      "I've received my puppy" card renders on the dog's page. Tapping it shows the thanks state.
- [ ] Tapping it a **second time**, in a different browser or after clearing site data, does not
      create a second `error_events` row and does not send a second push.
- [ ] `dogs.handover_status` is unchanged after the client taps — confirm on the dog record.
- [ ] The "Client confirmed" badge appears exactly once on that row in Fulfilment.
- [ ] "Mark delivered" still works from `awaiting_go_home`, `ready` and `scheduled`; still stamps
      `delivered_at`; the client still drops off `/admin/waitlist` and lands in Delivered.
- [ ] `/admin/waitlist` with no filter still shows only the paid queue — 9 rows today, down from 18.
- [ ] `/admin/waitlist/follow-ups` still reaches pre-deposit prospects.
- [ ] `npx tsc --noEmit` exits 0; `npx next build` succeeds.

## Commit and push

Commit **both** repos and `git push` both, then confirm `git rev-list --left-right --count
origin/main...HEAD` reads `0 0` in each. `d78ab65` has never reached GitHub, and the app-repo
mirror of it was never committed at all — `components/portal/ReceivedPuppyCard.tsx`,
`lib/fulfilment/clientConfirm.ts` and `lib/dogs/identifiers.ts` are sitting untracked there, with
`app/(admin)/fulfilment.tsx`, `app/(admin)/waitlist/index.tsx`, `lib/errors/codes.ts` and
`lib/waitlist/constants.ts` modified and uncommitted. Confirm the deployment goes green on the new
commit before calling this done.
