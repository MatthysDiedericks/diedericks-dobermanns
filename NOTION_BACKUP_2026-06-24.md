# Diedericks Dobermanns App — Project Backup
**Date:** 24 June 2026
**Saved by:** Claude (Cowork)

---

## What We're Building

A premium mobile app (iOS + Android) for Diedericks Dobermanns — an elite Dobermann breeding and protection dog training business. The app serves as a public showcase, client portal, and internal management system.

**Stack:** React Native · Expo SDK 56 · TypeScript · Supabase · NativeWind
**Workspace:** `C:\Users\mathy\OneDrive\Documents\Claude\Projects\diedericksdobermann App`

---

## Supabase Project

- **Project ID:** nlmwxodvquwbjinhhbmr
- **URL:** https://nlmwxodvquwbjinhhbmr.supabase.co
- **App folder:** `diedericks-dobermanns\`
- **Website folder:** `diedericksdobermann-web\`
- **Service role key:** stored in `diedericksdobermann-web\.env.local` — NEVER in client code

---

## Brand

| Token | Value |
|-------|-------|
| Background | #111008 |
| Surface | #1C1A0E |
| Gold | #C4A35A |
| Text | #F5F0E8 |
| Heading font | Cinzel |
| Body font | Lato |

---

## Database Tables (all with RLS)

### Core
- `users` — roles: visitor, client, trainer, admin, super_admin
- `dogs` — 27 profiles loaded
- `dog_media` — photos/videos per dog
- `litters` — breeding litters
- `heat_cycles` — heat tracking with progesterone data

### Health
- `vaccinations` · `vet_visits` · `deworming_records`
- `dog_shows` *(new)*
- `medical_conditions` *(new)*
- `weight_logs` *(new — used for both adult dogs and puppy daily weights)*
- `health_tests` *(new)*

### New columns on dogs table (added 2026-06-24)
`call_name` · `coat_type` · `height_cm` · `ear_type` · `eye_colour` · `tattoo_number` · `passport_number` · `dna_number` · `insurance_number` · `registration_type` · `location` · `is_spayed_neutered` · `wrights_coi`

### Business
- `applications` · `waiting_list` · `waiting_list_types` · `reservations`
- `contracts` · `contract_templates` · `kennel_documents`
- `contacts` · `client_groups` · `client_group_members`
- `invoices` · `invoice_items` · `invoice_payments` · `expenses` · `expense_categories` · `finance_summary`
- `training_bookings` · `training_session_types` · `training_logs` · `training_availability` · `training_booking_media`

### Content
- `gallery_items` · `testimonials` · `faq` · `achievements`
- `broadcast_messages` · `notifications_log` · `app_settings`
- `todo_items` · `enquiries`

---

## Dog Profiles in Supabase (27 dogs)

| Group | Dogs |
|-------|------|
| Active females | Cendra, Hailey, Claire, Cyrus, Cleopatra, Hannah, Odessa |
| Active studs | HunterKing, Hugo, Santini |
| Deceased | Celsea, Cuba, Cait, Chester |
| Sold (public=true) | Shanti, Ade, Bliksem, Boomer, Dexter, Eben, Hazel, Liv, Loki, Miles, Raptor, Zara, Zues |

---

## Supabase Storage Buckets

| Bucket | Access | Path pattern |
|--------|--------|-------------|
| dog-media | Public | `dogs/{dog_id}/{filename}.jpg` |
| gallery | Public | `{category}/{filename}.jpg` |
| documents | Private | `documents/` |

**Photo source on desktop:** `C:\Users\mathy\OneDrive\Desktop\Dobermann Photo's`
**Sold dog photos:** `C:\Users\mathy\OneDrive\Desktop\Dobermann Photo's\Sold`

---

## Cursor Prompt Files

