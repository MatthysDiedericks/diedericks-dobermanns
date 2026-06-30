# CURSOR PROMPT — Contacts CRM: Add Contact, Interaction History, Segmentation & App User Sync

## WhatsApp note (read before building)

WhatsApp one-tap is **already implemented** in `lib/social.ts`:
```typescript
export function openWhatsApp(phone?: string | null, text?: string): void {
  if (!phone) return;
  openUrl(whatsappUrl(phone, text)); // → https://wa.me/27XXXXXXXXX?text=Hello%20John
}
```
Tapping the WhatsApp button opens WhatsApp directly on the contact — **no multi-step**. You can pre-fill a greeting. This is the maximum automation WhatsApp allows without the paid Business API. It is already wired. The task is to make it more prominent and log that it happened.

---

## Context

**Project:** Diedericks Dobermanns — React Native / Expo  
**Backend:** Supabase project `nlmwxodvquwbjinhhbmr`  
**Stack:** Expo SDK 56, TypeScript strict, Expo Router, NativeWind, `@gorhom/bottom-sheet`  
**Brand:** Background `#111008` | Surface `#1C1A0E` | Gold `#C4A35A` | Text `#F5F0E8`

**Existing contacts files:**
- `app/(tabs)/contacts/index.tsx` — contacts list with tag filter, WhatsApp/call/email icons
- `app/(tabs)/contacts/[id].tsx` — contact detail (basic — just name, phone, email, notes)
- `hooks/useContacts.ts` — `useContacts(tag, search)` and `useContact(id)` — queries `contacts` table with fallback to `users`
- `lib/social.ts` — `openWhatsApp(phone, text)` one-tap function already exists

**Existing contacts table columns (LIVE — verified):**
`id, user_id, full_name, email, phone, country, city, source, notes, tags, created_at, updated_at`  
**Added by migration 0024:** `contact_type, whatsapp_number, company, address, id_number, marketing_opt_in, is_do_not_sell, popia_consent, popia_consent_date, first_contact_date`  
**Note:** The user link column is `user_id` (not `user_id`) — use `user_id` everywhere.

**Existing tags:** `['Breeder', 'Customer', 'Judge', 'Potential Customer', 'Supplier', 'Other']`

**Existing users table (app clients):** `id, full_name, email, phone, city, country, role, created_at`

---

## What to build — 5 tasks

### Task 1 — Migration 0024: upgrade contacts + add interaction history

**File:** `supabase/migrations/0024_contacts_crm.sql`

```sql
-- 0024 — CRM: contact_type segmentation, user linking, interaction history

-- Add new columns to contacts
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS contact_type text NOT NULL DEFAULT 'prospect'
    CHECK (contact_type IN ('client', 'prospect', 'breeder', 'supplier', 'judge', 'staff', 'other')),
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual'
    CHECK (source IN ('manual', 'app_signup', 'enquiry', 'referral', 'import'));

-- Index for linked user lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_linked_user
  ON contacts(user_id) WHERE user_id IS NOT NULL;

-- Interaction log
CREATE TABLE IF NOT EXISTS contact_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  logged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  interaction_type text NOT NULL
    CHECK (interaction_type IN ('whatsapp', 'email', 'call', 'meeting', 'note', 'sms')),
  direction text NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('outbound', 'inbound')),
  subject text,
  body text,
  interaction_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interactions_contact
  ON contact_interactions(contact_id, interaction_date DESC);

ALTER TABLE contact_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and trainers manage interactions"
  ON contact_interactions FOR ALL
  USING (is_trainer_or_above()) WITH CHECK (is_trainer_or_above());

-- RLS update on contacts (already has RLS, add explicit policies if missing)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contacts' AND policyname = 'Admins manage contacts'
  ) THEN
    CREATE POLICY "Admins manage contacts" ON contacts
      FOR ALL USING (is_admin()) WITH CHECK (is_admin());
    CREATE POLICY "Trainers read contacts" ON contacts
      FOR SELECT USING (is_trainer_or_above());
  END IF;
END $$;

-- Auto-sync: when a user signs up in public.users, upsert a contacts row
CREATE OR REPLACE FUNCTION sync_user_to_contacts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO contacts (
    full_name, email, phone, city, country,
    contact_type, source, user_id, marketing_opt_in,
    tags, first_contact_date, created_at, updated_at
  )
  VALUES (
    COALESCE(NEW.full_name, 'App User'),
    (SELECT email FROM auth.users WHERE id = NEW.id),
    NEW.phone,
    NEW.city,
    NEW.country,
    'client',
    'app_signup',
    NEW.id,
    COALESCE(NEW.marketing_opt_in, false),
    ARRAY['Customer'],
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    city = EXCLUDED.city,
    country = EXCLUDED.country,
    marketing_opt_in = EXCLUDED.marketing_opt_in,
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_to_contacts ON public.users;
CREATE TRIGGER trg_sync_user_to_contacts
  AFTER INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_to_contacts();

-- Back-fill: sync all existing users who don't have a contact row yet
INSERT INTO contacts (
  full_name, email, phone, city, country,
  contact_type, source, user_id, marketing_opt_in,
  tags, first_contact_date, created_at, updated_at
)
SELECT
  COALESCE(u.full_name, 'App User'),
  a.email,
  u.phone,
  u.city,
  u.country,
  'client',
  'app_signup',
  u.id,
  COALESCE(u.marketing_opt_in, false),
  ARRAY['Customer'],
  u.created_at,
  u.created_at,
  u.created_at
FROM public.users u
JOIN auth.users a ON a.id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM contacts c WHERE c.user_id = u.id
);
```

