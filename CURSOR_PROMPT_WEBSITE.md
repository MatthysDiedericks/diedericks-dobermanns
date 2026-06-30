# Cursor Prompt — Diedericks Dobermanns Website

## PROJECT OVERVIEW

Build a standalone Next.js website for Diedericks Dobermanns that shares the existing Supabase backend with the React Native app. The website has two sections:
1. **Public marketing site** — showcase dogs, litters, training, brand
2. **Web admin panel** — manage all content from a browser (desktop-friendly)

This is a separate project from the React Native app. Create it in a new folder alongside the app project: `diedericksdobermann-web/`

---

## TECH STACK

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript strict
- **Styling:** Tailwind CSS v4
- **Database:** Supabase (same project as the app — same URL, same schema)
- **Auth:** Supabase Auth (same users table — admin login only for admin panel)
- **Images:** Next.js Image component + Supabase Storage public URLs
- **Deployment:** Vercel
- **Forms:** React Hook Form + Zod validation
- **Rich text display:** react-markdown (for FAQ and content fields)

---

## ENVIRONMENT VARIABLES

```env
NEXT_PUBLIC_SUPABASE_URL=https://nlmwxodvquwbjinhhbmr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sbXd4b2R2cXV3YmppbmhoYm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NTYzODksImV4cCI6MjA5NzQzMjM4OX0.k24g7Gc6BXpCP0DzKGtreDAqfPBoOHI-wePspTRmpHY
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Copy the `database.types.ts` file from the React Native project into `diedericksdobermann-web/src/types/database.types.ts` — do not regenerate it.

---

## BRAND & DESIGN SYSTEM

This is a premium European Dobermann breeder. The aesthetic is heritage luxury — like a high-end gun maker or equestrian stud farm website.

### Reference look:
- Protection Dogs Worldwide (PDW UK) — dark theme, gold serif navigation, large photography
- Colour palette identical to the app

### Colour tokens (add to `tailwind.config.ts`):
```typescript
colors: {
  background: '#111008',
  surface: '#1C1A0E',
  elevated: '#252218',
  gold: '#C4A35A',
  'gold-light': '#D4B472',
  'gold-dim': '#8A7240',
  'gold-border': 'rgba(196,163,90,0.2)',
  text: '#F5F0E8',
  muted: '#9E9880',
  subtle: '#5C5746',
  border: '#2E2B1E',
}
```

### Fonts (Google Fonts via Next.js font optimization):
```typescript
import { Cinzel, Lato } from 'next/font/google'
const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel', weight: ['400','700','900'] })
const lato = Lato({ subsets: ['latin'], variable: '--font-lato', weight: ['300','400','700'] })
```
- Headings: `font-cinzel` — gold, letter-spacing wide
- Body: `font-lato` — text color `#F5F0E8`

### Design rules:
- Background always `#111008` or `#1C1A0E` — never white
- Gold `#C4A35A` for headings, accents, CTAs, active states
- Thin gold horizontal rules between sections (`border-gold/20`)
- Large full-bleed hero images with dark overlay gradient
- Cards: `bg-surface border border-gold/20 rounded-sm` — no heavy rounded corners
- Buttons: gold background dark text (primary), gold border gold text transparent bg (secondary)
- Hover states: subtle gold glow or opacity shift
- No emojis anywhere on the site

---

## PROJECT STRUCTURE

