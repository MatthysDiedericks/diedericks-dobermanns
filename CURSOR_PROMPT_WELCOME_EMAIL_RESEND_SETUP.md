# CURSOR PROMPT — Welcome Email: Resend Setup

## What Was Already Done

The following is ALREADY complete — do NOT recreate it:

- ✅ Supabase Edge Function `send-welcome-email` is deployed and active
- ✅ Database trigger `on_new_user_send_welcome_email` on `public.users` fires on every INSERT
- ✅ The trigger calls the edge function via pg_net HTTP POST
- ✅ The edge function fetches the user's email from `auth.users` and sends the branded welcome email via Resend

---

## What Still Needs To Be Done

### Step 1 — Sign Up for Resend

Go to https://resend.com and create a free account.

### Step 2 — Add Your Domain

In the Resend dashboard:
1. Go to **Domains** → **Add Domain**
2. Add `diedericksdobermanns.com`
3. Add the DNS records Resend gives you to your domain registrar
4. Wait for verification (usually under 10 minutes)

> Until the domain is verified, you can test by sending to your own email using the sandbox mode (from `onboarding@resend.dev`)

### Step 3 — Get Your API Key

In Resend dashboard → **API Keys** → **Create API Key**
- Name it: `Diedericks Dobermanns App`
- Permission: **Sending access**
- Copy the key (starts with `re_`)

### Step 4 — Add the Key to Supabase

Go to your Supabase project → **Project Settings** → **Edge Functions** → **Secrets**

Add the following secret:

| Name | Value |
|------|-------|
| `RESEND_API_KEY` | `re_xxxxxxxxxxxxxxxxxxxx` (your key from Step 3) |

### Step 5 — Update the From Email (When Domain is Verified)

The edge function currently sends from:
```
welcome@diedericksdobermanns.com
```

This will work once the domain is verified in Resend. No code changes needed.

### Step 6 — Test It

Create a new account in the app. Within a few seconds, the welcome email should arrive in that inbox.

To debug if it doesn't arrive:
1. Supabase Dashboard → **Edge Functions** → `send-welcome-email` → **Logs**
2. Check for any errors — common issues: `RESEND_API_KEY` not set, domain not verified

---

## File Reference

Edge function code is at:
`supabase/functions/send-welcome-email/index.ts`

The email template is built inline in that function — search for `buildWelcomeEmail` to edit the content.

---

## Notes for Cursor

- Do NOT touch the trigger SQL — it is already deployed
- Do NOT recreate the edge function — it is already deployed
- This prompt is purely about connecting the Resend API key
- Once the secret is added, the system is fully automated — no further changes needed