> **Apply this migration via Supabase MCP before Cursor runs any code.**

---

### Task 2 — New hook additions in `hooks/useContacts.ts`

Add these exports alongside the existing `useContacts` and `useContact`:

#### 2a — Update `useContacts` to support `contact_type` filter

```typescript
// Update the function signature:
export function useContacts(
  tag?: string,
  search = '',
  contactType?: 'client' | 'prospect' | 'all'  // NEW
)

// In the query, add:
if (contactType && contactType !== 'all') {
  q = q.eq('contact_type', contactType);
}
```

#### 2b — `useContactInteractions(contactId)`

```typescript
export interface ContactInteraction {
  id: string;
  contact_id: string;
  logged_by: string | null;
  interaction_type: 'whatsapp' | 'email' | 'call' | 'meeting' | 'note' | 'sms';
  direction: 'outbound' | 'inbound';
  subject: string | null;
  body: string | null;
  interaction_date: string;
  created_at: string;
}

export function useContactInteractions(contactId: string) {
  // Fetch from contact_interactions where contact_id = contactId
  // Order by interaction_date DESC
  // Return: { interactions, loading, error, refresh, logInteraction }
}

// logInteraction function:
async function logInteraction(input: {
  interaction_type: ContactInteraction['interaction_type'];
  direction: ContactInteraction['direction'];
  subject?: string;
  body?: string;
  interaction_date?: string;
}): Promise<void>
```

#### 2c — `useCreateContact` and `useUpdateContact`

```typescript
export interface ContactInput {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  company?: string | null;
  id_number?: string | null;
  contact_type: string;
  tags?: string[];
  marketing_opt_in?: boolean;
  popia_consent?: boolean;
  notes?: string | null;
  source?: string;
}

export async function createContact(input: ContactInput): Promise<string>  // returns new id
export async function updateContact(id: string, input: Partial<ContactInput>): Promise<void>
```

---

### Task 3 — New components

#### 3a — `components/contacts/AddContactSheet.tsx`

Bottom sheet using `@gorhom/bottom-sheet` for adding or editing a contact.

**Ref handle:**
```typescript
export interface AddContactSheetHandle {
  open: (existingContact?: ContactRow) => void;
  close: () => void;
}
```

**Fields in the form (scroll inside sheet):**
- Full name* — `Input`
- Contact type* — `OptionGroup`: Client / Prospect / Breeder / Supplier / Judge / Other
- Phone — `Input` keyboardType="phone-pad"
- WhatsApp number — `Input` keyboardType="phone-pad" + hint "Leave blank if same as phone"
- Email — `Input` keyboardType="email-address"
- Company — `Input`
- City — `Input`
- Country — `Input`
- Address — `Input` multiline
- Tags — multi-select chip picker (existing tags array: Breeder, Customer, Judge, etc.)
- Marketing opt-in — `Switch` + POPIA notice: "I confirm this person has consented to marketing communications"
- Notes — `Input` multiline
- Source — `OptionGroup`: Manual / Referral / Enquiry / Import (hidden unless admin)