```
diedericksdobermann-web/
├── src/
│   ├── app/
│   │   ├── layout.tsx               ← Root layout with fonts, nav, footer
│   │   ├── page.tsx                 ← Home
│   │   ├── about/page.tsx
│   │   ├── dogs/
│   │   │   ├── page.tsx             ← All dogs listing
│   │   │   └── [slug]/page.tsx      ← Individual dog profile
│   │   ├── litters/
│   │   │   ├── page.tsx             ← Expected litters
│   │   │   └── [id]/page.tsx        ← Litter detail + waitlist form
│   │   ├── training/page.tsx
│   │   ├── gallery/page.tsx
│   │   ├── achievements/page.tsx
│   │   ├── faq/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── apply/page.tsx           ← Online application form
│   │   ├── terms/page.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx           ← Admin layout with sidebar
│   │   │   ├── login/page.tsx
│   │   │   ├── page.tsx             ← Admin dashboard
│   │   │   ├── dogs/
│   │   │   │   ├── page.tsx         ← Dogs list
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx    ← Edit dog
│   │   │   ├── litters/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── applications/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── training/
│   │   │   │   └── page.tsx         ← Training bookings
│   │   │   ├── gallery/page.tsx
│   │   │   ├── testimonials/page.tsx
│   │   │   ├── faq/page.tsx
│   │   │   ├── messaging/page.tsx
│   │   │   ├── enquiries/page.tsx
│   │   │   └── settings/page.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── AdminSidebar.tsx
│   │   ├── ui/
│   │   │   ├── GoldButton.tsx
│   │   │   ├── SectionHeader.tsx
│   │   │   ├── DogCard.tsx
│   │   │   ├── LitterCard.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── ImageUploader.tsx
│   │   └── forms/
│   │       ├── ApplicationForm.tsx
│   │       ├── EnquiryForm.tsx
│   │       └── WaitlistForm.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts            ← createBrowserClient
│   │   │   └── server.ts            ← createServerClient
│   │   └── utils.ts
│   └── types/
│       └── database.types.ts        ← Copied from React Native project
```

---

## SECTION 1 — PUBLIC SITE

### Navigation (`components/layout/Navbar.tsx`)

Fixed top navbar. Background `#111008` with `border-b border-gold/20`. Subtle backdrop blur.

Logo: "DIEDERICKS DOBERMANNS" in Cinzel, gold, letter-spacing-[0.2em]. Left side.

Nav links (right side, Cinzel, text-sm tracking-widest uppercase muted, hover:gold):
`Our Dogs` | `Litters` | `Training` | `Gallery` | `Achievements` | `About` | `Contact`

CTA button: `Apply` — gold border, gold text.

Mobile: hamburger → slide-in drawer with same links.

Active link: gold color, thin gold underline.

---

### Home Page (`app/page.tsx`)

**Section 1 — Hero**
Full-viewport height. Background: Dobermann photo from Supabase Storage (fetch `app_settings` key `hero_image_url`, fallback to `/images/hero-placeholder.jpg`).
Dark overlay: `linear-gradient(to bottom, rgba(17,16,8,0.3) 0%, rgba(17,16,8,0.85) 100%)`.
Centred content:
- Small gold caps: "ESTABLISHED IN EXCELLENCE"
- H1 in Cinzel 900: "Born With Purpose.\nBuilt With Discipline." — white, large
- Subtext: "Precision bred. Professionally trained. Lifetime proven." — gold italic Cinzel
- Two buttons: "View Our Dogs" (gold filled) | "Apply for a Dog" (gold outline)
- Scroll indicator: thin gold chevron, bouncing animation

**Section 2 — Featured Dogs**
Heading: "OUR DOGS" in Cinzel gold.
3-column grid of featured dogs (`dogs WHERE is_featured = true AND is_public = true LIMIT 6`).
Each card: full-bleed square image, gradient overlay, dog name Cinzel white bottom-left, status badge bottom-right (Available / Reserved / Not Available). On hover: subtle scale + gold border glow. Links to `/dogs/[slug]`.
CTA: "View All Dogs →"

**Section 3 — Expected Litters**
Dark surface section (`bg-surface`). Heading: "EXPECTED LITTERS".
Horizontal scroll on mobile, 2-col grid on desktop. Fetch `litters WHERE status IN ('planned','expected') AND is_public = true`.
Each card: mother + father names, expected date, availability count, "Join Waitlist" button.
If no litters: "No litters currently planned. Register your interest below."

**Section 4 — Product Tiers**
3-column cards on dark background:
- **Standard Puppies** — entry card, gold-top border
- **Elite Developed Puppies** — featured card, larger, gold background tint
- **Elite Family Protection Dogs** — premium card, gold border all sides
Each: tier name Cinzel, 2-sentence description, "Learn More" link to /dogs filtered by category.

