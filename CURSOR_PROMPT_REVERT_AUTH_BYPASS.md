# Cursor Prompt — Revert Auth Bypass / Quick Login Shortcut

## Context
During development a temporary bypass was added so the app could be tested without entering login credentials each time. That shortcut must now be removed — the app must require proper email + password for all users.

The Supabase backend is live (credentials in `.env` are correct). This is not a demo mode issue.

---

## TASK — Find and remove ALL auth bypasses

Search every file in the project for any of the following patterns and remove them:

### 1. Hardcoded credentials or quick-fill buttons
Look in:
- `app/(public)/login.tsx`
- `components/auth/LoginForm.tsx`
- `components/auth/LoginLogo.tsx`

Remove any:
- Pre-filled `email` or `password` state values
- "Quick Login", "Dev Login", "Skip", "Bypass", "Test User" buttons
- `onPress` handlers that call `signIn()` with hardcoded email/password strings
- `useEffect` hooks that auto-submit the login form
- Hardcoded credential strings anywhere in login-related files

### 2. AuthGuard bypasses
Look in: `components/auth/AuthGuard.tsx`

The ONLY bypass allowed is the existing demo mode check:
```tsx
if (Config.isDemoMode) return <>{children}</>;
```

Remove any additional conditions such as:
- `if (Config.isDemoMode || someBypassFlag) return <>{children}</>`
- Extra boolean flags that short-circuit the auth check
- Any `__DEV__` or environment-based bypass other than `isDemoMode`

### 3. Config flag overrides
Look in: `constants/config.ts`

The `isDemoMode` getter must remain exactly:
```ts
get isDemoMode(): boolean {
  return !this.supabase.url || !this.supabase.anonKey;
}
```

Remove any:
- Hardcoded `isDemoMode: true`
- `BYPASS_AUTH` or similar flags
- Overrides that force demo mode regardless of env vars

### 4. Auth store mock sessions
Look in: `stores/authStore.ts`

Remove any:
- Pre-seeded mock session objects
- `initialize()` overrides that inject a fake session
- Hardcoded `profile` objects that simulate a logged-in user

### 5. Navigation sync bypasses
Look in: `components/auth/AuthNavigationSync.tsx`

Remove any conditions that skip redirecting unauthenticated users to login.

---

## WHAT MUST REMAIN (DO NOT CHANGE)

- `if (Config.isDemoMode) return <>{children}</>` in AuthGuard — this is intentional for offline UI review when `.env` is empty
- `forgot-password` and `reset-password` are excluded from auth redirect in `AuthNavigationSync` — this is correct
- The `ALLOWED_ROLES` check in `login.tsx` that rejects accounts with no valid role
- All Supabase credentials in `.env` — do not touch

---

## EXPECTED RESULT

After this change:
1. Opening the app on web or mobile always shows the login screen if no session exists
2. Entering a wrong email or password shows an error — no way around it
3. Each role (client, admin, management, trainer) must log in with their own Supabase account
4. No shortcuts, no test buttons, no pre-filled fields on the login screen

---

## VERIFICATION

After changes:
- [ ] Clear app storage / sign out
- [ ] Navigate to `/(portal)/dashboard` — should redirect to login
- [ ] Navigate to `/(admin)/dashboard` — should redirect to login
- [ ] Login screen shows empty email and password fields
- [ ] Entering wrong password shows "Sign in failed" error
- [ ] Correct credentials for a `client` role → redirects to `/(portal)/dashboard`
- [ ] Correct credentials for `admin` role → redirects to `/(admin)/dashboard`
- [ ] `npx tsc --noEmit` passes — no TypeScript errors
