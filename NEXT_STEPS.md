# NEXT STEPS — Diedericks Dobermanns
*Last updated: 23 June 2026*

---

## Completed (code in repo)

These items from earlier prompts are **done** — no need to re-run the Cursor prompts:

- Invoice/creditors/letterhead, expense VAT/allocation, training video library, booking detail fix, calendar integration
- App Store hardening (`app.json`, `PrivacyInfo.xcprivacy`, legal links, security audit)
- Trainer portal (all screens + migration `0030_trainer_rls.sql`)
- Document sheet fix, finance budget/import, trial mating planner
- Application submission fix (enquiry + notification, migration `0029`)
- Portal training video hidden routes
- Website: `/privacy-policy`, app vs sale terms split, 6-step application form
- Waitlist Kanban + list views with pipeline stages
- PayFast payment integration (edge functions + video bundle checkout)
- `send-welcome-email` edge function in repo
- Storage bucket docs (`docs/STORAGE_BUCKETS.md`), Supabase ops (`docs/SUPABASE_OPS.md`)
- App Store submission checklist (`docs/APP_STORE_SUBMISSION.md`)

---

## Priority 1 — Deploy & verify (manual)

### 1. Apply migrations on live Supabase

Migrations **0029–0031** must be applied if not already:

```bash
cd diedericks-dobermanns
supabase db push
```

See [`docs/SUPABASE_OPS.md`](diedericks-dobermanns/docs/SUPABASE_OPS.md) for secrets and function deploy commands.

### 2. Publish website

Deploy `diedericksdobermann-web` to Vercel. Verify:

- https://www.diedericksdobermanns.com/privacy-policy
- https://www.diedericksdobermanns.com/terms (app T&C)
- https://www.diedericksdobermanns.com/terms-of-sale
- `/apply` — 6-step form submits successfully

### 3. Configure PayFast

Set Supabase secrets (`PAYFAST_*`) and app env (`EXPO_PUBLIC_PAYFAST_MERCHANT_ID`, `EXPO_PUBLIC_PAYFAST_MERCHANT_KEY`). Register ITN URL in PayFast dashboard.

### 4. App Store submission

Follow [`docs/APP_STORE_SUBMISSION.md`](diedericks-dobermanns/docs/APP_STORE_SUBMISSION.md):

```bash
eas build --profile production --platform all
eas submit --profile production --platform ios
```

---

## Priority 2 — Remaining product gaps

| Item | Notes |
|------|-------|
| Two-way client messaging | Messages tab is broadcast inbox only |
| Litter detail Calendar/Contracts tabs | Still "coming soon" |
| Admin gallery upload CMS | List/approve only |
| Peach Payments | PayFast implemented; add Peach if required for specific merchant |
| AI features | Puppy recommendations, training assistant — backlog |
| Push notification cron | Scheduled broadcasts need dispatcher |
| Welcome email DB trigger | Optional auth hook — function source is in repo |

---

## Priority 3 — Security & monitoring

- [ ] Rotate service role key if ever exposed
- [ ] Enable email confirmation + PITR on Supabase production
- [ ] Set `EXPO_PUBLIC_SENTRY_DSN` and install `@sentry/react-native`
- [ ] Full RLS audit before public launch

---

## Quick commands

```bash
# Mobile typecheck
cd diedericks-dobermanns && npm run typecheck

# Production build
npm run build:prod

# Deploy all edge functions
npm run deploy:functions
```