**Save:** calls `createContact` or `updateContact`, calls `onSaved()`, closes sheet.  
**Close button:** explicit ✕ at top right (same pattern as UploadDocumentSheet fix).

#### 3b — `components/contacts/LogInteractionSheet.tsx`

Bottom sheet for logging a communication.

**Fields:**
- Type — `OptionGroup`: WhatsApp / Email / Call / Meeting / Note / SMS (icons: logo-whatsapp / mail / call / people / document-text / chatbubble)
- Direction — `OptionGroup`: Outbound (sent by us) / Inbound (received from them)
- Subject — `Input` (optional, hidden for WhatsApp/Call)
- Notes/Body — `Input` multiline, required
- Date — `DateField` (defaults to today)

**After save:** calls `logInteraction`, shows toast "Interaction logged", closes.

#### 3c — `components/contacts/InteractionCard.tsx`

Compact card showing one interaction:

```
┌──────────────────────────────────────────┐
│ 📱 WhatsApp  →  outbound   2 Jun 2026   │
│ "Confirmed heat start date and mating    │
│  window for next cycle."                │
└──────────────────────────────────────────┘
```

Icons per type: WhatsApp → `logo-whatsapp` | Email → `mail` | Call → `call` | Meeting → `people` | Note → `document-text` | SMS → `chatbubble`  
Direction badge: "→ Sent" (gold) or "← Received" (subtle)

---

### Task 4 — Update contacts list screen (`app/(tabs)/contacts/index.tsx`)

**Segment tabs** — replace the current flat tag chips with a two-level system:

**Top row — segment selector (prominent, always visible):**
```
[ All ]  [ Clients ]  [ Prospects ]  [ Other ]
```
- "Clients" → `contact_type = 'client'`
- "Prospects" → `contact_type = 'prospect'`
- "Other" → `contact_type IN ('breeder', 'supplier', 'judge', 'staff', 'other')`
- "All" → no filter

**Second row — tag chips** (same as before, applies within the selected segment)

**Add Contact button** — floating action button bottom right (gold, `+` icon), only visible to admin/trainer roles. Opens `AddContactSheet`.

**Contact card updates:**
- Show contact_type badge: "Client" (gold) | "Prospect" (subtle gold) | tag names
- If `user_id` is set, show a small app icon `📱` indicating this person has an app account
- WhatsApp, call, email icon row — same as current but left-aligned

**Segment summary at top (small text):**
```
24 clients · 31 prospects · 8 other
```
This comes from counting the full unfiltered list, or from a `useContactSummary()` hook that does a simple `group by contact_type` count query.

---

### Task 5 — Update contact detail screen (`app/(tabs)/contacts/[id].tsx`)

This screen needs a full rebuild. Keep it under 280 lines — extract `InteractionCard` already done above.

**Layout:**

