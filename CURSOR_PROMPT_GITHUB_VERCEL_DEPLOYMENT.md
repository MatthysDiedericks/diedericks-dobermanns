# CURSOR PROMPT — GitHub + Vercel + EAS Deployment Setup

## Context

**Project:** Diedericks Dobermanns mobile app + website
**Mobile app folder:** `diedericks-dobermanns/`
**Website folder:** `diedericksdobermann-web/`
**Stack:** React Native (Expo SDK 56), Next.js 15, Supabase
**Goal:** Set up proper source control (GitHub) and automatic deployment (Vercel for website, EAS for mobile)

---

## Prerequisites (Matt does these manually before running this prompt)

1. Create a free account at https://github.com if you don't have one
2. Create a new **private** repository called `diedericks-dobermanns` on GitHub
3. Create a free account at https://vercel.com (sign in with GitHub)
4. Create a free account at https://expo.dev (for EAS builds)

---

## STEP 1 — Create `.gitignore` files

### Root `.gitignore` (project root — covers everything)

Create `C:\Users\mathy\OneDrive\Documents\Claude\Projects\diedericksdobermann App\.gitignore`:

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Environment files — NEVER commit these
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
*.env

# Expo / React Native
.expo/
dist/
web-build/
ios/
android/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*

# Next.js
.next/
out/

# Build outputs
build/
.cache/

# OS files
.DS_Store
.DS_Store?
._*
Thumbs.db

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# TypeScript
*.tsbuildinfo

# Supabase local
supabase/.branches
supabase/.temp
```

---

## STEP 2 — Initialise Git and push to GitHub

Run these commands in the Cursor terminal from the project root (`diedericksdobermann App` folder):

```bash
git init
git add .
git commit -m "feat: initial commit — Diedericks Dobermanns app"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/diedericks-dobermanns.git
git push -u origin main
```

Replace `YOUR_GITHUB_USERNAME` with Matt's actual GitHub username.

**Verify:** Go to https://github.com/YOUR_GITHUB_USERNAME/diedericks-dobermanns — you should see all the files.

---

## STEP 3 — Set up Vercel for the website

1. Go to https://vercel.com → "Add New Project"
2. Import the `diedericks-dobermanns` GitHub repository
3. **IMPORTANT** — Set the root directory to `diedericksdobermann-web` (not the project root)
4. Framework: Next.js (Vercel auto-detects this)
5. Add environment variables (from `diedericksdobermann-web/.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL` = https://nlmwxodvquwbjinhhbmr.supabase.co
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your anon key)
   - `SUPABASE_SERVICE_ROLE_KEY` = (your service role key — Vercel keeps this secret)
6. Click Deploy

**After setup:** Every time you push to GitHub main branch → Vercel automatically redeploys the website within 60 seconds.

---

## STEP 4 — Add a `vercel.json` to the website folder

Create `diedericksdobermann-web/vercel.json`:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "regions": ["cpt1"]
}
```

`cpt1` = Cape Town region (closest to Eswatini for fast load times).

---

## STEP 5 — Set up Expo EAS for mobile builds

### 5a — Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

Log in with your Expo account credentials.

### 5b — Configure EAS in the mobile app

Run from inside the `diedericks-dobermanns/` folder:

```bash
cd diedericks-dobermanns
eas build:configure
```

This creates `eas.json`. Accept all defaults.

### 5c — Create `eas.json`

If not auto-created, create `diedericks-dobermanns/eas.json`:

```json
{
  "cli": {
    "version": ">= 7.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 5d — Update `app.json` in the mobile app

Make sure `diedericks-dobermanns/app.json` has:

```json
{
  "expo": {
    "name": "Diedericks Dobermanns",
    "slug": "diedericks-dobermanns",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "diedericksdobermanns",
    "userInterfaceStyle": "dark",
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.diedericksdobermanns.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#111008"
      },
      "package": "com.diedericksdobermanns.app"
    },
    "extra": {
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    }
  }
}
```

Replace `YOUR_EAS_PROJECT_ID` with the ID shown after running `eas build:configure`.

---

## STEP 6 — Set up environment variables for EAS builds

EAS needs the Supabase keys during the build. Run:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://nlmwxodvquwbjinhhbmr.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_ANON_KEY"
```

Never add the service role key here — it stays server-side only.

---

## STEP 7 — Set up a GitHub Actions workflow for CI

Create `.github/workflows/ci.yml` in the project root:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  typecheck-mobile:
    name: TypeScript check (mobile)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: diedericks-dobermanns
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: diedericks-dobermanns/package-lock.json
      - run: npm ci
      - run: npx tsc --noEmit

  typecheck-web:
    name: TypeScript check (website)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: diedericksdobermann-web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: diedericksdobermann-web/package-lock.json
      - run: npm ci
      - run: npx tsc --noEmit
```

This automatically checks for TypeScript errors on every push to GitHub. If there are errors, GitHub shows a red ✗ before you deploy.

---

## STEP 8 — Daily workflow after setup

Going forward, the workflow is:

```bash
# Make changes in Cursor
# Then commit and push:
git add .
git commit -m "feat: describe what you changed"
git push
```

That's it. GitHub receives the code → Vercel rebuilds the website automatically → website is live in ~60 seconds.

For a new mobile build (to send to testers):
```bash
cd diedericks-dobermanns
eas build --platform all --profile preview
```
EAS sends you a download link for the .apk (Android) and .ipa (iOS).

---

## Testing Checklist

- [ ] `git status` shows clean (nothing uncommitted)
- [ ] GitHub repo shows all project files at github.com/YOUR_USERNAME/diedericks-dobermanns
- [ ] `.env.local` does NOT appear in GitHub (confirm it's gitignored)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` does NOT appear anywhere in GitHub
- [ ] Vercel dashboard shows a successful deployment
- [ ] Website loads at the Vercel URL (yourproject.vercel.app)
- [ ] EAS project shows at expo.dev/accounts/YOUR_USERNAME/projects/diedericks-dobermanns
- [ ] GitHub Actions shows green ✓ on the latest push (TypeScript clean)

---

## Critical Security Checks

- `.env.local` must be in `.gitignore` — verify before first push
- Run `git log --all --full-history -- "**/.env*"` — if any .env files appear in history, they must be purged
- `SUPABASE_SERVICE_ROLE_KEY` only lives in: `.env.local` (local), Vercel environment variables (website), Supabase dashboard
- Never in: source code, GitHub, EAS secrets, `app.json`, or any EXPO_PUBLIC_ variable
