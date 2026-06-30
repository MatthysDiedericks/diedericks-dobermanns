# DIEDERICKS DOBERMANNS — CURSOR MASTER PROMPT
## Complete App Build Specification

> **Instructions for Cursor:** Read this entire document before writing a single line of code.
> This is the single source of truth for the Diedericks Dobermanns mobile application.
> Follow every decision here unless you have a strong technical reason to deviate — and if so, explain why before changing anything.

---

## 1. PROJECT OVERVIEW

**App Name:** Diedericks Dobermanns
**App Icon Concept:** Stylised double-D monogram (D over D)
**Slogan:** "Born With Purpose. Built With Discipline."
**Business:** Elite Dobermann breeding and professional protection dog training operation.
**Purpose:** Replace manual administration, showcase dogs professionally, manage client relationships, and provide a premium digital experience that reflects the quality of the dogs.

---

## 2. TECH STACK (NON-NEGOTIABLE)

| Layer | Technology |
|---|---|
| Frontend | React Native + Expo (SDK 51+) |
| Language | TypeScript (strict mode) |
| Backend | Supabase |
| Database | PostgreSQL (via Supabase) |
| Authentication | Supabase Auth |
| File Storage | Supabase Storage |
| Notifications | Expo Push Notifications + WhatsApp (via WhatsApp Business API) + Email (via Resend or Supabase Edge Functions) |
| State Management | Zustand |
| Navigation | Expo Router (file-based routing) |
| Styling | NativeWind (Tailwind for React Native) |
| Forms | React Hook Form + Zod validation |
| AI (future-ready) | Architecture must support OpenAI / Claude API integration |
| Payments (future-ready) | Architecture must support Stripe — do not implement yet |

**Target Platforms:** iOS (iPhone) and Android (Samsung + all Android devices)
**Single codebase** — no platform-specific forks.

---

## 3. BRAND & UI DESIGN

### Colour Palette
| Name | Hex | Usage |
|---|---|---|
| Deep Black | `#0A0A0A` | Primary background |
| Rich Black | `#111111` | Card backgrounds |
| Dark Grey | `#1A1A1A` | Secondary backgrounds, input fields |
| Gold Primary | `#C9A84C` | CTAs, highlights, accents, active states |
| Gold Light | `#E2C47E` | Hover states, secondary gold |
| Silver | `#9E9E9E` | Subtext, borders, inactive icons |
| White | `#F5F5F5` | Primary text |
| Off-White | `#CCCCCC` | Secondary text |
| Danger Red | `#C0392B` | Errors, warnings |
| Success Green | `#27AE60` | Confirmations |

### Typography
- **Display / Hero:** Bold, large, uppercase for section headers
- **Body:** Clean sans-serif, 16px base, generous line height
- **Accent:** Gold colour, slightly spaced tracking for labels and tags
- **Font recommendation:** Use `expo-google-fonts` — suggest `Cinzel` for display, `Inter` for body

### Visual Style
- Dark theme throughout — no light mode in v1
- Large, full-bleed photography of dogs
- Minimal UI chrome — let the dogs dominate the screen
- Gold dividers, thin borders (`border-gold/20`)
- Subtle shadow elevation on cards
- Smooth transitions and micro-animations (use `react-native-reanimated`)
- Inspiration reference: protectiondogsworldwide.com — but darker, more exclusive, Dobermann-specific

### Logo
- European cropped Dobermann (ears and tail) in profile stance
- Shield behind the dog
- Dark theme: black base, silver outline, gold accent on shield
- Double-D monogram for app icon
- Generate logo assets at 1024x1024 for app store, 512x512 for in-app use

---

## 4. USER ROLES & PERMISSIONS

| Role | Access |
|---|---|
| **Visitor** | Public area only — no login required |
| **Client** | Client portal — own data only |
| **Trainer** | Training dog profiles + progress updates |
| **Admin** | Full content management, all users, all dogs, notifications |
| **Super Admin** | Everything + role management, system settings |

**Security rule:** Never grant more access than the role requires. All data access enforced via Supabase Row Level Security (RLS) — never trust the frontend alone.

---

## 5. APP STRUCTURE — SCREENS & NAVIGATION

### PUBLIC AREA (No Login Required)

