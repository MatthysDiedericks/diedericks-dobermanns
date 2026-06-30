# CURSOR PROMPT — Authentication & Dog Photo Gallery

## Context

**Project:** Diedericks Dobermanns — React Native Expo app  
**Stack:** Expo SDK 56 · Expo Router · TypeScript strict · NativeWind · Supabase  
**Supabase project:** `nlmwxodvquwbjinhhbmr`  
**Brand:** Background `#111008` · Surface `#1C1A0E` · Gold `#C4A35A` · Text `#F5F0E8` · Headings: Cinzel · Body: Lato

### What already exists
- `AuthGuard` component at `components/auth/AuthGuard.tsx` — wraps protected routes
- `useAuthStore` (Zustand) at `stores/authStore.ts` — holds `user`, `profile`, `role`
- `lib/supabase.ts` — Supabase client singleton
- `lib/auth/routes.ts` — `isAdminPlus()`, `isTrainerOrAbove()` helpers
- Route groups: `(public)` (no auth), `(tabs)` (trainer+), `(admin)` (admin+), `(portal)` (client)
- `app/(public)/` folder exists but login screen is MISSING
- `database.types.ts` — generated Supabase types
- `dog_media` table with columns: `id, dog_id, url, thumbnail_url, type, is_primary, sort_order, caption, uploaded_at`
- Supabase Storage bucket `dog-media` (public) — path pattern: `dogs/{dog_id}/{filename}.jpg`
- Brand fonts configured via `useFonts` in root layout

### What does NOT exist yet (build these)
- Login screen
- Forgot password screen
- Dog photo gallery (admin manage + public view)
- Admin photo upload UI

---

## TASK 1 — Authentication Screens

### Files to create

```
app/(public)/login.tsx
app/(public)/forgot-password.tsx
app/(public)/reset-password.tsx
hooks/useAuth.ts               ← auth actions hook
components/auth/LoginForm.tsx  ← reusable form component
```

### Login screen (`app/(public)/login.tsx`)

Build a premium login screen:

- **Logo** at top — use `assets/images/logo.png` (or a gold text fallback "DIEDERICKS DOBERMANNS" in Cinzel if logo missing)
- **Email field** + **Password field** with show/hide toggle
- **"Sign In" button** — gold, shows loading spinner while submitting, disabled during request
- **"Forgot password?"** link below the button → navigates to `/forgot-password`
- **Error banner** — shows auth error message in amber if login fails (wrong credentials, not verified, etc.)
- Dark luxury aesthetic — background `#111008`, inputs with `#1C1A0E` fill, gold border on focus

**After successful login:**
- Read `profile.role` from `useAuthStore`
- Redirect logic:
  - `super_admin` | `admin` | `management` → `/(admin)/dashboard`
  - `trainer` → `/(tabs)/dashboard`
  - `client` → `/(portal)/home`
  - Anything else → `/(public)/login` with error "Access not permitted"

**Validation (client-side):**
- Email: required, valid email format
- Password: required, minimum 6 characters
- Show inline field errors, not just toast

### Forgot password screen (`app/(public)/forgot-password.tsx`)

- Single email input
- "Send Reset Link" button
- On submit: call `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'diedericksdobermanns://reset-password' })`
- Show success state: "Check your email — a reset link has been sent"
- Back button to login

### Reset password screen (`app/(public)/reset-password.tsx`)

- Handles the deep-link callback from Supabase after email reset
- New password + confirm password fields
- Calls `supabase.auth.updateUser({ password: newPassword })`
- On success → redirect to login with "Password updated successfully" toast

### Auth hook (`hooks/useAuth.ts`)

```typescript
// Exposes:
// signIn(email, password) → Promise<void> (throws on error)
// signOut() → Promise<void>
// sendPasswordReset(email) → Promise<void>
// updatePassword(newPassword) → Promise<void>
// isLoading: boolean
```

All actions update `useAuthStore` appropriately. On `signIn`, fetch the user profile from `public.profiles` (or `public.users`) table after auth succeeds to populate `profile.role`.

### Root layout auth initialisation

