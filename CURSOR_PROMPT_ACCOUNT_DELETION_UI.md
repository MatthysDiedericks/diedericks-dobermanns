# Cursor Prompt — In-App Account Deletion UI (App Store / Play Store compliance)

## Context

Diedericks Dobermanns app. Supabase project `nlmwxodvquwbjinhhbmr`. Brand: `#111008` bg / `#C4A35A` gold / `#F5F0E8` text.

Apple guideline 5.1.1(v) and Google Play both require that any app with account creation lets the user **complete account deletion inside the app**. The current flow (`lib/accountDeletion.ts` + Settings screen) only opens a pre-filled email — Apple explicitly rejects that pattern.

**Backend already deployed (do NOT build):** Edge Function `delete-account` is live. Behavior: caller's JWT identifies the user; staff roles (admin/super_admin/trainer) get a 403 with a clear message; client PII is anonymized on `public.users`; then the auth user is hard-deleted, or (if business-record FKs block the cascade) permanently disabled with a scrambled email + 100-year ban. Returns `{status: 'deleted' | 'anonymized_and_disabled'}` on success or `{error}` with 4xx/5xx.

## Task 1 — `lib/accountDeletion.ts`: replace the mailto flow

Add:
```ts
export async function deleteOwnAccount(): Promise<{ error: string | null }> {
  if (!supabase) return { error: DEMO_ERROR };
  const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) return { error: error.message ?? 'Deletion failed. Please try again.' };
  if (data?.error) return { error: data.error };
  return { error: null };
}
```
Keep `openAccountDeletionRequest` (email) as a secondary "contact us" fallback link, not the primary action.

## Task 2 — Settings screen: real deletion flow

In the Settings screen(s) where "Request account deletion" currently sits (check `app/(tabs)/settings/index.tsx` AND whether the client portal has its own settings/profile screen — the CLIENT-facing one is the one Apple reviews; make sure the flow exists for the client role):

- "Delete Account" row (destructive styling, red tint consistent with existing destructive patterns).
- Tap → confirmation dialog (two-step): explain it is permanent, personal information is erased, and records of purchases/contracts are retained as required by law (link Privacy Policy). Require typing DELETE or a second confirm tap.
- On confirm: call `deleteOwnAccount()`, show loading state, then on success call the existing `signOut()`/`logout()` from the auth store and let the root layout route back to the public area with a brief "Your account has been deleted" message (a param on the login screen like the existing `message` param pattern is fine).
- On error: show the server's error message (staff accounts get a specific message from the function — surface it as-is).

## Task 3 — Website: deletion info page (Google Play requirement)

Google Play requires a **web link** describing account deletion. In `diedericksdobermann-web`, add a simple `/account-deletion` page (matching site styling): explains accounts are deleted in-app via Settings → Delete Account, or by emailing the kennel; states what is erased vs retained. Add the URL to the Play Data Safety form later (manual step).

## Critical warnings

- Do not change RLS or the Edge Function — backend is done and deployed.
- Do not let admin/trainer accounts reach the confirm dialog if role is known client-side (hide the row), but rely on the server's 403 as the real guard.
- No file over 300 lines. `npx tsc --noEmit` must pass.

## Testing checklist

- [ ] Client account: delete flow completes, user is signed out, cannot log back in
- [ ] Admin account: "Delete Account" row hidden; direct function call returns the staff error
- [ ] Cancel path leaves the account untouched
- [ ] Website `/account-deletion` page renders