```
/ (Home)
/about
/our-dogs
  /our-dogs/[id]         ← individual dog profile
/puppies
  /puppies/[id]
/expected-litters
  /expected-litters/[id]
/training-philosophy
/gallery
/achievements
/testimonials
/faq
/contact
/apply                   ← public application form
```

### CLIENT PORTAL (Login Required)

```
/portal
/portal/dashboard
/portal/my-reservation
/portal/puppy-tracker/[puppyId]
/portal/training-updates/[dogId]
/portal/documents
/portal/contracts
/portal/vaccination-records
/portal/notifications
/portal/profile
/portal/application-status
```

### ADMIN PANEL (Admin/Super Admin Only)

```
/admin
/admin/dashboard
/admin/dogs
  /admin/dogs/new
  /admin/dogs/[id]/edit
/admin/puppies
  /admin/puppies/new
  /admin/puppies/[id]/edit
/admin/litters
  /admin/litters/new
  /admin/litters/[id]/edit
/admin/training
  /admin/training/[dogId]
/admin/applications
  /admin/applications/[id]
/admin/clients
  /admin/clients/[id]
/admin/waiting-list
/admin/notifications/send
/admin/gallery
/admin/testimonials
/admin/faq
/admin/analytics
```

---

## 6. DATABASE SCHEMA

> Build all tables in Supabase PostgreSQL. Enable RLS on every table. Use UUID primary keys throughout.

### users (extends Supabase auth.users)
```sql
id UUID PRIMARY KEY REFERENCES auth.users(id)
full_name TEXT
phone TEXT
country TEXT
city TEXT
role TEXT DEFAULT 'client' -- visitor, client, trainer, admin, super_admin
avatar_url TEXT
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

### dogs
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
name TEXT NOT NULL
breed TEXT DEFAULT 'Dobermann'
colour TEXT  -- black/rust, blue/rust, fawn/rust, red/rust
sex TEXT     -- male, female
date_of_birth DATE
father_id UUID REFERENCES dogs(id)
mother_id UUID REFERENCES dogs(id)
microchip_number TEXT UNIQUE
status TEXT  -- available, reserved, sold, in_training, breeding_stock, deceased
category TEXT -- puppy, adult, breeding_stock, training_dog
price DECIMAL(12,2)
bloodline TEXT  -- altobello, dominator, quantum, american, kennel_own
health_tested BOOLEAN DEFAULT false
hip_score TEXT
elbow_score TEXT
dcm_status TEXT  -- clear, carrier, affected
pedigree_url TEXT
description TEXT
temperament_notes TEXT
training_notes TEXT
is_featured BOOLEAN DEFAULT false
is_public BOOLEAN DEFAULT true
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

### dog_media
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE
type TEXT  -- photo, video
url TEXT NOT NULL
thumbnail_url TEXT
caption TEXT
is_primary BOOLEAN DEFAULT false
sort_order INT DEFAULT 0
uploaded_at TIMESTAMPTZ DEFAULT now()
```

### litters
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
name TEXT
mother_id UUID REFERENCES dogs(id)
father_id UUID REFERENCES dogs(id)
expected_date DATE
actual_date DATE
puppy_count INT
available_count INT
description TEXT
status TEXT  -- planned, expected, born, placed
is_public BOOLEAN DEFAULT true
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

### vaccinations
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE
vaccine_name TEXT NOT NULL
date_administered DATE NOT NULL
next_due_date DATE
administered_by TEXT
batch_number TEXT
notes TEXT
created_at TIMESTAMPTZ DEFAULT now()
```

### training_logs
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE
trainer_id UUID REFERENCES users(id)
training_type TEXT  -- obedience, protection, psa, socialization, foundation
session_date DATE NOT NULL
duration_minutes INT
milestone TEXT
progress_level TEXT  -- foundation, intermediate, advanced, proofed
notes TEXT
video_url TEXT
created_at TIMESTAMPTZ DEFAULT now()
```