In `app/_layout.tsx`, ensure:
1. `supabase.auth.onAuthStateChange` is subscribed on mount
2. On `SIGNED_IN` → load profile → update store → redirect to role-appropriate home
3. On `SIGNED_OUT` → clear store → redirect to `/(public)/login`
4. Show a full-screen gold loading indicator while the initial session is resolving (prevents flash of wrong screen)

### Navigation guard

The `(public)` group must be accessible without auth. Ensure `app/(public)/_layout.tsx` exists with NO `AuthGuard` wrapper — just a plain Stack layout. Logged-in users hitting `/login` should be redirected to their home automatically.

---

## TASK 2 — Dog Photo Gallery (Admin)

### Files to create

```
app/(admin)/dogs/[id]/photos.tsx          ← photo management screen
hooks/useDogMedia.ts                      ← CRUD for dog_media
components/Dogs/PhotoGrid.tsx             ← reusable grid
components/Dogs/PhotoUploadSheet.tsx      ← bottom sheet for upload
components/Dogs/PhotoCard.tsx             ← single photo card with actions
```

### Photo management screen (`app/(admin)/dogs/[id]/photos.tsx`)

Accessible from the dog detail screen. Admin only.

**Layout:**
- Header: dog name + "Photos" subtitle + photo count badge
- "Add Photos" FAB (floating action button) in gold — opens `PhotoUploadSheet`
- `PhotoGrid` showing all photos — drag to reorder sort order
- Long-press on any photo for options: **Set as Primary** | **Edit Caption** | **Delete**
- Primary photo shows a gold star badge
- Pull-to-refresh

**Add to the existing dog detail screen** (`app/(admin)/dogs/[id]/edit.tsx` or equivalent):
- Add a "Manage Photos" row that navigates to `/dogs/{id}/photos`
- Show primary photo thumbnail in the header

### Photo upload sheet (`components/Dogs/PhotoUploadSheet.tsx`)

- `@gorhom/bottom-sheet` — snaps to 60% height
- Two options: **Camera** (expo-image-picker, camera source) | **Photo Library** (expo-image-picker, gallery source)
- After selection:
  1. Compress image client-side using `expo-image-manipulator`: resize to max 1600px wide, JPEG quality 0.88
  2. Generate thumbnail: 480×480 crop, JPEG quality 0.80
  3. Upload main image to `dogs/{dogId}/{uuid}.jpg` in `dog-media` bucket
  4. Upload thumbnail to `dogs/{dogId}/thumbs/{uuid}.jpg`
  5. Insert `dog_media` row with `is_primary = false`, `sort_order = (current max + 1)`
- Show upload progress (0–100%) per photo
- Allow selecting multiple photos at once (up to 10)
- After upload: refresh the grid

### Dog media hook (`hooks/useDogMedia.ts`)

```typescript
// Exposes:
// media: DogMedia[]          (ordered by sort_order)
// loading: boolean
// error: string | null
// uploadPhotos(assets: ImagePickerAsset[]) → Promise<void>
// deletePhoto(mediaId: string) → Promise<void>
// setPrimary(mediaId: string) → Promise<void>  (sets is_primary=true, all others false)
// updateCaption(mediaId: string, caption: string) → Promise<void>
// reorderPhotos(orderedIds: string[]) → Promise<void>
```

**Security:** upload uses the authenticated user's session (anon key is fine — RLS allows authenticated users to insert/update). Never use the service role key in the app.

### Photo grid (`components/Dogs/PhotoGrid.tsx`)

- `FlatList` with `numColumns={3}`, equal square cells
- Each cell: thumbnail image, primary star overlay, sort order number
- Tap → full-screen preview (use `expo-image` with `contentFit="contain"` on a Modal)
- Long-press → action sheet (Set Primary / Edit Caption / Delete)
- Delete: confirm dialog before removing from storage AND database

---

## TASK 3 — Dog Photo Gallery (Public)

### Files to create / update

```
components/Dogs/PublicPhotoGallery.tsx    ← horizontal scroll gallery
app/(public)/dogs/[id].tsx                ← update to include gallery
```