All saved in project root: `C:\Users\mathy\OneDrive\Documents\Claude\Projects\diedericksdobermann App\`

| File | Purpose | Status |
|------|---------|--------|
| CURSOR_PROMPT_MASTER.md | Initial full app architecture | ✅ Done |
| CURSOR_PROMPT_AUTH_AND_PHOTOS.md | Login, forgot password, photo management | ✅ Done |
| CURSOR_PROMPT_CODE_QUALITY_FIX.md | TypeScript fixes, error handling, performance | ✅ Done |
| CURSOR_PROMPT_DASHBOARD_AND_ALL_SCREENS.md | All admin screens | ✅ Done |
| CURSOR_PROMPT_WEBSITE_SYNC.md | Public website (Next.js) | ⏳ Pending |
| **CURSOR_PROMPT_DOG_DETAIL_FULL.md** | Dog Detail tabs + Litter Puppy Weights | **▶ NEXT** |

---

## What CURSOR_PROMPT_DOG_DETAIL_FULL.md Builds

This is the next prompt to run in Cursor. It builds a complete dog management system matching DogBreederPro:

**Dog Detail Admin Screen — tabbed:**
1. **Overview** — all dog fields (identifiers, physical, genetics, status)
2. **Health** — vaccinations, vet visits, health tests, medical conditions, weight log
3. **Breeding** — heat cycles, litter history, stats
4. **Shows** — show entries and awards
5. **Documents/Gallery** — links to existing screens

**Litter Detail — new Weights tab:**
- Daily puppy weight entry (date + kg per puppy)
- Weight history per puppy with delete
- Growth chart (one line per puppy over time)
- Display format: 1.129 kg → "1 kg 129 g"

---

## Pending Actions (in order)

1. **Run photo upload** — open Cursor Terminal → `node scripts/upload-all-breeding-dogs.mjs`
2. **Run gallery upload** — `node scripts/upload-gallery.mjs`
3. **Mark featured dogs** — Supabase → dogs table → set `is_featured = true` for HunterKing, Cendra, Cleopatra, Hugo
4. **Run CURSOR_PROMPT_DOG_DETAIL_FULL.md** in Cursor
5. **Save logo** — ChatGPT Dobermann logo → `diedericks-dobermanns/assets/images/logo.png`
6. **Run CURSOR_PROMPT_WEBSITE_SYNC.md** in Cursor (open diedericksdobermann-web folder)
7. **Rotate Supabase service role key** — Supabase Dashboard → Settings → API → Regenerate

---

## App Screens Built

### Public (no login)
Home · Dogs · Dog Detail · About · Gallery · Testimonials · Contact · FAQ · Achievements · Apply · Training Philosophy · Breeding Stock · Litters · Puppies · Privacy · Terms

### Admin
Dashboard · Dogs (list/new/edit/photos/pedigree/story) · Litters (list/new/edit/detail) · Applications · Clients · Client Groups · Training · Heats · Finance (dashboard/invoices/expenses/reports) · Waiting List · Contracts · Documents · Gallery · Testimonials · FAQ · Analytics · Todos · Notifications · Broadcast · Marketing · Enquiries · Quotes · Settings

### Client Portal
Add Photos · Training Updates

---

## Known Fixes Applied

| Bug | Fix |
|-----|-----|
| `STATUS_MAP[status] is undefined` | Added all 10 statuses to DogStatusBadge.tsx |
| `dog_media_type_check` constraint | Type must be `'photo'` or `'video'` (not `'image'`) |
| Expo Go incompatible with SDK 56 | Use `npx expo start --web` for browser testing |
| Sold dogs showing as HIDDEN | Updated all 13 sold dogs: `is_public = true` |
| Shanti moved to Sold folder | Added `baseFolder: PHOTO_BASE_SOLD` override in upload script |

---

## How to Test the App (Browser)

In Cursor Terminal (Terminal → New Terminal):
```
cd "C:\Users\mathy\OneDrive\Documents\Claude\Projects\diedericksdobermann App\diedericks-dobermanns"
npx expo start --web
```
Then open `http://localhost:8081` in Firefox or Edge.
Firefox: `Ctrl+Shift+M` for mobile view. Edge: `F12` → phone icon.
