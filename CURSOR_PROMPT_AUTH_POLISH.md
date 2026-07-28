# Cursor Prompt — Auth Screen Polish: Back Navigation + App Version Display

## Context
Diedericks Dobermanns app. Brand: `#111008` bg / `#C4A35A` gold / `#F5F0E8` text. Live user testing (2026-07-22) showed users get stuck on auth screens — no way back except small text links.

## Task 1 — Back navigation on all public auth screens
Add a consistent back chevron button (top-left, `Ionicons chevron-back`, gold, `hitSlop` 8+) to:
- `app/(public)/sign-up.tsx`
- `app/(public)/verify-code.tsx`
- `app/(public)/forgot-password.tsx`
- `app/(public)/reset-password.tsx`

Behavior: `router.back()` if `router.canGoBack()`, else `router.replace('/(public)/login')`. Build ONE small reusable component (`components/auth/AuthBackButton.tsx`) — don't copy-paste the block into 4 files. On verify-code.tsx, keep the existing "Wrong email? Back to Sign In" link too.

## Task 2 — App version in Settings
Show `v{Constants.expoConfig?.version}` (from `expo-constants`, already a transitive dep — check package.json, install via `npx expo install expo-constants` only if missing) in small muted text at the bottom of:
- `app/(tabs)/settings/index.tsx` (admin settings)
- the client portal profile/settings screen (find it — likely `app/(portal)/profile.tsx`)

Purpose: instantly distinguish stale builds during device testing.

## Warnings
- Don't touch auth logic — UI only.
- No file over 300 lines. `npx tsc --noEmit` must pass.

## Testing checklist
- [ ] Every auth screen has a working back control on device
- [ ] Back from verify-code doesn't lose the entered email when returning (re-navigation passes the param again — acceptable if it re-prompts, must not crash)
- [ ] Version shows in both settings screens
