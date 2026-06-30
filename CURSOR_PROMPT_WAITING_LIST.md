# Cursor Prompt — Waiting List Module
## Diedericks Dobermanns — App + Website

---

## OVERVIEW

Build a full client pipeline / waiting list system — significantly better than the DogBreederPro screenshot. Key improvements over that example:

1. **Pipeline stages** (not just status categories) — full journey from first enquiry → handover
2. **Auto-populated from applications** — no re-entering data; applications flow in automatically
3. **Payment sync** — deposit invoice paid → automatically moves client to active waiting list
4. **Preference matching** — when a litter is born, system shows which waitlisted clients match
5. **Follow-up reminders** — admin sets next contact date, dashboard shows overdue follow-ups
6. **Stage history audit trail** — every move between stages is logged with who moved them and when
7. **Two views** — Pipeline (Kanban columns) + List (table like DogBreederPro)
8. **Bulk actions** — copy emails, send group notification, export
9. **Do Not Sell flag** — separate protected list, clearly marked red

---

## DATABASE — ALREADY MIGRATED

Tables already exist (do not recreate):
- `waiting_list_types` — seeded with 5 list types: Standard Puppy, Elite Developed, Protection Dog, Training Clients, Do Not Sell
- `waiting_list` — full pipeline with all preference, payment, assignment, and communication fields
- `waiting_list_history` — automatic stage change audit log (trigger already in place)

**Critical: the trigger `trigger_waiting_list_stage_log` auto-fires** on any `pipeline_stage` change — you do not need to insert into `waiting_list_history` manually.

**Critical: the trigger `trigger_sync_waitlist_from_invoice` auto-fires** when a linked invoice is marked paid — automatically moves the waiting list entry to `deposit_paid` stage.

**Pipeline stages (in order):**
```
enquiry → application → approved → quote_sent → deposit_paid → matched → reserved → handover_complete
                                                                                  ↘ on_hold / do_not_sell / withdrawn
```

**Regenerate TypeScript types** after reading this prompt:
```bash
npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > src/types/database.types.ts
```

---

## PART A — REACT NATIVE APP

### Access control
Waiting list is admin + management only.
Use `useFinanceAccess()` hook (same role check: `admin`, `super_admin`, `management`).

---

### Screen 1: `app/(admin)/waitlist/index.tsx` — Waiting List Home

**Top bar:**
- Title "WAITING LIST" in Cinzel gold
- Toggle: `[Pipeline]` `[List]` — switches view mode
- Filter icon → filter sheet

**Left sidebar / top scroll (like DogBreederPro):**
Horizontal scroll on mobile (vertical panel on tablet/desktop).
Shows `waiting_list_types` rows. Each pill shows name + count of active entries.
"Do Not Sell" pill: red background.
"+ New List" button → create a new `waiting_list_type`.
Tapping a list type filters the main view to that type only. "All" option shows everything.

**Summary strip (below list type selector):**
4 mini stat chips:
- Active (deposit_paid + matched + reserved count) — gold
- Follow-up Today (follow_up_date = today count) — amber
- Awaiting Deposit (quote_sent count) — blue
- Completed This Year (handover_complete, year-to-date) — green

---

### View A: Pipeline View (Kanban)

Horizontal scroll of stage columns. Each column is a vertical card stack.

Columns shown (omit do_not_sell and withdrawn from main pipeline):
| ENQUIRY | APPLICATION | APPROVED | QUOTE SENT | DEPOSIT PAID | MATCHED | RESERVED |

Each column header: stage name, count badge.

Entry card in each column shows:
- Client name (or enquirer_name if not registered) in Cinzel white
- Priority dot: 🔴 high / ⚪ normal / ⬇ low
- Preferred category badge (Standard / Elite / Protection)
- Preferred sex + colour (e.g. "♂ Black & Rust")
- Payment status chip: "Not Paid" (grey) / "Deposit Paid" (green)
- Date added (days waiting shown: "42 days")
- Follow-up date if set — red if overdue

Tap card → opens Entry Detail Sheet.

Long press card → quick actions: Move Stage | Edit | Do Not Sell | Delete

**Moving between stages:** tap "Move Stage" from quick actions → stage picker modal. Admin selects new stage, can add a note. Trigger logs the history automatically.

---

### View B: List View (like DogBreederPro, much improved)

Full-width scrollable table.

**Columns:**
| # | Contact | Preferences | Payment | Dates | Matched To | Notes | Actions |

**# column:** position number + up/down reorder arrows (saves `position` field).

