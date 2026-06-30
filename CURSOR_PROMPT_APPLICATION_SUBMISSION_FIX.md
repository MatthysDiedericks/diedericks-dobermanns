# CURSOR PROMPT — Application Submission Fix + Reference Flow
*Run in Cursor Agent mode. Complete all tasks in order. Do not skip any.*

---

## Context

**Project:** Diedericks Dobermanns mobile app
**Stack:** React Native, Expo SDK 56, TypeScript strict, Supabase
**Supabase project:** `nlmwxodvquwbjinhhbmr`

**What was fixed before this prompt:**
- RLS policy on `applications` table updated via migration — anonymous users can now insert (migration `fix_applications_rls_allow_anonymous` already applied — do NOT re-apply)

**What this prompt must build:**
1. After successful application submission → insert a confirmation into the `enquiries` table (so admin sees it) AND into `notifications_log` (so logged-in client sees it in their portal)
2. The apply success screen must auto-navigate to home after 5 seconds
3. The client portal notifications screen must show the application reference

---

## Files to read before starting

- `hooks/useApplications.ts` — current submission hook
- `app/(public)/apply.tsx` — success screen
- `app/(portal)/notifications.tsx` — notifications screen
- `types/app.types.ts` — Application, Enquiry, Notification types
- `lib/supabase.ts` — Supabase client

---

## Task 1 — Update `useSubmitApplication` in `hooks/useApplications.ts`

After a successful insert into `applications`, also:

**A) Insert into `enquiries`** (admin communication log):
```
subject: `Application Received — ${referenceId}`
message: `A new puppy application has been submitted. Reference: ${referenceId}. Applicant: ${draft.full_name}, ${draft.email}, ${draft.phone}.`
full_name: draft.full_name
email: draft.email
phone: draft.phone
country: draft.country
status: 'new'
```
Use `.insert()` — do NOT throw if this fails (best-effort, not critical).

**B) If the user is logged in** (check `supabase.auth.getUser()` — if `user.data.user` is not null), insert into `notifications_log`:
```
user_id: user.data.user.id
title: 'Application Submitted'
body: `Your application has been received. Your reference number is ${referenceId}. We will review it and contact you soon.`
type: 'application_confirmation'  (use 'info' if type column doesn't support custom values — check schema first)
read: false
```
Use `.insert()` — do NOT throw if this fails.

**Return value stays the same:** `{ referenceId, error }`.

**Rules:**
- Keep the function under 60 lines
- Every Supabase call has error checking (log to console, do not throw)
- TypeScript strict — no `any`

---

## Task 2 — Update `app/(public)/apply.tsx` success screen

The success screen (shown when `reference` is set) must:

1. **Auto-navigate to home after 5 seconds** — use `useEffect` with a timeout that calls `router.replace('/')`. Clear the timeout on unmount.
2. **Show a countdown** — below the "Back to Home" button, add a small caption: `"Returning to home in 5s…"` using `Typography variant="caption"`.
3. Keep the existing reference number display and "Back to Home" button unchanged.

**Rules:**
- File must stay under 80 lines
- No new dependencies

---

## Task 3 — Update `app/(portal)/notifications.tsx`

The notifications screen must display `application_confirmation` type notifications clearly.

1. Read the current notifications screen. If it already fetches from `notifications_log`, add a special render for items where `type === 'application_confirmation'`:
   - Show a gold badge/chip labelled `"Application"` above the title
   - Show the body text in full (no truncation)

2. If the notifications screen does NOT yet fetch from `notifications_log`, add a `useNotifications` hook in `hooks/useNotifications.ts`:
```typescript
// Fetches notifications for the signed-in user, ordered newest first
// Columns: id, title, body, type, read, created_at
// RLS: user sees only their own rows (user_id = auth.uid())
```
Then use it in the notifications screen.

**Rules:**
- Hook follows the standard pattern: `{ data, loading, error, refresh }`
- Loading state shows skeleton cards
- Empty state: "No notifications yet"
- Mark as read on open (update `read = true` for all unread)

---

## Task 4 — Verify `notifications_log` table schema

Before inserting, check what columns `notifications_log` actually has:
```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'notifications_log' ORDER BY ordinal_position;
```
Run this via Supabase MCP or check `database.types.ts`. Match your insert payload exactly to the real columns.

If `notifications_log` does not exist or does not have a `user_id` column, **skip Task 1B and Task 3** and note it in a comment.

---

## Testing Checklist

- [ ] Submit the application form as a non-logged-in user → no RLS error, reference shown
- [ ] Admin sees a new enquiry in the admin panel with the reference in the subject
- [ ] Submit as a logged-in client → notification appears in `(portal)/notifications.tsx`
- [ ] Apply success screen auto-navigates to home after 5 seconds
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] No file exceeds 300 lines

---

## Critical Rules

- Do NOT re-apply the RLS migration — it is already done
- Do NOT use `SELECT *` — specify column names
- Do NOT expose service role key in client code
- Do NOT create new tables — use existing `enquiries` and `notifications_log`
- Use `ADD COLUMN IF NOT EXISTS` if any schema change is needed