```
┌─────────────────────────────────────────────┐
│ ← John Smith                        [Edit]  │
│ ─────────────────────────────────────────── │
│                                             │
│  CLIENT  📱 App user                        │  ← badges
│  john@example.com                           │
│  +27 83 123 4567                            │
│  Cape Town, South Africa                    │
│                                             │
│  ┌─────────────────────────────────────────┐│
│  │  [📱 WhatsApp]  [✉ Email]  [📞 Call]   ││  ← one-tap action row
│  └─────────────────────────────────────────┘│
│                                             │
│  NOTES                                      │
│  "Interested in Line A female puppy..."     │
│                                             │
│  INTERACTION HISTORY          [+ Log]       │
│  ┌─────────────────────────────────────────┐│
│  │ 📱 WhatsApp → 2 Jun  "Sent heat dates" ││
│  │ ✉ Email   ← 1 Jun  "Enquiry reply"    ││
│  │ 📞 Call   → 28 May  "Introduction"    ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

**Action buttons — ONE-TAP behaviour:**
- **WhatsApp:** `openWhatsApp(contact.whatsapp_number ?? contact.phone, 'Hi {firstName}, ')` → opens WhatsApp immediately. After tap, show `Alert.alert('Log this interaction?', '', [{text:'Not now'}, {text:'Log it', onPress: () => logInteractionRef.current?.open({type:'whatsapp', direction:'outbound'})}])`
- **Email:** `Linking.openURL('mailto:' + contact.email)` → one tap. Same log prompt after.
- **Call:** `Linking.openURL('tel:' + contact.phone)` → one tap. Same log prompt after.

**Edit button** (top right header): opens `AddContactSheet` pre-filled with contact data.

**"+ Log" button** next to INTERACTION HISTORY heading: opens `LogInteractionSheet` directly.

**Interaction history:** `useContactInteractions(id)` — `FlatList` of `InteractionCard` components. Show last 20, with "Load more" if > 20.

**If `user_id` is set:** show a "View App Profile" button that navigates to `/(admin)/clients/{user_id}`.

---

## File summary

| Action | File |
|--------|------|
| CREATE (migration) | `supabase/migrations/0024_contacts_crm.sql` |
| CREATE (component) | `components/contacts/AddContactSheet.tsx` |
| CREATE (component) | `components/contacts/LogInteractionSheet.tsx` |
| CREATE (component) | `components/contacts/InteractionCard.tsx` |
| EDIT | `hooks/useContacts.ts` — add `contactType` param, `useContactInteractions`, `createContact`, `updateContact` |
| EDIT | `app/(tabs)/contacts/index.tsx` — segment tabs, Add button, updated contact cards |
| EDIT | `app/(tabs)/contacts/[id].tsx` — full rebuild with action row + interaction history |

---

## Execution order

1. Apply `0024_contacts_crm.sql` migration (Supabase MCP — run first)
2. Edit `hooks/useContacts.ts` — add all new hooks and functions
3. Create `components/contacts/InteractionCard.tsx`
4. Create `components/contacts/AddContactSheet.tsx`
5. Create `components/contacts/LogInteractionSheet.tsx`
6. Edit `app/(tabs)/contacts/index.tsx`
7. Edit `app/(tabs)/contacts/[id].tsx`

---

## Business rules

- **POPIA (South Africa):** `marketing_opt_in` must be explicitly set by the contact — never default to `true` for manually added contacts. The DB default is `false`. Only mark `true` if the user ticks a checkbox confirming consent.
- **"Do not sell":** `is_do_not_sell = true` contacts must not appear in marketing lists or bulk send screens. This is enforced in `useContacts` already — do NOT remove it.
- **App-linked contacts:** contacts with `user_id` show their contact_type as 'client'. They were created by the DB trigger. Do NOT allow manual `contact_type` changes to these — the contact_type of a user_id contact is always 'client'.
- **WhatsApp number:** if `whatsapp_number` is blank, fall back to `phone` for the WhatsApp link.
- **Bulk marketing** (future): The segmentation and `marketing_opt_in` flag built here will feed into a bulk broadcast screen in a future prompt. Architecture is ready — don't build the bulk send screen yet.

---

## Critical rules

- Files under 300 lines — split AddContactSheet form fields into sub-components if needed
- TypeScript strict — no `any`, all Supabase rows typed via generated types
- `openWhatsApp` is already in `lib/social.ts` — import it, do NOT re-implement
- `DateField` component was created in `CURSOR_PROMPT_DOCUMENT_SHEET_FIX` — import from `@/components/ui/DateField` for the LogInteractionSheet date field
- The DB trigger `trg_sync_user_to_contacts` runs automatically — no code changes needed in auth flow
- Run `npx tsc --noEmit` before finishing — fix all type errors

---

## Testing checklist

- [ ] Add Contact sheet opens from floating + button (admin/trainer only)
- [ ] All fields save correctly — full_name, phone, whatsapp, email, contact_type, tags, city, country, marketing_opt_in, notes
- [ ] Contact appears in list immediately after saving (refresh)
- [ ] Segment tabs: Clients / Prospects / Other filter correctly
- [ ] "Client" segment shows only contact_type = 'client'
- [ ] "Prospect" segment shows only contact_type = 'prospect'
- [ ] Contacts with `user_id` show 📱 app badge on list and detail
- [ ] WhatsApp button opens WhatsApp immediately (one tap, no multi-step)
- [ ] Email button opens mail client immediately (one tap)
- [ ] Call button opens phone dialler immediately (one tap)
- [ ] After WhatsApp/email/call tap, log prompt appears
- [ ] Log Interaction sheet saves to `contact_interactions` table
- [ ] Interaction history shows on contact detail in reverse chronological order
- [ ] New user who signs up via app → contact row auto-created by DB trigger with contact_type = 'client'
- [ ] Existing users back-filled into contacts by migration
- [ ] `is_do_not_sell` contacts hidden from standard list views
- [ ] No TypeScript errors
