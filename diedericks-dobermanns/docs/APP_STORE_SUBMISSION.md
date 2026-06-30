# App Store submission — Diedericks Dobermanns

Use this checklist before submitting to Apple App Store Connect and Google Play.

## Pre-build

- [ ] Legal pages live: `https://www.diedericksdobermanns.com/privacy-policy` and `/terms`
- [ ] Migrations 0029–0031 applied to production Supabase
- [ ] Edge functions deployed (`notify`, `send-email`, `send-push`, `send-welcome-email`, `create-payfast-payment`, `payfast-itn`)
- [ ] `EXPO_PUBLIC_*` env vars set in EAS (Supabase URL, anon key, PayFast merchant id/key)
- [ ] Demo admin + client accounts created for App Review

## EAS production build

```bash
cd diedericks-dobermanns
eas build --profile production --platform ios
eas build --profile production --platform android
```

## TestFlight (iOS)

```bash
eas submit --profile production --platform ios
```

1. Add internal testers in App Store Connect
2. Complete TestFlight QA: sign-up, apply, portal, training videos, notifications
3. Fix any crashes before external testing

## Screenshots (required sizes)

Capture from iOS simulator or device:

| Device | Size |
|--------|------|
| iPhone 6.7" | 1290 × 2796 |
| iPhone 6.5" | 1284 × 2778 |
| iPad Pro 12.9" | 2048 × 2732 |

Suggested screens: Home/marketing, Apply form, Client portal dashboard, Training library, Admin kennel (optional for review notes).

Store under `store-assets/screenshots/` (create before submission).

## App Store Connect metadata

| Field | Value |
|-------|-------|
| Name | Diedericks Dobermanns |
| Subtitle | Kennel & Client Portal |
| Category | Lifestyle |
| Privacy URL | https://www.diedericksdobermanns.com/privacy-policy |
| Support URL | https://www.diedericksdobermanns.com/contact |
| Copyright | © 2026 Diedericks Dobermanns |

**Review notes:** Provide demo login (client + admin). Mention app is a private kennel CRM for existing clients; public apply flow does not require login.

## Google Play

- Upload AAB from EAS production Android build
- Complete Data safety form (align with `PrivacyInfo.xcprivacy` and privacy policy)
- Content rating questionnaire

## Post-launch

- Enable `EXPO_PUBLIC_SENTRY_DSN` in EAS for crash reporting
- Monitor EAS Insights / App Store Connect analytics