### applications
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID REFERENCES users(id)
-- Personal Info
full_name TEXT NOT NULL
email TEXT NOT NULL
phone TEXT NOT NULL
id_number TEXT
country TEXT NOT NULL
province TEXT
city TEXT
address TEXT
-- Dog Interest
dog_interest TEXT   -- puppy, elite_developed, protection_dog
specific_dog_id UUID REFERENCES dogs(id)
litter_interest_id UUID REFERENCES litters(id)
purpose TEXT        -- family, protection, sport, companion
-- Lifestyle Questions
experience_with_dobermanns TEXT
current_pets TEXT
home_type TEXT      -- house, apartment, smallholding, farm
has_secure_yard BOOLEAN
children_ages TEXT
security_requirements TEXT
-- References
vet_name TEXT
vet_phone TEXT
personal_reference_name TEXT
personal_reference_phone TEXT
-- Status
status TEXT DEFAULT 'submitted'  -- submitted, under_review, approved, rejected, waitlisted
admin_notes TEXT
reviewed_by UUID REFERENCES users(id)
reviewed_at TIMESTAMPTZ
agreed_to_terms BOOLEAN DEFAULT false
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

### reservations
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
client_id UUID REFERENCES users(id)
dog_id UUID REFERENCES dogs(id)
litter_id UUID REFERENCES litters(id)
application_id UUID REFERENCES applications(id)
deposit_paid BOOLEAN DEFAULT false
deposit_amount DECIMAL(12,2)
total_price DECIMAL(12,2)
status TEXT  -- pending, confirmed, completed, cancelled
expected_pickup_date DATE
actual_pickup_date DATE
notes TEXT
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

### waiting_list
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
client_id UUID REFERENCES users(id)
litter_id UUID REFERENCES litters(id)
preference_notes TEXT
position INT
status TEXT  -- active, offered, converted, removed
created_at TIMESTAMPTZ DEFAULT now()
```

### contracts
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
reservation_id UUID REFERENCES reservations(id)
client_id UUID REFERENCES users(id)
dog_id UUID REFERENCES dogs(id)
document_url TEXT NOT NULL
signed_by_client BOOLEAN DEFAULT false
signed_at TIMESTAMPTZ
notes TEXT
created_at TIMESTAMPTZ DEFAULT now()
```

### notifications_log
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
recipient_id UUID REFERENCES users(id)
type TEXT   -- push, email, whatsapp
channel TEXT
subject TEXT
body TEXT
status TEXT  -- sent, delivered, failed
sent_at TIMESTAMPTZ DEFAULT now()
```

### testimonials
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
client_name TEXT NOT NULL
location TEXT
dog_name TEXT
content TEXT NOT NULL
video_url TEXT
photo_url TEXT
is_featured BOOLEAN DEFAULT false
is_approved BOOLEAN DEFAULT false
sort_order INT DEFAULT 0
created_at TIMESTAMPTZ DEFAULT now()
```

### gallery_items
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
title TEXT
description TEXT
image_url TEXT NOT NULL
video_url TEXT
category TEXT  -- puppies, training, competition, family, kennel
is_featured BOOLEAN DEFAULT false
sort_order INT DEFAULT 0
created_at TIMESTAMPTZ DEFAULT now()
```

### faq
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
question TEXT NOT NULL
answer TEXT NOT NULL
category TEXT
sort_order INT DEFAULT 0
is_published BOOLEAN DEFAULT true
created_at TIMESTAMPTZ DEFAULT now()
```

---

## 7. SUPABASE STORAGE BUCKETS

| Bucket | Purpose | Access |
|---|---|---|
| `dog-media` | Dog photos and videos | Public read, admin write |
| `gallery` | General gallery images/videos | Public read, admin write |
| `documents` | Contracts, vet records, pedigrees | Private — RLS by user |
| `avatars` | User profile photos | Private — RLS by user |
| `testimonials` | Testimonial photos/videos | Public read, admin write |

---

## 8. AUTHENTICATION FLOW

1. Visitors browse the public app without any login.
2. To apply or access the client portal, users register with email + password via Supabase Auth.
3. On registration, a row is inserted into the `users` table with `role = 'client'`.
4. Email verification is required before portal access is granted.
5. Admins are promoted via the `users` table — never self-assignable.
6. JWT tokens are stored securely using `expo-secure-store` — never AsyncStorage.
7. Session refresh is handled automatically by Supabase client.

---

## 9. NOTIFICATIONS ARCHITECTURE