### Public dog detail screen — add photo gallery

Update the existing public dog detail screen (`app/(public)/dogs/[id].tsx`) to include:

1. **Hero image** — full-width, 280px tall, shows the `is_primary = true` photo. Fallback: gold gradient with dog silhouette icon.
2. **Photo strip** below hero — horizontal `FlatList` of thumbnail images, 80×80 squares, tappable
3. Tap any thumbnail → opens full-screen image viewer (Modal with `expo-image`, swipe to dismiss)
4. If only 1 photo, skip the strip

### Client portal dog detail

Do the same update to any dog detail screen in `app/(portal)/` if it exists.

---

## TASK 4 — Register as `(public)` group in root layout

Ensure `app/(public)/_layout.tsx` exists:

```tsx
import { Stack } from 'expo-router';

export default function PublicLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
```

And that `app/index.tsx` (the root redirect) checks auth state and routes to the correct starting screen:

```tsx
// app/index.tsx
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { isAdminPlus } from '@/lib/auth/routes';

export default function Index() {
  const { user, profile } = useAuthStore();
  if (!user) return <Redirect href="/(public)/login" />;
  if (isAdminPlus(profile?.role)) return <Redirect href="/(admin)/dashboard" />;
  if (profile?.role === 'trainer') return <Redirect href="/(tabs)/dashboard" />;
  return <Redirect href="/(portal)/home" />;
}
```

---

## Execution order

1. `hooks/useAuth.ts` — auth actions
2. `app/(public)/_layout.tsx` — public stack
3. `app/(public)/login.tsx` — login screen
4. `app/(public)/forgot-password.tsx`
5. `app/(public)/reset-password.tsx`
6. `app/index.tsx` — root redirect
7. Update `app/_layout.tsx` — auth state listener
8. `hooks/useDogMedia.ts`
9. `components/Dogs/PhotoCard.tsx`
10. `components/Dogs/PhotoGrid.tsx`
11. `components/Dogs/PhotoUploadSheet.tsx`
12. `app/(admin)/dogs/[id]/photos.tsx`
13. `components/Dogs/PublicPhotoGallery.tsx`
14. Update `app/(public)/dogs/[id].tsx` with gallery

---

## Critical rules — DO NOT violate

- `SUPABASE_SERVICE_ROLE_KEY` must NEVER appear in any app file — not in hooks, not in screens, not in constants. The anon key with RLS is correct for the app.
- Never use `async` inside `useEffect` directly — always wrap in an inner `async` function or use `useCallback`.
- Images must be compressed BEFORE upload. Never upload raw camera output.
- The login screen must have a loading state on the button — a double-tap can cause two auth requests.
- Delete photo must be a two-step confirm — accidental deletes are catastrophic.
- `expo-image` (not `Image` from react-native) for all photo display — it handles caching and CDN correctly.

---

## Testing checklist

### Auth
- [ ] Login with valid admin credentials → lands on `/dashboard`
- [ ] Login with wrong password → shows specific error, does not crash
- [ ] Login with unregistered email → shows error
- [ ] "Forgot password" sends email (check inbox)
- [ ] Visiting `/login` while already logged in → redirects to correct home (no infinite loop)
- [ ] Sign out → redirects to login, store is cleared
- [ ] App restart while logged in → restores session, no flash of login screen

### Photos (Admin)
- [ ] Upload 3 photos → all appear in grid, correct order
- [ ] Set primary → star moves, `is_primary` correct in DB
- [ ] Delete photo → removed from grid AND from Supabase Storage
- [ ] Upload 10 photos at once → all succeed (no timeout)
- [ ] Reorder → sort_order updated in DB, grid reflects new order after refresh

### Photos (Public)
- [ ] Dog with no photos → hero shows gold fallback, no strip shown
- [ ] Dog with 1 photo → hero shows photo, no strip
- [ ] Dog with 5 photos → hero + horizontal strip, all tappable
- [ ] Full-screen viewer → swipe to close works on iOS and Android

---

## What NOT to build here
- Push notifications
- Contract generation
- Finance screens
- Training module
- These are separate prompts
