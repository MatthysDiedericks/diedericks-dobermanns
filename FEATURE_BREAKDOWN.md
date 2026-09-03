# Diedericks Dobermanns — platform feature breakdown

State as at **31 August 2026**. Verified against the live Supabase project `nlmwxodvquwbjinhhbmr`
and the live domain, not against the repos.

## Shape of the system

One PostgreSQL database serves two front ends:

| Surface | Repo | Stack |
|---|---|---|
| Website + admin + client portal | `diedericksdobermann-web` | Next.js 15 App Router, TypeScript, Tailwind v4 |
| Mobile app (admin, trainer, portal) | `diedericks-dobermanns` | Expo SDK 56, Expo Router, NativeWind |

Backend is Supabase throughout: Postgres with row-level security, Auth, Storage, and 14 Edge
Functions. **Both repos carry the full migration folder for the one database** — 144 files, kept
byte-identical. Website deploys on Vercel to `diedericksdobermanns.com` via the project
`diedericksdobermanns-web-v145`; three other Vercel projects build the same repo and are **not**
bound to the domain.

Brand: `#111008` background, `#1C1A0E` surface, `#C4A35A` gold, `#F5F0E8` text. Cinzel headings,
Lato body. Currency ZAR. **Not VAT registered.**

---

## 1. Public website

Home (hero, who we are, featured dogs), Our Dogs, Training Philosophy, Gallery, Achievements,
Testimonials, FAQ, Contact, Location, Litter announcement pages, Puppy/litter public pages.

Gallery categories are database-constrained: puppies, elite_pups, protection_dogs, planned_litters,
litter_announcements, competition, training, kennel, family.

Privacy-first page-view counter; no third-party analytics.

## 2. Applications and intake

Multi-step application form (personal, address, experience, pets, home, children, security needs,
purpose, references, vet, documents, terms). SA provinces + country picker. Child-safety prompt.
Reference code per application. Confirmation email to the applicant on submit. Daily cron alerting
Matt to unactioned applications. Admin review workflow with statuses, review notes, versions and
amendment RPCs. ID validation.

## 3. Quotes → invoices → payments

- Quote builder (web + app), catalogue-driven line items, revisions with change notes, validity
  window, accept/decline by the client, delivery decision.
- Quote types (`dog_sale` / `training` / `board_train` / `stud_fee` / `other`) added 31 Aug —
  currently all 17 quotes are `dog_sale`.
- Branded dark PDF (`buildQuotePdf.ts`) with crest letterhead. This is the house document style
  everything else must match.
- Invoices with generated `amount_outstanding`, payments ledger, proof-of-payment upload and
  approval, statements, creditors, expenses (with recurring), budgets, cash-flow views, Excel/PDF
  export.
- **Recurring invoices** (added 31 Aug): schedules generate **drafts only** and notify Matt —
  never auto-send.
- 168 invoices live: 163 dog_sale, 3 other, 2 board_train. 38 were imported from the legacy
  invoice app on 31 Aug.

## 4. Dogs, litters, breeding

Dog profiles: identity, registration, microchip, DNA, colour, measurements, temperament, health,
genetics (DCM), media, documents, timeline. Status/category drives which screens list a dog;
deceased dogs are excluded from operational lists but retained in pedigree and litter history.

Litters: whelping tracker, weight logs against a litter-size-adjusted benchmark curve, health
records, puppy allocation, buyer groups.

Breeding: heat cycles with forecasting and whelp-date basis (ovulation vs mating), pairing builder,
trial matings, `evaluate_pairing` COI RPC, breeding stock lists, organogram, lineage RPCs.

Pedigree: `pedigree_ancestors` holds imported registry pedigrees — 346 rows across 13 dogs, max
depth 4 generations, 131 distinct ancestors, and **only 1 row links to a dog we own**. Rebranded to
a gold certificate with a generation selector and per-dog pedigree photo on 31 Aug;
`ancestor_photos` exists but is **empty** — the photos still need importing from DogBreederPro.

## 5. Client portal

Login (password, 6-digit code, magic link), 7-day invites, `claim_my_records()` which retro-links
applications, quotes, invoices, contracts and waitlist entries to an account by email.

Client sees: their dogs, health schedule, vaccination records, documents, contracts (with
clause-level acknowledgement and audit trail), invoices, quotes, reservation, waiting list,
messages, notifications, training bookings, guides and videos, puppy tracker, expected litters,
owner photo uploads (3 per 4-month window, RLS-enforced), health-change and death reporting.

**Guest access** (added 31 Aug): an account holder may add up to two household members. Financial
visibility is off by default; guests can never sign contracts. `portal_members` is currently empty.

## 6. Training

Session types, availability, bookings, video rooms, trainer portal, training journey timeline for
elite-tier dogs, video library with access tiers (private bucket, signed URLs), guides.

## 7. Admin

Dashboard, contacts CRM with dedupe, client groups, marketing campaigns with consent and
unsubscribe tokens, document management with expiry reminders, handover packs (pdf-lib, section
picker, email), gallery and content management, settings, audit log viewer, error events with
digest and alerting, rate limiting, backups.

## 8. Roles

`visitor` → `client` → `trainer` → `admin` → `super_admin`. Enforced by RLS via `is_admin()` and
`is_trainer_or_above()`. Self-escalation is blocked at the database.

---

## Known gaps as at 31 Aug 2026

1. **121 sold dogs have no `owner_id`** — only 2 of 130 link to a portal account. Blocks the portal
   from being useful to most past buyers.
2. **`ancestor_photos` is empty** — needs the DogBreederPro import.
3. **95 contacts have an email and no account.** Five accounts exist that have never signed in.
4. **DCM genetics unpopulated** for all but Hunter-King and Hannah. Cleopatra is untested and is
   being bred.
5. Invoice numbering from the two historical imports overlaps — the DBP-sourced numbers disagree
   with the legacy app for at least Bradley Love, Marcello and Haroon.
6. Part-paid legacy invoices carry `amount_paid = 0` because the old system did not expose the
   figure.
7. 42 `dog_media` rows have no thumbnail; 67 dog documents are miscategorised as "1,2,3,4".
8. The death vet-report RLS fix (`0141`) has never been exercised — no death documents exist yet.
