# Cursor Prompt — Remove the known-phone lookup. Keep everything else.

## Read this first

The portal signup phone work is **good and it stays** — the diagnosis was right, the fix is elegant, and I verified it against the live database:

- `users.phone` was empty for Karien Knoetze, Alyssa Buxmann and Andrew Murray. That is exactly why their contacts came out blank.
- `persistSignupPhone.ts` writing to `users.phone` is the correct fix, because `sync_user_to_contacts` copies it across with `phone = coalesce(phone, NEW.phone)`.
- I confirmed the trigger fires on **INSERT and UPDATE**, so writing the phone after the user row exists does re-fire it and backfill the contact. Had it been INSERT-only this approach would have failed silently. It works.
- The no-duplicate-contact claim is also correct — the trigger links by email and has `on conflict (user_id) do update`.

**One piece has to come out.**

---

## The problem

`src/app/api/signup/known-phone/route.ts` is a **public, unauthenticated endpoint that returns a real phone number for any email address posted to it.** It uses `createAdminClient()`, so the service role is in play and row-level security does not apply.

Anyone can POST `jomaribred@gmail.com` and receive `+27764314812`.

Two separate harms:

1. **Personal data disclosed to an unauthenticated stranger.** POPIA applies, and these are real clients.
2. **It is an account-existence oracle.** A number means that email is a client; `null` means it is not. The comment in the file says *"Never confirms the email"* — returning a number does exactly that.

The 30-per-hour rate limit slows harvesting. It does not prevent it, and it is keyed on the request, so rotating addresses defeats it.

**This was my instruction's fault, not yours.** The prompt said "look before you ask" without specifying how to do it safely, and you built exactly what was asked.

---

## Why removing it costs nothing

The lookup only saved the user from retyping a number. **The data protection it appeared to provide already exists in the trigger:**

```sql
phone = coalesce(phone, NEW.phone)
```

A contact that already holds a phone **keeps it**, whatever is typed at signup. The number cannot be overwritten. Nothing is lost by deleting the lookup.

---

## What to remove

- `src/app/api/signup/known-phone/route.ts` — delete the file and the route.
- `src/lib/auth/lookupKnownSignupPhone.ts` — delete, unless something other than this route imports it. Check first and say what you found.
- In `src/app/portal/register/RegisterForm.tsx`: remove `fetchKnownSignupPhone`, `applyKnownPhone`, the `phoneLocked` state, the effect that calls it on email prefill, and the read-only treatment of the phone field.
- Any test that covers the lookup.
- The same on the app side if an equivalent was built there.

**The phone field stays required, stays validated by the shared `phoneField`, and becomes a normal editable input again.**

## What to keep, untouched

- `src/lib/phone.ts` and its tests — the shared validator.
- `src/lib/auth/persistSignupPhone.ts` — this is the actual fix.
- The phone field on the signup form, required, with the inline error above the button.
- Every other caller of the shared validator.
- The guard script, if one was added.

## Do not

- Do not add a replacement lookup behind a different URL.
- Do not "fix" it with a masked number, a hash, or a yes/no flag. A yes/no is still an account oracle.
- Do not change the trigger, `sync_user_to_contacts`. It is correct.
- Do not add a migration.
- Do not modify any contact or user record.

---

## If you want the convenience back later

The safe version is to pre-fill **after** the user has clicked the email confirmation link — at that point they have proven the address is theirs, and the request is authenticated. That is a separate job. **Do not build it in this prompt.**

---

## Report

1. Every file deleted, and confirmation nothing else imported them.
2. Grep for `known-phone` and `lookupKnownSignupPhone` across both repos — expect **zero** matches outside this prompt file.
3. Screenshot of portal signup: phone field present, required, editable, with the error shown for `123`.
4. Confirmation that `persistSignupPhone.ts` is still called on successful signup — paste the line.
5. `npx tsc --noEmit` clean in both repos.
6. Tests passing, with the lookup tests removed rather than skipped.

**Then prove the protection still holds without the lookup.** Against a preview or local environment: create a contact with a phone, sign up with that email using a *different* number, and show the original number survives — that is `coalesce` doing its job. **Do not run this against production.**
