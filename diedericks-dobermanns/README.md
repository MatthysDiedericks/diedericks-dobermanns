# Diedericks Dobermanns

Elite Dobermann breeding and professional protection dog training app.
**Born With Purpose. Built With Discipline.**

Built with React Native (Expo SDK 56), TypeScript, Expo Router, NativeWind,
Zustand, React Hook Form + Zod, and Supabase.

## Run locally

**Prerequisites:** Node.js 20+ and npm. For a device, install **Expo Go**
(iOS App Store / Google Play). For a simulator, install Xcode (iOS, macOS only)
or Android Studio.

**1. Install dependencies**

```bash
npm install
```

**2. Configure environment (optional)**

The app runs in **demo mode** out of the box (no backend required) using the
sample data in `lib/mockData.ts`. To connect a real Supabase backend, copy the
example env file and fill in your project values:

```bash
cp .env.example .env      # Windows PowerShell: copy .env.example .env
```

```env
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Both are read in `constants/config.ts`; if either is missing the app
automatically falls back to demo mode.

**3. Start the dev server**

```bash
npx expo start          # or: npm run start
```

Then press **i** (iOS simulator), **a** (Android emulator), or **w** (web), or
scan the QR code with Expo Go on a physical device. Use `npx expo start -c` to
start with a cleared cache if you hit stale-bundle issues.

## Project structure

```
app/                      Expo Router screens
  (public)/               Public area (tab navigation)
  (portal)/               Client portal (auth required)
  (admin)/                Admin panel (admin role required)
  auth/                   Login / register / password reset
components/                Reusable UI, dog, form, layout components
constants/                 Brand colours, fonts, config
hooks/                     Data hooks (useDogs, useContent, useNotifications, ...)
lib/                       Supabase client, auth, storage, notifications, mock data
stores/                    Zustand stores (auth, notifications)
types/                     App + generated database types
supabase/
  migrations/              SQL schema, triggers, RLS, storage buckets, notifications
  functions/               Edge Functions (notify, send-email, send-push, send-whatsapp)
  seed.sql                 Optional seed data
eas.json                   EAS Build / Submit profiles
```

## Backend setup (Supabase)

1. Create a Supabase project.
2. Run the migrations in `supabase/migrations/` in order (0001 → 0005), or use
   the Supabase CLI: `supabase db reset` (also applies `seed.sql`).
3. Storage buckets and RLS policies are created by the migrations.
4. Deploy Edge Functions: `npm run deploy:functions` (deploys `notify`,
   `send-email`, `send-push`, `send-whatsapp`).
5. Set function secrets: `supabase secrets set RESEND_API_KEY=... WHATSAPP_API_KEY=... FROM_EMAIL=...`.
6. Enable automated notifications by pointing the DB dispatch trigger at your
   project (run once in the SQL editor):

   ```sql
   insert into private.app_config (key, value) values
     ('edge_base_url', 'https://<project-ref>.supabase.co'),
     ('service_role_key', '<service-role-key>')
   on conflict (key) do update set value = excluded.value;
   ```

## Notifications

- **Push** — `expo-notifications` registers a token on login (`lib/notifications.ts`),
  stored on `users.expo_push_token`. The portal inbox + unread badge are driven by
  `hooks/useNotifications.ts` against `notifications_log`.
- **Automation** — DB triggers (`0005_notifications.sql`) write inbox rows on key
  events (application status, reservation confirmed, training logged, litter born),
  and the `notify` Edge Function fans out push/email/WhatsApp delivery.
- **Broadcasts** — the admin "Send Notification" screen calls `notify` with
  `recipientId: 'all'`.

## Deployment (EAS)

Prerequisites: `npm i -g eas-cli`, then `eas login` and `eas init` (writes the
EAS `projectId` into `app.json`).

```bash
# Native builds
npm run build:dev       # development client (internal)
npm run build:preview   # internal QA build (APK + ad-hoc iOS)
npm run build:prod      # production build (AAB + App Store), auto version bump

# Store submission
npm run submit:ios      # fill appleId / ascAppId / appleTeamId in eas.json first
npm run submit:android  # add play-store-service-account.json first

# OTA updates (runtimeVersion policy: appVersion)
eas update:configure    # one-time, wires the update URL
npm run update          # publish a JS-only update to the active channel
```

Production env vars for builds are injected via EAS secrets or the `env` blocks
in `eas.json` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).

## Security

- Row Level Security is enabled on every table.
- Auth sessions are persisted in `expo-secure-store` (chunked), never AsyncStorage.
- Admin areas are gated client-side **and** by Supabase RLS.
- Service-role keys and provider secrets live only in Edge Functions.

## Assets

The app icon, splash, adaptive (foreground/background/monochrome), favicon and
notification icons in `assets/` are **placeholders** using the brand palette
(black `#0A0A0A`, gold `#C4A35A`) with a double-D monogram. Replace them with the
final logo when available. `assets/monogram-source.png` is the source artwork;
regenerate all derived sizes/formats with:

```bash
npm run assets
```

## Scripts

- `npm run start` — start the Expo dev server
- `npm run android` / `npm run ios` / `npm run web`
- `npm run typecheck` — TypeScript type checking
- `npm run assets` — regenerate placeholder app icons from the monogram source
- `npm run build:dev|preview|prod` — EAS builds
- `npm run submit:ios|android` — store submission
- `npm run update` — publish an OTA update
- `npm run deploy:functions` — deploy Supabase Edge Functions