### Push Notifications (Expo)
- Used for: new puppy available, application status update, training milestone, reservation confirmed
- Implementation: Expo Push Tokens stored in `users` table, sent via Supabase Edge Functions

### Email (Resend)
- Used for: application received confirmation, approval/rejection, contracts, vaccination reminders
- Implementation: Supabase Edge Functions call Resend API
- Templates must use the brand colours (dark background, gold accents)

### WhatsApp
- Used for: key milestone alerts, reservation confirmations
- Implementation: WhatsApp Business API (via 360dialog or Twilio)
- Triggered via Supabase Edge Functions on database events

---

## 10. KEY SCREENS — DETAILED SPEC

### HOME SCREEN (Public)
- Full-screen hero video or image of a Dobermann
- Slogan overlay: "Born With Purpose. Built With Discipline."
- Gold CTA buttons: "View Our Dogs" | "Apply Now"
- Featured dogs carousel (3–5 dogs, horizontal scroll)
- Brief "About" section with photo
- Testimonial snippet (1–2, link to full page)
- Instagram feed preview (link out)
- Contact strip at bottom

### DOG PROFILE SCREEN (Public)
- Full-bleed hero image (swipeable photo gallery)
- Dog name in large display font
- Status badge: AVAILABLE / RESERVED / SOLD (gold/grey/red)
- Key stats row: Sex | Colour | Age | Bloodline
- Sections (collapsible):
  - About this dog
  - Health Testing (DCM1–5, HD, ED results)
  - Pedigree
  - Training Background
  - Video section
- CTA: "Enquire About [Name]" → links to contact/application

### CLIENT PORTAL DASHBOARD
- Greeting: "Welcome back, [Name]"
- Active reservation card (dog name, photo, status, pickup date)
- Quick links: Documents | Vaccination Records | Training Updates
- Notification bell with unread count
- Application status tracker (if application pending)

### ONLINE APPLICATION FORM
- Multi-step form (5 steps with progress bar)
  1. Personal Information
  2. Your Home & Lifestyle
  3. Experience & References
  4. Dog Preference
  5. Review & Submit
- Zod validation on every field
- Save progress locally (AsyncStorage for draft, not sensitive data)
- Agreement to terms required on final step
- Confirmation screen with reference number on submission

### ADMIN DASHBOARD
- Summary cards: Active Dogs | Pending Applications | Open Reservations | Waiting List
- Recent activity feed
- Quick actions: Add Dog | Review Application | Send Notification
- Basic analytics: applications this month, dogs placed YTD

---

## 11. FILE & FOLDER STRUCTURE

```
diedericks-dobermanns/
├── app/                          ← Expo Router screens
│   ├── (public)/                 ← Public tab group
│   │   ├── index.tsx             ← Home
│   │   ├── about.tsx
│   │   ├── dogs/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── puppies/
│   │   ├── litters/
│   │   ├── gallery.tsx
│   │   ├── testimonials.tsx
│   │   ├── faq.tsx
│   │   ├── contact.tsx
│   │   └── apply.tsx
│   ├── (portal)/                 ← Client portal tab group (auth required)
│   │   ├── dashboard.tsx
│   │   ├── reservation.tsx
│   │   ├── documents.tsx
│   │   ├── notifications.tsx
│   │   └── profile.tsx
│   ├── (admin)/                  ← Admin panel (admin role required)
│   │   ├── dashboard.tsx
│   │   ├── dogs/
│   │   ├── applications/
│   │   ├── clients/
│   │   └── notifications.tsx
│   ├── auth/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   └── _layout.tsx
├── components/
│   ├── ui/                       ← Reusable UI primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── Typography.tsx
│   ├── dogs/
│   │   ├── DogCard.tsx
│   │   ├── DogGallery.tsx
│   │   └── DogStatusBadge.tsx
│   ├── forms/
│   │   └── ApplicationForm/
│   └── admin/
├── lib/
│   ├── supabase.ts               ← Supabase client
│   ├── auth.ts                   ← Auth helpers
│   ├── notifications.ts          ← Push + email + WhatsApp helpers
│   └── storage.ts                ← Supabase Storage helpers
├── stores/
│   ├── authStore.ts              ← Zustand auth state
│   └── notificationStore.ts
├── types/
│   ├── database.types.ts         ← Generated from Supabase
│   └── app.types.ts
├── constants/
│   ├── colors.ts                 ← Brand colour palette
│   ├── fonts.ts
│   └── config.ts
├── hooks/
│   ├── useDogs.ts
│   ├── useApplications.ts
│   └── useNotifications.ts
└── supabase/
    ├── migrations/               ← SQL migration files
    └── functions/                ← Edge Functions
        ├── send-email/
        ├── send-whatsapp/
        └── send-push/
```