**Section 5 — About Teaser**
Split layout: large Dobermann photo left, text right.
Pull from `content/about-us.md` first 2 paragraphs.
"Read Our Story →" links to /about.

**Section 6 — Testimonials**
Dark. "WHAT OUR CLIENTS SAY" heading.
Fetch `testimonials WHERE is_approved = true AND is_featured = true LIMIT 4`.
Card per testimonial: quote marks in gold, content, client_name Cinzel, location muted, dog_name badge. Auto-rotating carousel on mobile.

**Section 7 — App Download**
Split: phone mockup image left (or placeholder), text right.
"MANAGE EVERYTHING FROM YOUR PHONE"
Body: "Our clients get exclusive access to the Diedericks Dobermanns app — track your reservation, view your dog's progress, receive updates, and connect with our team directly."
Two buttons: App Store (SVG badge) | Google Play (SVG badge) — link to `app_settings` keys `app_store_url` and `play_store_url`.

**Section 8 — Contact strip**
Full-width gold-bordered strip. "READY TO BEGIN?" — "Apply for a Dog" button centre. Subtext: "Applications are reviewed personally. We place quality over volume."

**Footer**
Dark. Logo top. Nav links. Social icons (Instagram, Facebook, WhatsApp) from `app_settings`. Copyright. "Built with purpose."

---

### Dogs Page (`app/dogs/page.tsx`)

Hero: short hero with "OUR DOGS" Cinzel heading, subtext.
Filter bar: All | Available | In Training | Studs & Dams | Standard | Elite | Protection Dogs
Fetch `dogs WHERE is_public = true`, filter by category and status.
Grid: 3-col desktop, 2-col tablet, 1-col mobile. DogCard component.
Sort: newest first by default. Count shown: "Showing 12 dogs"

### Dog Detail Page (`app/dogs/[slug]/page.tsx`)

Generate static params from all public dogs. Revalidate every 60 seconds (ISR).

Slug = dog `id` (use id as slug for simplicity).

Layout:
- Full-width image gallery: primary image large left, thumbnails right (from `dog_media`). Click thumbnail to swap main image. Video thumbnails play inline.
- Right column: dog name Cinzel H1, status badge, category badge
- Grid of details: DOB, Colour, Sex, Sire, Dam (with links if also public), Microchip, Health Tests (DCM/HD/ED with green ticks)
- Description tab | Training Notes tab | Temperament tab (if data exists)
- Achievements accordion — list from `achievements` for this dog_id
- Vaccination timeline — from `vaccinations` for this dog_id (show latest 3, "View all" expands)
- Gold CTA: if status = 'available' → "Apply for This Dog" (links to /apply?dog_id=ID)
- "Make an Enquiry" button always shown → opens enquiry modal

### Litters Page + Litter Detail

`/litters` — cards with mother, father, expected_date, puppy_count, available_count, status.
`/litters/[id]` — detail: parents with photos and links, expected date, description, available spots. Waitlist form (`WaitlistForm.tsx`) — full name, email, phone, preference_notes. On submit: insert into `waiting_list` (no auth required, use service role via API route).

### Training Page (`app/training/page.tsx`)

Static content page explaining training philosophy + PSA.
Pull text from `content/about-us.md` Training section.
Section 1: Training Philosophy — text + image.
Section 2: PSA Sport — what it is, why it matters for credibility.
Section 3: Session Types — fetch `training_session_types WHERE is_active = true`, list as cards.
Section 4: "Book a Session" CTA — "Download the app to book training sessions and video calls with our trainers."
App store badges. Link to enquiry form as alternative.

### Gallery Page (`app/gallery/page.tsx`)

Masonry grid layout. Fetch `gallery_items` all, order by sort_order.
Filter tabs: All | Photos | Videos.
Photos: Next.js Image, click → lightbox modal (build simple one with CSS transitions, no library).
Videos: embed if YouTube/Vimeo URL, or direct video player if Supabase Storage URL.
Infinite scroll or "Load More" button (paginate 20 at a time).