**Contact column:**
- Full name (gold, tappable → opens detail)
- Phone (tappable → calls)
- Email (tappable → mail)
- Country flag + country name
- Source badge: App / Website / Instagram / Referral etc.

**Preferences column:**
- Category pill (Standard / Elite / Protection)
- Sex: ♂ Male / ♀ Female / Either
- Colour preference
- Ears: Cropped / Natural / No preference
- Tail: Docked / Natural
- Registration: Full / Limited

**Payment column:**
- Payment status badge
- Deposit amount if paid (green "R 5,000 ✓")
- Quoted price if set
- Quote expiry date if applicable

**Dates column:**
- Date Added
- Days waiting (auto-calculated)
- Last Contact
- Follow-up date (red if overdue, gold if today, grey if future)

**Matched To column:**
- Dog name + photo thumb (if assigned_dog_id set)
- Litter name (if assigned_litter_id set)
- "Not yet matched" if neither

**Notes column:**
- First 80 chars of admin_notes
- Internal flags chips (VIP / International / Referral)

**Actions column (icon buttons):**
- 📋 View detail
- ✉️ Copy email
- 📄 Print record
- ⬆ Move stage
- 🗑 Delete / Do Not Sell

**Table header:**
- "Copy All Emails" button (copies comma-separated list of visible filtered entries' emails to clipboard)
- "Export" button → exports filtered list as Excel
- "Send Notification" → broadcast to this filtered group
- Filter count shown: "Showing 12 of 34"

---

### Screen 2: Entry Detail Sheet / Modal

Full-screen slide-up sheet when entry is tapped.

**Header:**
- Client name large Cinzel
- Current stage badge (colour-coded)
- Priority indicator
- Quick action buttons: Call | WhatsApp | Email | Print

**Tabs: Overview | Preferences | History | Notes**

**Overview tab:**
- Contact details block (all contact fields)
- Payment block: status, deposit amount, invoice link, quoted price
- Assignment block: matched dog/litter (with photo), reservation link
- Follow-up block: last contact, next follow-up date (editable inline)
- Source + date added + days waiting
- "Move Stage" button (gold, prominent) → stage picker
- "Create Invoice" shortcut → pre-fills invoice for this client
- "Create Reservation" shortcut → creates reservation record

**Preferences tab:**
- All preference fields in read-only display
- "Edit Preferences" button → inline edit form
- Preference Notes full text

**History tab:**
- Chronological list of every stage change
- Each entry: date | from stage → to stage | changed by | notes
- Auto-populated by trigger — no manual entry

**Notes tab:**
- Admin notes (large textarea, saves on blur)
- Internal flags: toggleable chips (VIP / International / Referral / Referred By Us / Difficult / First-time Owner)
- Do Not Sell toggle (opens reason modal)

---

### Screen 3: `app/(admin)/waitlist/new.tsx` — Add to Waiting List

**Two entry paths:**

**Path A — From Application:**
Top section: "Add from Application" search. Searches `applications` WHERE status = 'approved'. Selecting an application auto-fills all fields from the application data (name, email, phone, country, preferred dog type, sex, experience, home type, etc.). Admin just confirms and picks the list type.

**Path B — Manual Entry:**
Form for walk-in / phone enquiries not yet in the application system.
Fields: First/Last Name, Email, Phone, Country, Source, List Type, Preferred Category, Sex, Colour, Ears, Tail, Registration, Notes, Priority.
Optional: link to existing user account.

Both paths end with: List Type picker, Pipeline Stage picker (defaults 'enquiry'), Follow-up date.

---

### Screen 4: `app/(admin)/waitlist/match.tsx` — Preference Matching

This is the standout feature DogBreederPro doesn't have properly.

**Purpose:** When a litter is born or a dog becomes available, admin opens this screen, selects the dog/litter, and instantly sees a ranked list of waiting list clients who match.

**Header:** Select a Dog or Litter from dropdowns.

**Matching logic (all done client-side after fetch):**
Score each waiting list entry (active stages only: deposit_paid, matched, reserved):
- +40 points: category matches (standard / elite / protection)
- +20 points: sex preference matches or is 'any'
- +15 points: colour preference matches or is 'any'
- +10 points: ear preference matches or is 'no_preference'
- +10 points: tail preference matches or is 'no_preference'
- +5 points: has paid deposit
- +5 points: priority = 'high'
- +3 points per month on waiting list (rewards patience)
- −50 points: `do_not_sell` stage (excluded from results)

Display: ranked list of matched clients, score shown as gold bar (0–100). Top match highlighted.

Each result card: client name, days waiting, score bar, matched criteria ticks/crosses, contact button.

"Assign" button on each card → sets `assigned_dog_id` or `assigned_litter_id` on that waiting list entry, moves stage to 'matched', triggers push notification to client: "Great news — we may have found your match. Your breeder will be in touch."

---

### Screen 5: `app/(admin)/waitlist/follow-ups.tsx` — Follow-up Dashboard

List of all waiting list entries where `follow_up_date <= today`.

Grouped: Overdue (red) | Due Today (gold) | Due This Week (white)

Each card: client name, list type, stage, last contact date, follow-up note.

Quick actions: Mark Contacted (updates `last_contact_date = today`, clears `follow_up_date`) | Set New Follow-up | Call | WhatsApp

Badge on the Waiting List tab icon showing overdue follow-up count.

---

### Do Not Sell List (`pipeline_stage = 'do_not_sell'`)

Shown as a separate section below all active lists. Red background tint.
Shows: name, reason, date added, who added.
Can be unlocked by super_admin only.
Never shows in matching results.

---

## PART B — NEXT.JS WEBSITE ADMIN PANEL

Add to admin sidebar under Business: **Waiting List** with sub-pages.

### `/admin/waitlist` — Main Page

**Two-panel layout:**
Left sidebar (240px): list types with entry counts. "Do Not Sell" at bottom in red. "+ New List Type" button.

Right main area:
- View toggle: Pipeline | List | Follow-ups | Match
- Filter bar: Stage pills | Priority filter | Search

**Pipeline view:**
Horizontal kanban using CSS Grid. Each column scrollable vertically. Cards draggable between columns (use `@dnd-kit/core` — `npm install @dnd-kit/core @dnd-kit/sortable`). On drop: PATCH `waiting_list` record with new `pipeline_stage`, trigger fires and logs history.

**List view (desktop table — better than DogBreederPro):**

Sticky header row with column sorts. Columns:

| Priority | Client | Contact | List Type | Stage | Preferences | Payment | Days Waiting | Follow-up | Matched To | Actions |

Stage column: coloured badge:
- Enquiry: grey
- Application: blue
- Approved: sky
- Quote Sent: amber
- Deposit Paid: green (bold)
- Matched: gold
- Reserved: gold bold
- Handover Complete: dim green
- On Hold: orange
- Do Not Sell: red
- Withdrawn: strikethrough dim

**"Copy Emails" button** → copies emails of all visible filtered rows as comma-separated string. Shows toast "12 emails copied".

**Bulk select** (checkboxes) → bulk actions: Move Stage | Send Notification | Export Selected | Delete Selected.

**Row actions (hover reveals):**
- View | Edit Stage | Create Invoice | Create Reservation | Move to Do Not Sell | Delete

### `/admin/waitlist/[id]` — Entry Detail

Tabbed layout: Overview | Preferences | History | Notes

Same content as app detail but desktop-optimised. Wide layout, more visible at once.

Includes: inline-editable fields (click to edit, blur to save), history timeline on right column.

### `/admin/waitlist/match` — Preference Matching

Same matching logic as app but displayed in a wider grid.
Dog/Litter selector at top (searchable).
Results in a table with sortable Match Score column.
Score shown as progress bar in gold.
"Assign & Notify" button sends push notification to client.

### `/admin/waitlist/follow-ups` — Follow-up Dashboard

Priority table: Overdue | Today | This Week | Upcoming.
"Mark Contacted" one-click per row.
Bulk: "Mark All Today as Contacted" button.

---

## AUTOMATION — CONNECT TO APPLICATIONS

### In the Applications admin screen (`/admin/applications/[id]`):

When an application is approved, add a button: **"Add to Waiting List"**

Clicking opens a drawer/modal pre-filled with all data from the application:
- enquirer_name ← application.full_name
- enquirer_email ← application.email
- enquirer_phone ← application.phone
- enquirer_country ← application.country
- client_id ← application.user_id (if exists)
- application_id ← application.id
- preferred_category ← derived from application.dog_interest
- preferred_sex ← from application data
- pipeline_stage ← auto-set to 'application'
- source ← 'app' or 'website' depending on how they applied

Admin confirms list type + any overrides → saves. Application status updates to 'waitlisted'.

### In the Invoices admin screen:

When creating an invoice for a waiting list client, show a "Link to Waiting List Entry" selector. Sets `deposit_invoice_id` on the waiting list row. When that invoice is paid, trigger automatically moves them to `deposit_paid` stage.

---

## CLIENT-FACING (App)

### `app/(client)/waitlist/index.tsx`

Clients who are on the waiting list see their own entry only (RLS enforced).

Simple card shows:
- Which list they're on (e.g., "Elite Developed Puppy")
- Their current stage with a progress stepper:
  `[✓] Applied → [✓] Approved → [✓] Deposit Paid → [ ] Matched → [ ] Reserved → [ ] Handover`
- Estimated wait (if admin has set it on the litter)
- Their preferences (read-only)
- Payment status
- A message from admin (if any in `admin_notes` that is marked for client visibility — add a `client_visible_note` field or use the notes field with a prefix convention)
- "Update my preferences" button → limited form to update preferred sex/colour/preferences

---

## PRINT / EXPORT

### Print Individual Record

Generates a styled HTML page (similar to invoice PDF) showing all client details, preferences, payment status, history. Uses `expo-print` on app, `window.print()` with `@media print` CSS on web.

Print layout:
- DD header (black, gold)
- Client name + contact block
- Preference grid
- Payment block
- Stage history table
- Notes
- "CONFIDENTIAL — Diedericks Dobermanns" footer

### Export Waiting List (Excel)

Exports all visible (filtered) waiting list entries as Excel.

Sheets:
1. Active Waiting List — all non-do_not_sell entries
2. By Stage — grouped count summary
3. Do Not Sell — separate sheet, clearly marked

---

## FILE STRUCTURE

### React Native App:
```
app/(admin)/waitlist/
  index.tsx           ← Main screen (pipeline + list toggle)
  new.tsx             ← Add entry (from application or manual)
  [id].tsx            ← Entry detail sheet
  match.tsx           ← Preference matching tool
  follow-ups.tsx      ← Follow-up dashboard

app/(client)/
  waitlist/
    index.tsx         ← Client sees own entry + progress

components/waitlist/
  PipelineBoard.tsx   ← Kanban column view
  WaitlistTable.tsx   ← List/table view
  EntryCard.tsx       ← Card used in both views
  PreferenceBadges.tsx← Compact preference display
  StageSelector.tsx   ← Move-stage picker modal
  MatchScoreBar.tsx   ← Visual match score display
  FollowUpList.tsx    ← Follow-up dashboard component

hooks/
  useWaitingList.ts
  usePreferenceMatch.ts
  useFollowUps.ts
```

### Next.js Website:
```
app/admin/waitlist/
  page.tsx            ← Main (pipeline + list)
  [id]/page.tsx       ← Entry detail
  match/page.tsx      ← Preference matching
  follow-ups/page.tsx ← Follow-up dashboard

components/admin/waitlist/
  PipelineBoard.tsx   ← Kanban with @dnd-kit
  WaitlistTable.tsx
  EntryDetail.tsx
  MatchingTool.tsx
  StageHistory.tsx
```

---

## KEY RULES

- `waiting_list_history` is written by trigger — never insert manually
- Payment sync is done by trigger — when `deposit_invoice_id` invoice is paid, stage auto-updates
- `do_not_sell` entries must NEVER appear in matching results — filter them out at query level
- Position (manual order) is separate from stage — within each stage, entries can be reordered
- Client can see own entry but cannot change their pipeline_stage — admin only
- "Do Not Sell" list type is hard-coded red — cannot be recoloured
- All waiting list screens check `is_admin()` except the client's own view which uses `client_id = auth.uid()`
- When moving to `do_not_sell` stage, require a reason — `do_not_sell_reason` must not be null
- Follow-up date overdue = `follow_up_date < today` — show count as badge on tab icon

---

## MATCHING ALGORITHM (reference implementation)

```typescript
function scoreMatch(entry: WaitingListEntry, dog: Dog): number {
  let score = 0

  // Category match (most important)
  if (entry.preferred_category === 'any' || entry.preferred_category === dog.category) score += 40

  // Sex match
  if (entry.preferred_sex === 'any' || entry.preferred_sex === dog.sex) score += 20

  // Colour match
  if (entry.preferred_colour === 'any' || !entry.preferred_colour ||
      dog.colour?.toLowerCase().includes(entry.preferred_colour)) score += 15

  // Ear preference (admin knows dog's ear status)
  if (entry.ear_preference === 'no_preference') score += 10

  // Tail preference
  if (entry.tail_preference === 'no_preference') score += 10

  // Deposit paid (shows commitment)
  if (entry.payment_status === 'deposit_paid' || entry.payment_status === 'paid_in_full') score += 5

  // Priority
  if (entry.priority === 'high') score += 5

  // Time waiting reward (1 point per 2 weeks, max 20)
  const weeksWaiting = differenceInWeeks(new Date(), new Date(entry.date_added))
  score += Math.min(Math.floor(weeksWaiting / 2), 20)

  return Math.min(score, 100)
}
```
