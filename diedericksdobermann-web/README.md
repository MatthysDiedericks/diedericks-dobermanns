# Diedericks Dobermanns — Website

A standalone Next.js (App Router) website for Diedericks Dobermanns that shares
the existing Supabase backend with the React Native app. It has two sections:

- **Public marketing site** — dogs, litters, training, gallery, achievements,
  FAQ, about, contact, and a multi-step application form.
- **Web admin panel** (`/admin`) — manage all content from the browser.

## Tech Stack

- Next.js 16 (App Router) + TypeScript (strict)
- Tailwind CSS v4 (design tokens defined in `src/app/globals.css`)
- Supabase (`@supabase/ssr` for auth/SSR, service role only inside API routes)
- React Hook Form + Zod, react-markdown, browser-image-compression, date-fns

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...          # server-only, never NEXT_PUBLIC_
DAILY_API_KEY=...                      # optional, for training video rooms
```

> The service role key is only used inside API routes (`/api/apply`,
> `/api/enquiry`, `/api/waitlist`, `/api/admin/create-video-room`). It is never
> exposed to the browser.

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build / type check
npm run lint     # ESLint
```

## Database Types

`src/types/database.types.ts` is copied verbatim from the React Native project.
Do not regenerate it here — keep both projects in sync from the same source.

## Supabase Storage Buckets

The admin uploader expects these public buckets to exist:

- `dog-media` — dog photos/videos (`dogs/<dogId>/...`)
- `gallery` — gallery items
- `broadcasts` — broadcast message images

## Admin Access

Sign in at `/admin/login`. The `(panel)` route group enforces that the
authenticated user has a `users.role` of `admin` or `super_admin`; everyone else
is redirected to the login page. RLS still applies to all browser/admin reads
and writes.

## Notes / Decisions

- Public litter waitlist signups are captured as `enquiries` (tagged with the
  litter), because `waiting_list` requires an authenticated `client_id`. Admins
  triage these and convert them to formal waitlist entries in the app.
- All public pages use ISR (`revalidate = 60`); admin pages are `force-dynamic`.

## Deployment (Vercel)

1. Push to GitHub and import the repo at vercel.com → New Project.
2. Add the environment variables in the Vercel dashboard.
3. Deploy — Vercel auto-detects Next.js. `vercel.json` redirects `/home` → `/`.
4. Add a custom domain under Project → Settings → Domains and point DNS
   (`CNAME → cname.vercel-dns.com`).