### Achievements Page (`app/achievements/page.tsx`)

Fetch dogs (public) joined with achievements.
Group by dog. For each dog: photo, name, category.
Achievement list per dog: title, score, trial_date, location, judge.
Sort by trial_date DESC within each dog. Dogs ordered by most recent achievement.

### FAQ Page (`app/faq/page.tsx`)

Fetch `faq WHERE is_published = true` order by sort_order.
Group by `category` field.
Accordion component per question — smooth open/close. Gold chevron indicator.
Category pills at top to jump to section.

### Contact Page (`app/contact/page.tsx`)

Two columns:
Left: contact details from `app_settings` — phone, email, address, WhatsApp link, social icons.
Google Maps embed if address is set.
Right: `EnquiryForm.tsx` — full_name (required), email (required), phone, country, subject select (General / Puppy Enquiry / Training / Other), message (required). On submit: insert into `enquiries` table via Supabase client. Show success state.

### Apply Page (`app/apply/page.tsx`)

Multi-step form (5 steps, progress bar at top in gold):

Step 1 — Personal Info: full_name, email, phone, id_number, address, city, province, country.
Step 2 — Your Home: home_type (House/Apartment/Farm/other), has_secure_yard (yes/no), children_ages (text), current_pets.
Step 3 — Your Interest: dog_interest (Standard Puppy / Elite Developed / Protection Dog), specific_dog_id (optional select from available dogs), litter_interest_id (optional), purpose, security_requirements, experience_with_dobermanns.
Step 4 — References: vet_name, vet_phone, personal_reference_name, personal_reference_phone.
Step 5 — Terms: scrollable T&C summary, mandatory checkbox `agreed_to_terms`. Submit button only enabled when checked.

On submit: insert into `applications` table. No auth required — use service role API route (`app/api/apply/route.ts`).
Success page: "Thank you, [name]. Your application has been received. We review every application personally and will be in touch within 5–7 business days."

### Terms Page (`app/terms/page.tsx`)

Render `content/terms-and-conditions.md` as formatted HTML using react-markdown.
Cinzel gold headings, Lato body. Print button top-right.

---

## SECTION 2 — ADMIN PANEL (`/admin`)

### Auth Protection

`src/app/admin/layout.tsx` — check Supabase session server-side. If no session or user role ≠ 'admin' or 'super_admin', redirect to `/admin/login`. Use Supabase SSR cookies.

`/admin/login/page.tsx` — email + password form. On submit, `supabase.auth.signInWithPassword()`. On success, redirect to `/admin`. Show error on failure.

### Admin Layout (`src/components/layout/AdminSidebar.tsx`)

Fixed left sidebar (240px). Dark background `#111008`. Gold logo top.

Navigation groups:
- **Content:** Dogs | Litters | Gallery | Testimonials | FAQ | Achievements
- **Business:** Applications | Enquiries | Waiting List | Training Bookings
- **Communication:** Messaging | Notifications
- **Settings:** App Settings | Users

Active item: gold left border, gold text.
Logout button at bottom.

### Admin Dashboard (`/admin/page.tsx`)

Stats cards row: Total Dogs | Active Litters | Pending Applications | New Enquiries (unread) | Upcoming Bookings | Waiting List Count.
Each stat fetches count from Supabase.

Recent activity panels:
- Latest 5 applications (name, status badge, date)
- Latest 5 enquiries (name, subject, date)
- Upcoming training bookings this week

### Admin — Dogs (`/admin/dogs`)

List page: table with columns: Photo thumb | Name | Category | Status | Is Public | Is Featured | Actions (Edit / Toggle Public).
Search bar. Filter by category and status.
"Add Dog" button → `/admin/dogs/new`.

