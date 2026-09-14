# CURSOR PROMPT — Clients who confirm their email are told "no invite has been issued"

**Repo:** `diedericksdobermann-web` + mirror into `diedericks-dobermanns` (standing parity rule).
**Supabase:** `nlmwxodvquwbjinhhbmr`.

## The bug, verified on live data

Two real clients in the last five days confirmed their email successfully and were then refused
entry to the portal:

| Client | auth email_confirmed_at | last_sign_in_at | portal_invites row |
|---|---|---|---|
| Jacoline Pretorius, jpretorius.law@gmail.com | 2026-09-04 | **null** | **none** |
| Wanda Von Mollendorff, wandavonmollendorff@icloud.com | 2026-09-08 | **null** | **none** |

Matching `error_events` on `/portal/auth/confirm`, same timestamps, same domains:
`INVITE_NONE_ISSUED` — "No portal invite has been issued for this email",
`detail: {"link":"invite","reason":"no-invite"}` — 2026-09-04 11:33 (gmail, twice) and
2026-09-08 18:35 (icloud).

So the auth token was valid — Supabase consumed it and stamped `email_confirmed_at` — but
`src/app/portal/auth/confirm/outcome.ts` then called `diagnoseInviteEmail`, the
`portal_invite_diagnose` RPC found no `portal_invites` row, `reasonFromDiagnose` returned
`"no-invite"`, and the user was redirected to `/portal/invite-expired?reason=no-invite` **without
a session**. `last_sign_in_at` is still null for both: they never got in, and the page told them
it was their invite that was at fault.

`portal_invites` holds only six rows in total, and neither of these clients is among them. So a
valid Supabase auth link is reaching clients through a path that does not write a
`portal_invites` row — the self-registration flow added in `9c627a6` ("claim dogs when a buyer
registers") is the obvious candidate.

## Fix

**A confirmed auth token is proof of identity. The invite table is bookkeeping, not the gate.**

In the confirm flow: if the token verified and a session is available, **sign the user in**. Only
consult `portal_invites` when the token itself failed. A missing invite row must never turn a
successful verification into a refusal.

Then close the hole that produced it: whichever path creates these auth users must write a
`portal_invites` row (or the equivalent) at the moment it sends the email, so the admin
"Clients who cannot get in" panel reflects reality. Find it — check the registration route and
anything calling `inviteUserByEmail` or `signUp` — and make invite issuance and email sending one
operation, not two that can diverge.

Keep `INVITE_NONE_ISSUED` as a log code, but it should now be rare and genuinely mean "someone
reached confirm with no valid token and no invite".

## Also fix the wording

`/portal/invite-expired?reason=no-invite` currently tells a client their invite was never issued,
which is both wrong and unhelpable — there is nothing they can do with it. Whatever the reason,
give them one action: a "Send me a new link" button that triggers a fresh invite to the address
they arrived with, and a line telling them we have been notified.

## Recover the two locked-out clients

Do not paper over it in the database. Once the fix is deployed, re-issue an invite to both
addresses through the normal admin flow and confirm each can sign in. Do not email them from this
work — Matt sends client communication himself.

## Verify — in a browser, as a real client

- [ ] A brand-new client who registers themselves receives a link, clicks it, and lands **signed
      in** on the portal — not on invite-expired.
- [ ] That client now has a `portal_invites` row and drops off the "Clients who cannot get in"
      panel.
- [ ] An admin-issued invite still works exactly as it does today.
- [ ] A genuinely expired or reused link still shows the correct message, and now offers
      "Send me a new link".
- [ ] Jacoline and Wanda can both sign in after being re-invited.
- [ ] `npx tsc --noEmit` exits 0; `npx next build` succeeds.

## Commit and push

Commit **both** repos and push both. Confirm `git rev-list --left-right --count origin/main...HEAD`
reads `0 0` in each.
