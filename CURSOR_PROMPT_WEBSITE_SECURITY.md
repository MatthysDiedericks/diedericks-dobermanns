# CURSOR PROMPT — Website Security Headers + Rate Limiting

## Context

**Project:** Diedericks Dobermanns public website
**Folder:** `diedericksdobermann-web/`
**Framework:** Next.js 15 App Router, TypeScript
**Goal:** Add security headers and rate limiting to protect the website

---

## STEP 1 — Add Security Headers to `next.config.ts`

Update `diedericksdobermann-web/next.config.ts` to include security headers on every response:

```ts
import type { NextConfig } from 'next'

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://nlmwxodvquwbjinhhbmr.supabase.co https://*.supabase.co",
      "media-src 'self' https://nlmwxodvquwbjinhhbmr.supabase.co https://*.supabase.co",
      "connect-src 'self' https://nlmwxodvquwbjinhhbmr.supabase.co https://*.supabase.co",
      "frame-ancestors 'none'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nlmwxodvquwbjinhhbmr.supabase.co',
      },
    ],
  },
}

export default nextConfig
```

---

## STEP 2 — Create a Rate Limiter Utility

Create `diedericksdobermann-web/lib/rate-limit.ts`:

```ts
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

interface RateLimitOptions {
  maxRequests: number   // max requests allowed
  windowMs: number      // time window in milliseconds
}

export function rateLimit(
  identifier: string,
  options: RateLimitOptions = { maxRequests: 5, windowMs: 60_000 }
): { success: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(identifier)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + options.windowMs,
    })
    return { success: true, remaining: options.maxRequests - 1 }
  }

  if (entry.count >= options.maxRequests) {
    return { success: false, remaining: 0 }
  }

  entry.count++
  return { success: true, remaining: options.maxRequests - entry.count }
}
```

---

## STEP 3 — Protect the Contact Form API Route

Create or update `diedericksdobermann-web/app/api/contact/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limit: 5 submissions per IP per minute
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const limit = rateLimit(`contact:${ip}`, { maxRequests: 5, windowMs: 60_000 })

  if (!limit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 }
    )
  }

  const body = await request.json()
  const { name, email, phone, message, subject } = body

  // Validate required fields
  if (!name || !email || !message) {
    return NextResponse.json(
      { error: 'Name, email, and message are required.' },
      { status: 400 }
    )
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: 'Please provide a valid email address.' },
      { status: 400 }
    )
  }

  // Sanitize inputs (trim whitespace, limit length)
  const sanitized = {
    name: String(name).trim().slice(0, 100),
    email: String(email).trim().toLowerCase().slice(0, 200),
    phone: phone ? String(phone).trim().slice(0, 20) : null,
    subject: subject ? String(subject).trim().slice(0, 200) : 'Website Enquiry',
    message: String(message).trim().slice(0, 2000),
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('enquiries').insert(sanitized)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
```

---

## STEP 4 — Protect the Application Form API Route

Create or update `diedericksdobermann-web/app/api/apply/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limit: 3 applications per IP per hour (stricter — applications are longer)
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const limit = rateLimit(`apply:${ip}`, { maxRequests: 3, windowMs: 3_600_000 })

  if (!limit.success) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again in an hour.' },
      { status: 429 }
    )
  }

  const body = await request.json()

  // Validate required fields
  const required = ['first_name', 'last_name', 'email', 'phone']
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json(
        { error: `${field} is required.` },
        { status: 400 }
      )
    }
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(body.email)) {
    return NextResponse.json(
      { error: 'Please provide a valid email address.' },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('applications').insert({
      ...body,
      status: 'pending',
      submitted_at: new Date().toISOString(),
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Application form error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
```

---

## STEP 5 — Add a `middleware.ts` for extra protection

Create `diedericksdobermann-web/middleware.ts`:

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Block requests with suspicious user agents (basic bot protection)
  const userAgent = request.headers.get('user-agent') ?? ''
  const blockedAgents = ['sqlmap', 'nikto', 'nmap', 'masscan']
  if (blockedAgents.some((agent) => userAgent.toLowerCase().includes(agent))) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Add cache control for API routes (no caching)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

---

## Testing Checklist

- [ ] Visit the website — all pages load normally
- [ ] Submit the contact form — check it saves to Supabase `enquiries` table
- [ ] Submit the contact form 6 times quickly — 6th attempt should return "Too many requests"
- [ ] Check browser DevTools → Network → any page → Response Headers — should show `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`
- [ ] Application form validates and rejects missing required fields
- [ ] No console errors in browser