New/Edit dog form:
- All dog fields: name, breed, sex, colour, date_of_birth, category (Standard/Elite/Protection), status, bloodline, microchip_number, price, description, training_notes, temperament_notes, health fields (dcm_status, hip_score, elbow_score), pedigree_url.
- Mother/Father selectors: searchable dropdown from dogs table.
- is_public toggle, is_featured toggle.
- Media section: `ImageUploader` component — drag-and-drop or click to upload multiple photos/videos to Supabase Storage bucket `dog-media` at path `dogs/${dogId}/`. List existing media with set-primary and delete buttons.
- Achievements section: add/edit/delete achievement rows inline (title, score, trial_date, location, judge).
- Vaccinations section: add/edit/delete vaccination rows (vaccine_name, date_administered, next_due_date, administered_by, batch_number).
- Save button. Auto-generate slug from name.

### Admin — Litters (`/admin/litters`)

Table: Name | Mother | Father | Expected Date | Status | Puppy Count | Available | Public | Actions.
Edit form: all litter fields, mother_id/father_id selectors, status picker (planned/expected/born/available/closed).
Waiting list sub-section on each litter edit page: list of waiting_list entries with client name, email, position, preference_notes, status. Admin can update status (active/contacted/confirmed/cancelled) and reorder positions.

### Admin — Applications (`/admin/applications`)

Table: Applicant name | Email | Country | Dog/Litter interest | Status | Date. Sortable columns.
Filter by status: all | pending | approved | rejected | waitlisted.
Click row → detail view showing all application fields in read-only layout.
Admin actions: Approve | Reject | Waitlist | Add to Waiting List for specific litter.
Admin notes textarea — saved to `admin_notes` field.
Status change sends notification (future: email via Resend).

### Admin — Enquiries (`/admin/enquiries`)

Table: Name | Email | Subject | Status | Date.
Click → full message view. Reply textarea (stores in admin_notes, marks `status = 'replied'`).
Filter: new | replied | archived.

### Admin — Training Bookings (`/admin/training`)

Tabs: Requests | Calendar | Session Types | Availability (same as app admin panel but web-native UI).

Requests: table of all bookings. Filter by status. Click → detail with client info, dog, session type, notes. Admin can confirm, cancel, assign trainer, mark complete. If video_call and no room yet: "Create Video Room" button that calls `/api/admin/create-video-room` route.

Calendar: monthly calendar grid. Each day shows booking count dot. Click day → list of bookings.

Session Types: CRUD table for `training_session_types`. Toggle active, edit all fields inline.

Availability: form to add slots, list to view/delete existing.

### Admin — Gallery (`/admin/gallery`)

Grid of all gallery items. Drag to reorder (update sort_order). Each item: image/video, title, category, is_featured toggle, delete button.
"Add Media" button → upload form: ImageUploader + title + category (dogs/training/events/achievements) + description.

### Admin — Testimonials (`/admin/testimonials`)

List: client_name | dog_name | is_approved | is_featured | date. Toggle approved/featured inline.
Add testimonial form. Edit inline. Delete.

### Admin — FAQ (`/admin/faq`)

Accordion list matching public FAQ. Drag to reorder. Each item: question, answer (textarea), category, is_published toggle. "Add Question" button. Delete.

### Admin — Messaging (`/admin/messaging`)

Compose form:
- Target: All Clients | Select Group (dropdown from `client_groups`)
- Title
- Body (textarea, 500 char limit shown)
- Optional image upload
- Channels: Push ✓ Email □ WhatsApp □
- Schedule: Send Now / Pick date+time
- Preview panel on right — live preview of the message card
- Send button

History tab: table of sent broadcasts. title | group | channels | sent_at | recipient_count | status.

### Admin — Settings (`/admin/settings`)

Key-value editor for `app_settings` table. Group by category:

**Social Links:** Instagram URL, Facebook URL, WhatsApp number, Telegram, YouTube
**App:** App Store URL, Play Store URL
**Contact:** Business email, phone, address, Google Maps embed URL
**Media:** Hero image URL (with upload button), Logo URL

Each row: key label, value input, save button.

---

## IMAGE UPLOADER COMPONENT (`components/ui/ImageUploader.tsx`)

