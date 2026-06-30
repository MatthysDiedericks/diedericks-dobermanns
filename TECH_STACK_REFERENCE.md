# Diedericks Dobermanns — Full Tech Stack Reference

**Last updated:** 24 June 2026

---

## Mobile App
| What | Tool |
|------|------|
| Framework | React Native + Expo SDK 56 |
| Language | TypeScript (strict mode) |
| Navigation | Expo Router (file-based, like Next.js) |
| Styling | NativeWind (Tailwind CSS for React Native) |
| Build & publish | Expo EAS Build → Apple App Store + Google Play |

## Website (public-facing)
| What | Tool |
|------|------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| Hosting | Vercel (auto-deploys from GitHub) |

## Backend
| What | Tool |
|------|------|
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth |
| File storage | Supabase Storage (photos, videos, documents) |
| Server logic | Supabase Edge Functions (Deno) |
| Security | Row Level Security (RLS) on every table |

## DevOps & Deployment
| What | Tool |
|------|------|
| Source control | GitHub (private repo) |
| Website deployment | Vercel — auto-deploys on every GitHub push |
| Mobile build | Expo EAS Build — builds iOS .ipa + Android .apk |
| Mobile distribution | Apple App Store + Google Play Store |
| Secrets management | .env.local (never committed to GitHub) |

## Notifications
| What | Tool |
|------|------|
| Push notifications | Expo Push Notifications + Firebase |

## Payments (ready, not built yet)
| What | Tool |
|------|------|
| Payments | Stripe (via Supabase Edge Function — never client-side) |

## Future AI Features
| What | Tool |
|------|------|
| AI chatbot / recommendations | OpenAI API or Claude API |
| Document search | OpenAI Embeddings + Supabase pgvector |

---

## Why This Stack

- **One language (TypeScript)** across mobile, website, and backend — same skills everywhere
- **Supabase replaces an entire backend team** — handles auth, database, storage and APIs in one place
- **GitHub + Vercel** = automatic deployments — push code, website updates in 60 seconds
- **Expo EAS** = submit to App Store and Google Play without needing a Mac
- **NativeWind** = same Tailwind classes on mobile and web — consistent styling
- **PostgreSQL** = production-grade database that scales to millions of users

---

## Key Config

| Item | Value |
|------|-------|
| Supabase project ID | nlmwxodvquwbjinhhbmr |
| Supabase URL | https://nlmwxodvquwbjinhhbmr.supabase.co |
| App bundle ID (iOS) | com.diedericksdobermanns.app |
| App package (Android) | com.diedericksdobermanns.app |
| Brand background | #111008 |
| Brand gold | #C4A35A |

---

## Folder Structure

```
diedericksdobermann App/          ← project root
  diedericks-dobermanns/          ← mobile app (React Native)
  diedericksdobermann-web/        ← website (Next.js)
  scripts/                        ← upload and utility scripts
  CURSOR_PROMPT_*.md              ← all Cursor build prompts
  TECH_STACK_REFERENCE.md         ← this file
```
