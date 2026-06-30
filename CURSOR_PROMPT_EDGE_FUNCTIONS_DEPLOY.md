# CURSOR PROMPT — EDGE FUNCTIONS: WIRE + DEPLOY

## Context

App: Diedericks Dobermanns
Stack: React Native, Expo SDK 56, TypeScript strict, Expo Router, NativeWind
Supabase: nlmwxodvquwbjinhhbmr
Brand: Background #111008 | Surface #1C1A0E | Gold #C4A35A | Text #F5F0E8

Five Supabase Edge Functions already exist as complete, production-ready code in `supabase/functions/`:

| Function | Purpose | Status |
|----------|---------|--------|
| `create-video-room` | Creates Daily.co room when a training booking is confirmed | Code complete — NOT deployed |
| `send-push` | Sends Expo push notification to a device | Code complete — NOT deployed |
| `send-email` | Sends transactional email via Resend | Code complete — NOT deployed |
| `send-whatsapp` | Sends WhatsApp message via WhatsApp Business API | Code complete — NOT deployed |
| `notify` | Orchestrator — calls send-push + send-email together | Code complete — NOT deployed |

**The problem:** None of these functions have been called from the app yet. Booking confirmations don't trigger video room creation. Notifications are not sent via Edge Functions.

**This prompt wires all five functions into the app and provides the deployment commands.**

---

## PHASE 1 — Deploy All Edge Functions

Run these commands in the terminal from the project root. You need the Supabase CLI installed (`npm install -g supabase`):

```bash
# Login (only needed once)
supabase login

# Link to this project
supabase link --project-ref nlmwxodvquwbjinhhbmr

# Deploy all 5 functions
supabase functions deploy create-video-room
supabase functions deploy send-push
supabase functions deploy send-email
supabase functions deploy send-whatsapp
supabase functions deploy notify
```

**Set secrets (replace with real values from each service):**
```bash
supabase secrets set DAILY_API_KEY=your_daily_api_key
supabase secrets set RESEND_API_KEY=your_resend_api_key
supabase secrets set EXPO_PUSH_ACCESS_TOKEN=your_expo_push_token
supabase secrets set WHATSAPP_API_KEY=your_whatsapp_key
```

Note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically injected into Edge Functions — do NOT set them manually.

---

## PHASE 2 — Create Edge Function Client Utility

Create: `lib/functions.ts`

```typescript
/**
 * lib/functions.ts
 * Typed wrappers for calling Supabase Edge Functions from the mobile app.
 * All calls use the anon key — the functions themselves use the service role key server-side.
 */
import { supabase } from './supabase';

export async function callCreateVideoRoom(bookingId: string): Promise<{
  clientUrl: string;
  hostUrl: string;
}> {
  const { data, error } = await supabase.functions.invoke('create-video-room', {
    body: { bookingId },
  });
  if (error) throw new Error(error.message);
  return data as { clientUrl: string; hostUrl: string };
}

export async function callNotify(payload: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  const { error } = await supabase.functions.invoke('notify', {
    body: payload,
  });
  if (error) console.error('[callNotify]', error.message);
  // Non-blocking — notification failure must never crash the UI
}

export async function callSendEmail(payload: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const { error } = await supabase.functions.invoke('send-email', {
    body: payload,
  });
  if (error) console.error('[callSendEmail]', error.message);
}
```

---

## PHASE 3 — Wire create-video-room into Booking Confirmation

Find the admin training booking confirmation action. This is in:
`app/(admin)/training/[id]/index.tsx` or `hooks/useTraining.ts`

Find where `status` is updated to `'confirmed'`. After that update succeeds, call the Edge Function:

```typescript
import { callCreateVideoRoom } from '@/lib/functions';

// After successfully confirming a booking:
const confirmBooking = async (bookingId: string) => {
  // 1. Update status in DB
  const { error } = await supabase
    .from('training_bookings')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', bookingId);

  if (error) throw error;

  // 2. Create the video room (non-blocking — if Daily.co isn't configured yet, this fails silently)
  try {
    await callCreateVideoRoom(bookingId);
  } catch (e) {
    console.warn('[confirmBooking] Video room creation failed — Daily.co may not be configured yet:', e);
    // Do NOT show this error to the user — the booking is still confirmed
  }

  // 3. Notify the client
  if (booking.client_id) {
    void callNotify({
      userId: booking.client_id,
      title: 'Session Confirmed',
      body: `Your training session on ${formatDate(booking.scheduled_at)} has been confirmed.`,
      data: { screen: 'training', bookingId },
    });
  }
};
```

---

## PHASE 4 — Wire notify into Key App Events

Find these locations and add `callNotify` calls. All notification calls must be:
- Non-blocking (use `void` or `.catch()`)
- Never crash the UI if they fail
- Only called after the primary DB operation succeeds

### 4.1 — Application Status Change
In `hooks/useApplications.ts` or the admin applications screen, when an application is approved or rejected:

```typescript
// When approving:
void callNotify({
  userId: application.client_id,
  title: 'Application Update',
  body: 'Your Diedericks Dobermanns application has been approved! Log in to view details.',
  data: { screen: 'application-status' },
});

// When rejecting:
void callNotify({
  userId: application.client_id,
  title: 'Application Update',
  body: 'We have reviewed your application. Please log in for details.',
  data: { screen: 'application-status' },
});
```

### 4.2 — Puppy Reservation Confirmed
When a puppy reservation is confirmed by admin, notify the client:

```typescript
void callNotify({
  userId: reservation.client_id,
  title: 'Puppy Reserved!',
  body: `Your reservation for ${puppy.name} has been confirmed. Welcome to the Diedericks family.`,
  data: { screen: 'reservation' },
});
```

### 4.3 — New Invoice Sent
When an invoice is created and sent to a client:

```typescript
void callNotify({
  userId: invoice.client_id,
  title: 'New Invoice',
  body: `Invoice #${invoice.number} for R${invoice.total_amount} is ready to view.`,
  data: { screen: 'invoices', invoiceId: invoice.id },
});
```

---

## PHASE 5 — Admin Notification Test Screen

In `app/(admin)/notifications.tsx`, add a test panel for admins to manually trigger a test notification to themselves:

```typescript
// "Send Test Notification" button
const sendTest = async () => {
  try {
    await callNotify({
      userId: currentUserId,
      title: 'Test Notification',
      body: 'Edge Functions are working correctly.',
    });
    toast.show('Test notification sent');
  } catch (e) {
    toast.show('Failed — check Edge Function deployment', { type: 'error' });
  }
};
```

---

## CRITICAL WARNINGS

- The Edge Function calls are NON-BLOCKING for UX — a video room failure must never prevent a booking confirmation
- NEVER put `DAILY_API_KEY`, `RESEND_API_KEY`, or `EXPO_PUSH_ACCESS_TOKEN` in the mobile app code or `.env` — they go in Supabase Secrets only
- The `callNotify` wrapper in `lib/functions.ts` uses the anon key — the Edge Function uses the service role key server-side (already injected automatically by Supabase)
- Do NOT recreate the Edge Function code — only wire the calls into existing screens/hooks

---

## Manual Steps (Cannot be done by Cursor — do these yourself)

After Cursor runs this prompt, you must manually:

1. **Deploy the functions** (run the `supabase functions deploy` commands above in your terminal)
2. **Set secrets** in Supabase Dashboard → Edge Functions → Manage Secrets:
   - `DAILY_API_KEY` → from daily.co dashboard
   - `RESEND_API_KEY` → from resend.com dashboard
   - `EXPO_PUSH_ACCESS_TOKEN` → from expo.dev dashboard
3. **Test** by confirming a training booking in the admin panel and checking if a video room URL appears on the booking record

---

## Testing Checklist

- [ ] `lib/functions.ts` created with typed wrappers
- [ ] Booking confirmation triggers `callCreateVideoRoom` — check booking record in Supabase for `video_room_url`
- [ ] Application approval sends notification — check `notifications` table for new record
- [ ] Test notification button works in admin notifications screen
- [ ] All notification calls use `void` / non-blocking pattern
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] No API keys in any client-side file