Drag-and-drop zone + click to select. Accepts images and videos.
On file select: preview immediately in UI.
On confirm: upload to Supabase Storage `POST /storage/v1/object/{bucket}/{path}` using supabase-js.
Show progress bar per file. Show error if upload fails.
On complete: return public URL. Allow delete (calls `supabase.storage.from(bucket).remove([path])`).
Max file size: 50MB. Compress images client-side using `browser-image-compression` package before upload.

---

## API ROUTES

`app/api/apply/route.ts` — POST. Validates body with Zod, inserts into `applications` using service role client. Returns 200 or error.

`app/api/enquiry/route.ts` — POST. Inserts into `enquiries`. Rate limit: 3 per IP per hour (use Upstash Redis or simple in-memory for now).

`app/api/waitlist/route.ts` — POST. Inserts into `waiting_list`.

`app/api/admin/create-video-room/route.ts` — POST (auth required). Calls Daily.co API to create room, updates `training_bookings` record with video URLs. Uses DAILY_API_KEY from env.

---

## SEO & PERFORMANCE

Each public page must have:
```typescript
export const metadata: Metadata = {
  title: 'Page Title | Diedericks Dobermanns',
  description: '...',
  openGraph: { images: ['/og-image.jpg'] },
}
```

Dog detail pages: generate OG image from dog's primary photo.

`app/sitemap.ts` — generate sitemap including all public dogs and litters.
`app/robots.ts` — allow all crawlers, exclude `/admin`.

All public pages: SSR or ISR with `revalidate: 60`. Admin pages: force-dynamic.

Images: always use `next/image` with explicit width/height. Set `priority` on above-fold images.

---

## DEPLOYMENT

### Vercel setup (tell user to do this):
1. Go to vercel.com → New Project → Import GitHub repo
2. Set environment variables in Vercel dashboard
3. Deploy — Vercel auto-detects Next.js

### Custom domain:
- Buy `diedericksdobermanns.com` or `.co.za`
- Add in Vercel → Project → Settings → Domains
- Update DNS at domain registrar: CNAME → `cname.vercel-dns.com`

### `vercel.json`:
```json
{
  "redirects": [
    { "source": "/home", "destination": "/", "permanent": true }
  ]
}
```

---

## INITIALISATION COMMANDS

```bash
npx create-next-app@latest diedericksdobermann-web \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd diedericksdobermann-web

npm install @supabase/supabase-js @supabase/ssr \
  react-hook-form zod @hookform/resolvers \
  react-markdown \
  browser-image-compression \
  date-fns

# Copy database.types.ts from the React Native project
cp ../path-to-app/database.types.ts src/types/database.types.ts
```

---

## IMPORTANT RULES

- No white backgrounds anywhere — always dark theme
- No placeholder text left in production — if data is empty, show elegant empty states
- All admin mutations use server actions or API routes with service role — never expose service role key to browser
- Supabase RLS still applies to browser client — admin panel uses session-based auth, not service role in browser
- Never store service role key in `NEXT_PUBLIC_` variables
- All forms have loading states and error states
- Mobile-responsive — the public site must be perfect on phones
- TypeScript strict — no `any` types

---

## ORDER OF EXECUTION

1. Init project, install deps, set up Supabase clients, copy types
2. Global layout: fonts, colors, Navbar, Footer
3. Home page (full)
4. Dogs listing + dog detail page
5. Litters listing + litter detail + waitlist form
6. About, Training, Gallery, Achievements, FAQ, Contact pages
7. Apply form (multi-step)
8. Terms page
9. Admin login + auth middleware
10. Admin layout + sidebar
11. Admin dashboard
12. Admin CRUD: Dogs (most complex — full media upload)
13. Admin CRUD: Litters, Applications, Enquiries
14. Admin: Training bookings
15. Admin: Gallery, Testimonials, FAQ, Messaging
16. Admin: Settings
17. SEO metadata on all pages
18. Deploy to Vercel

After each major section, run `npm run build` to check for type errors before continuing.
