# Build failures — 31 Aug 2026, and what to fix tomorrow

## Correction to what I said earlier

I told you the red builds were all the duplicate Vercel project. **That was wrong.** Looking at the
avatars properly: `da81cb8` failed on **all three** projects, and `fe1eea2` failed on **all four**.
Those were genuine build failures, not noise. The duplicate-project theory only fitted `8d4d432`
and `8d58903`, where one project failed and the others went Ready.

## What actually failed, and why

Every failure was the **same one line** in `src/app/portal/(panel)/page.tsx` — the `userId` prop on
`<CommittedLitterPanel>`. Cursor went back and forth on it:

| Time | Commit | What it did | Result |
|---|---|---|---|
| 50m | `fe1eea2` | Guest access. Passed `userId` to a component that did not accept it | **Error — all 4** |
| 43m | `8d58903` | "Fixed" the build by **deleting** `userId={userId}` | Ready (3 of 4) |
| 31m | `da81cb8` | Pedigree certificate | **Error — all 3** |
| 6m | `239c53d` | Put `userId={userId}` **back** | Ready — this is live |

`239c53d` is the exact inverse of `8d58903`. Cursor removed the prop, then restored it.

### The part that matters

The middle commit fixed a red build by **removing a security scoping parameter**. `userId` is what
keeps the portal litter pedigree query scoped to the signed-in client — that is literally what
`239c53d`'s message says: *"so the query stays scoped."* For roughly seventeen minutes the live
site ran without it.

That is the pattern to watch: when a build fails on a prop, deleting the prop makes the red go
away and can quietly remove a control. The correct fix was to widen the component's signature,
which is what eventually happened.

**Nothing needs fixing from this chain.** HEAD is `239c53d`, it is Ready, and the live domain
serves it.

---

## What WILL fail tomorrow

I ran `tsc --noEmit` on the working tree. Two errors. Both come from **uncommitted work in
progress**, so they did not cause the Vercel failures above — but they will block the next commit.

### 1. Waitlist payment gate — stubbed function breaks its caller

`src/lib/waitlist/syncFromApplication.ts` is modified but not committed. The function has been
gutted:

```ts
// working copy — a no-op
export async function ensureWaitlistOnApplicationSubmitted(
  _supabase: SupabaseClient,
  _app: Pick<AppRow, "id">,
): Promise<{ error?: string; waitlistId?: string }> {
  return {};
}
```

At HEAD it takes a full `AppRow` and actually creates the waitlist entry. Removing auto-creation on
submit is **correct** — that is the payment gate doing its job. But the parameter type was narrowed
to `Pick<AppRow, "id">` while the caller in `src/lib/applications/followUps.ts:51` still passes
`user_id`, `full_name`, `email` and the rest.

```
src/lib/applications/followUps.ts(51,7): error TS2353:
  'user_id' does not exist in type 'Pick<AppRow, "id">'
```

**Fix:** either keep the parameter as `AppRow` and ignore the extra fields, or trim the caller to
pass only `{ id }`. The second is cleaner but check nothing else reads those fields.

**Also confirm the gate is not just a stub.** A function that returns `{}` blocks waitlist creation
by doing nothing, which passes a "no entry was created" test while enforcing nothing. The prompt
required a database-level trigger so a second admin screen or a script hits the same wall. New
files `paymentGate.ts` and `paymentGate.test.ts` exist — check the trigger landed too.

### 2. Breeding plan tracker — server action returns the wrong shape

```
src/app/admin/(panel)/breeding/plans/new/page.tsx(13,13): error TS2322:
  '(formData: FormData) => Promise<{ error: string; }>' is not assignable to
  '(formData: FormData) => void | Promise<void>'
```

A form `action` prop must return `void` or `Promise<void>`. The action returns `{ error: string }`.

**Fix:** use `useActionState` / `useFormState` so the error surfaces in state, or have the action
`redirect()` on failure. Do not silence it by returning `void` and dropping the error — the user
needs to see why the save failed.

This directory is untracked, so the breeding tracker is mid-build from tonight's prompt.

---

## Tomorrow, in order

1. Fix the two type errors above.
2. `npx tsc --noEmit` clean **before** committing — both errors are the kind that only surface at
   build time on Vercel, four minutes after you push.
3. Confirm the waitlist payment gate has its database trigger, not just the stubbed function.
4. Then commit and push, and check `239c53d` is superseded on
   `diedericksdobermanns-web-v145` — the project bound to the live domain.

## Standing rule this earned

When a build fails on a missing or extra prop, fix the **component signature**, never delete the
prop. Deleting it turns red green and can remove a scoping control with no test failing.
