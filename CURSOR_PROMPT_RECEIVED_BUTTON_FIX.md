# CURSOR PROMPT — Fix: the "I've received my puppy" button can never appear

**Repo:** `diedericksdobermann-web` + mirror into `diedericks-dobermanns` (standing parity rule).
**Supabase:** `nlmwxodvquwbjinhhbmr`.

Follow-up to commit `d78ab65`. The waiting-list narrowing in that commit is correct and stays.
The client-confirmation half is dead code. Fix that, and nothing else.

---

## The bug

`src/lib/fulfilment/clientConfirm.ts` shows the button only when
`dogs.handover_status` is `'ready'` or `'scheduled'`.

**Nothing in the product ever sets those two values.** Grep confirms the only writes are:

- `src/app/admin/(panel)/quotes/fulfilment-actions.ts:177` → sets `'awaiting_go_home'` on allocation
- `src/components/admin/FulfilmentBoard.tsx:51` → sets `'delivered'`

So a dog goes `awaiting_go_home → delivered` and never passes through the window the button
needs. On the live database `handover_status` is `null` on all 173 dogs, and no dog has ever held
`'ready'` or `'scheduled'`. No client will ever see the button as it stands.

## Fix — give Matt the two missing states

Do **not** loosen the client gate to "any allocated dog". A client should only be able to flag
arrival once Matt has said the dog is on its way — otherwise the flag means nothing.

On `/admin/fulfilment`, "Allocated, not delivered" tab
(`src/components/admin/FulfilmentAllocatedTable.tsx`), add two small actions next to the existing
"Mark delivered" button, both calling the existing `updateDogHandover()` from
`src/app/admin/(panel)/fulfilment/actions.ts` — **do not write a new action**:

- **"Ready"** → `handover_status: 'ready'` — dog is ready to go, date not agreed yet.
- **"Scheduled"** → `handover_status: 'scheduled'` with a date input bound to `handover_date` —
  collection/delivery is booked for that day.

Show the current status as a label on each row (`Awaiting go-home` / `Ready` / `Scheduled — 14 Oct`)
so Matt can see at a glance where each dog sits. "Mark delivered" stays exactly as it is and
remains available from any of those states.

`updateDogHandover()` already accepts all four values via its `HandoverStatus` type — check it
does not reject a non-`delivered` status before wiring the buttons, and if it does, allow the
other three through **without** touching the `delivered` branch's logic (the buyer-name guard,
the `delivered_at` stamp and the `waiting_list → handover_complete` move must all stay untouched).

## Also clean up before committing

`git ls-files --others --exclude-standard src/` is **not** empty — `src/lib/dogs/identifiers.ts`
is untracked while committed files import it, and `supabase/migrations/0162_dog_identifiers.sql`
and `0163_lock_dog_identifier_columns.sql` are untracked too. `npx tsc --noEmit` currently reports
28 errors, all in that identifier work (`loadPack.ts`, `loadCertificate.ts`, `portal/dogs.ts`,
`admin/dogs/*`), none in `d78ab65`. Finish and commit that work — or revert it — so the tree
typechecks. Do not commit this fix on top of a red tree.

Migration `0165_delivery_confirmed_by_client_alert.sql` has already been applied to the live
database by hand; leave the file in place, do not re-run it.

## Verify

- [ ] A dog on "Allocated, not delivered" can be set to Ready, and to Scheduled with a date.
- [ ] That dog's owner then sees "I've received my puppy" in the portal; tapping it logs
      `DELIVERY_CONFIRMED_BY_CLIENT` and leaves `handover_status` unchanged.
- [ ] The "Client confirmed" badge then shows on that row in Fulfilment.
- [ ] "Mark delivered" still works from `awaiting_go_home`, `ready` and `scheduled`, still stamps
      `delivered_at`, and still moves the waiting-list row to `handover_complete`.
- [ ] `/admin/waitlist` still shows only the paid queue (9 rows today, down from 18).
- [ ] `npx tsc --noEmit` exits 0 and `npx next build` succeeds.

## Commit and push

Commit **both** repos and `git push` both — `d78ab65` is still sitting unpushed on the web repo,
and the app-repo mirror of it was never committed at all.