---

## 12. SECURITY REQUIREMENTS

- All Supabase tables must have RLS enabled — no exceptions
- JWT stored in `expo-secure-store` only
- No sensitive data in URL params or AsyncStorage
- Admin routes protected by both client-side role check AND Supabase RLS
- File uploads validated for type and size before storage
- Input sanitised and validated with Zod on every form
- Audit log table for admin actions (future)
- Supabase API keys stored in `.env` — never hardcoded

---

## 13. DEVELOPMENT PHASES FOR CURSOR

Build in this exact order — do not skip phases:

### Phase 1 — Project Setup
- Expo + TypeScript + NativeWind + Expo Router
- Supabase client configured
- Environment variables set up
- Brand colours and fonts configured
- Base navigation structure (public / portal / admin)

### Phase 2 — Database & Auth
- All tables created via migrations
- RLS policies applied
- Auth flow: register, login, email verify, logout
- User role assignment

### Phase 3 — Public Area
- Home screen
- Dogs listing + individual dog profile
- Puppies listing
- Expected litters
- Gallery
- Testimonials
- FAQ
- Contact screen
- Apply screen (form)

### Phase 4 — Client Portal
- Portal dashboard
- Reservation tracker
- Documents screen
- Vaccination records
- Notifications screen
- Profile screen

### Phase 5 — Admin Panel
- Admin dashboard
- Dog management (add/edit/delete)
- Application review
- Client management
- Waiting list
- Notification sender

### Phase 6 — Notifications
- Expo push notification setup
- Email via Resend (Edge Functions)
- WhatsApp Business API integration

### Phase 7 — Polish & Testing
- Animations (react-native-reanimated)
- Loading states and error handling
- Empty states
- Image optimisation
- Performance audit
- E2E testing with Detox

### Phase 8 — Deployment
- EAS Build configuration
- App Store (iOS) submission prep
- Google Play (Android) submission prep
- Supabase production environment setup

---

## 14. CODING RULES

- Maximum 300 lines per file — split into components if longer
- Every component in its own file
- TypeScript strict mode — no `any` types
- Comment all non-obvious logic
- Use named exports, not default exports for components
- All API calls through custom hooks (`useDogs`, `useApplications`, etc.)
- No inline styles — use NativeWind classes only
- Error boundaries on all major screens
- Loading skeletons, not spinners where possible

---

## 15. BRAND VOICE (for all in-app copy)

- Tone: Confident, authoritative, premium — never boastful
- Do not use: "attack dog", "vicious", "killer", "punishment"
- Do use: "elite", "precision bred", "professionally trained", "scenario-based", "balanced methodology"
- Every Dobermann is referred to by name once assigned
- Product tiers:
  - **Standard Puppies** — quality entry point
  - **Elite Developed Puppies** — 6-month in-kennel programme, personal delivery and handover
  - **Elite Family Protection Dogs** — fully trained, scenario-proofed, personal delivery and handover

---

## 16. ENVIRONMENT VARIABLES REQUIRED

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # Edge Functions only — never exposed to client
RESEND_API_KEY=                    # Email
WHATSAPP_API_KEY=                  # WhatsApp Business API
EXPO_PUSH_ACCESS_TOKEN=            # Expo push (if using enhanced access)
```

---

## 17. START HERE — FIRST COMMAND FOR CURSOR

Run this to initialise the project:

```bash
npx create-expo-app@latest diedericks-dobermanns --template blank-typescript
cd diedericks-dobermanns
npx expo install expo-router nativewind tailwindcss react-native-reanimated expo-secure-store zustand react-hook-form zod @supabase/supabase-js expo-image expo-av expo-document-picker expo-image-picker
```

Then read Phase 1 above and begin.

---

*Document version: 1.0 | Created: June 2026 | Project: Diedericks Dobermanns Mobile App*
