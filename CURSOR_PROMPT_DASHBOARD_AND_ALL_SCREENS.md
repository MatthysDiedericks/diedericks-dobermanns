# CURSOR PROMPT — DASHBOARD, DOGS, CONTACTS, CALENDAR, HEALTH, GENETICS & DOCUMENTS
## Diedericks Dobermanns — React Native + Expo (Phase 10)

---

## CONTEXT

You are continuing to build the Diedericks Dobermanns premium mobile app.

**Stack:** React Native, Expo SDK 56, TypeScript strict, Expo Router (file-based), NativeWind (Tailwind for RN), Supabase.

**Supabase project:** `nlmwxodvquwbjinhhbmr`  
**URL:** `https://nlmwxodvquwbjinhhbmr.supabase.co`

**Brand tokens (already in theme):**
- Background: `#111008`
- Surface: `#1C1A0E`
- Gold: `#C4A35A`
- Text: `#F5F0E8`
- Fonts: Cinzel (headings), Lato (body)

**Do NOT:**
- Expose `SUPABASE_SERVICE_ROLE_KEY` in any `EXPO_PUBLIC_` variable
- Create files over 300 lines without splitting into sub-components
- Use mock/placeholder data — all screens must query real Supabase tables
- Skip navigation links — every card, button, and stat must route somewhere

---

## OVERVIEW — WHAT TO BUILD

This prompt covers **7 major modules** that must all be production-ready, fully linked, and pulling live data:

1. **Admin Dashboard Home** — live widget hub
2. **Dogs Module** — card grid views with filters (All / My / Litters / Breeding)
3. **Contacts CRM** — client database with tags, tap-to-call, WhatsApp
4. **Calendar** — day/week/month/year with all event types colour-coded
5. **Health Module** — vaccinations, worms/ticks/fleas, vet visits
6. **Genetic Forecast** — Dobermann colour/coat loci calculator + PDF report
7. **Documents Library** — categorised file store with upload, star, open, delete

---

## MODULE 1: ADMIN DASHBOARD HOME

**File:** `app/(tabs)/dashboard/index.tsx`

### Overview
Replace any placeholder dashboard with a live, scrollable hub showing the most important information at a glance. Every widget is tappable and routes to the relevant screen.

### Widgets to Build

#### 1. Current Litters
- Query: `litters` where `status = 'born'`
- Show: litter name, dam, sire, DOB, puppy count, available count
- Tap → `app/(tabs)/dogs/litters/[id].tsx`

#### 2. Expected Litters
- Query: `litters` where `status = 'expected'`
- Show: dam, sire, expected_date, days until due (colour: green > 14 days, amber 7–14, red < 7)
- Tap → same litter detail screen

#### 3. Upcoming Heats
- Query: `heat_cycles` where `next_heat_date >= today` order by `next_heat_date` limit 5
- Join `dogs` for dog name and photo
- Show: dog name, next heat date, days away, status badge
- Tap → `app/(tabs)/dogs/[id].tsx`

#### 4. In Heat — Not Mated
- Query: `heat_cycles` where `status = 'in_heat'` and `mated_date IS NULL`
- Show urgency — red badge with days since heat started
- Tap → dog profile

#### 5. Customer Enquiries (unread)
- Query: `enquiries` where `status = 'new'` order by `created_at desc` limit 5
- Show: name, email/phone, interest, time ago
- Tap → `app/(tabs)/contacts/enquiries/[id].tsx`

#### 6. To-Do Items (due today / overdue)
- Query: `todo_items` where `due_date <= today` and `completed = false`
- Colour code: overdue = red, today = amber
- Tap → `app/(tabs)/calendar/index.tsx` with today selected
- Checkbox to mark complete inline (optimistic update)

#### 7. Quick Stats Row
- Total active dogs
- Total puppies available
- Applications pending review
- Invoices outstanding (sum of `amount_outstanding` on unpaid invoices)
- Each stat taps through to relevant screen

### Layout
- Dark premium card for each widget (`bg-surface`, gold border top, Cinzel heading)
- FlatList with pull-to-refresh
- Gold shimmer skeleton loaders while fetching
- Error boundary per widget — one failing query must not crash others

---

## MODULE 2: DOGS MODULE

### Screen: All Dogs Grid
**File:** `app/(tabs)/dogs/index.tsx`

#### Layout
- 2-column card grid (FlatList `numColumns={2}`)
- Each card:
  - Dog photo (Supabase Storage, fallback silhouette)
  - Name (Cinzel, gold)
  - Call sign badge (if set) — gold pill
  - Sex icon (♂/♀)
  - Date of birth → age auto-calculated
  - Microchip number (truncated, tap to copy)
  - Status badge: Active / Retired / Deceased / In Training / For Sale

#### Top Toolbar
- Search bar (filter by name, call_sign, microchip)
- Filter tabs: **All Dogs | My Dogs | Litters | Breeding Dogs**
- Sort dropdown: Name A–Z, DOB newest, DOB oldest
- "Add Dog" FAB (admin/trainer only)

#### My Dogs Filter
- Show dogs where `owner_id = auth.uid()`
- If user is admin, show all dogs with an "owner" column

#### Litters View
**File:** `app/(tabs)/dogs/litters/index.tsx`
- Group puppies by `litter_id`
- Show litter header card: litter name, dam, sire, DOB, go-home date
- Under each header: horizontal scroll of puppy cards
- Puppy card: photo, name, collar colour badge (use actual colour hex if stored), sex, availability status
- Collar colour badge colours: use the actual colour name (black, red, blue, fawn, etc.)
- Tap puppy card → `app/(tabs)/dogs/[id].tsx`

#### Breeding Dogs Filter
- Show dogs where `breeding_status = 'active'` or role includes `sire`/`dam`
- Show OFA/health test results if stored
- Show litter count (count of litters where dam_id or sire_id = dog.id)

### Screen: Dog Profile
**File:** `app/(tabs)/dogs/[id].tsx`

Tabs within the screen:
1. **Profile** — photo gallery (swipeable), name, DOB, age, sex, colour, microchip, call sign, registration number, pedigree info
2. **Health** — vaccination history for this dog, vet visits, deworming records
3. **Training** — training notes, milestones, trainer comments, completion estimate
4. **Litter History** — if dam/sire: list of litters with links
5. **Documents** — docs tagged to this dog from `kennel_documents`
6. **Gallery** — all photos/videos from `dog_media`

Admin actions (floating menu):
- Edit Dog
- Add Health Record
- Add Training Note
- Transfer Ownership
- Mark Deceased / Retired
- Delete (super_admin only)

---

## MODULE 3: CONTACTS CRM

### Main Screen
**File:** `app/(tabs)/contacts/index.tsx`

#### Left Sidebar / Top Filter Tabs (mobile: horizontal scroll tabs)
**Lists:**
- All Contacts
- Puppy Owners (contacts linked to a completed sale)
- Guardians (dogs living with someone other than buyer)
- Waiting List (contacts on waiting_list table)
- Do Not Sell (protected list — super_admin sees names, others see count only)

**Tags:**
- Breeder
- Customer
- Judge
- Potential Customer
- Supplier
- Other

#### Contact Card
- Avatar (initials if no photo)
- Full name
- Tags as small pills
- Phone number — **tap to call** (`tel:` link via `Linking.openURL`)
- WhatsApp icon — **tap to open WhatsApp** (`https://wa.me/[number]`)
- Email — tap to open mail client
- "Dogs Owned" count (link to their dogs)
- Last contact date

#### Contact Detail Screen
**File:** `app/(tabs)/contacts/[id].tsx`

Sections:
1. **Personal Info** — name, phone, email, address, ID number, POPIA consent
2. **Dogs** — list of dogs linked to this contact (owned or guardian)
3. **Applications** — application history with status badges
4. **Invoices** — outstanding and paid invoices
5. **Waiting List** — their waiting list entries with preferences
6. **Notes** — freeform internal notes (admin/trainer only)
7. **Communication Log** — log of WhatsApp/email contacts sent

Admin actions:
- Add Tag
- Add Note
- Link Dog
- Send WhatsApp
- Send Email
- Add to Waiting List
- Mark Do Not Sell (super_admin only)

#### Year Grouping
- On "All Contacts" list, group by year of first contact (created_at year)
- Show year header with contact count

#### Search
- Debounced search (300ms) across name, email, phone, tags
- Results highlight matching text

---

## MODULE 4: CALENDAR

**File:** `app/(tabs)/calendar/index.tsx`

### View Modes
Toggle between: **Day | Week | Month | Year**  
Store selected view in `AsyncStorage` so it persists.

### Event Sources (all queried from Supabase)

| Event Type | Source Table | Colour |
|---|---|---|
| Litter birth date | `litters.whelping_date` | Gold `#C4A35A` |
| Litter go-home date | `litters.go_home_date` | Amber `#D97706` |
| Heat cycle expected | `heat_cycles.next_heat_date` | Pink `#EC4899` |
| Heat cycle mated | `heat_cycles.mated_date` | Purple `#8B5CF6` |
| Vet visit | `vet_visits.visit_date` | Blue `#3B82F6` |
| Vaccination due | `vaccinations.next_due_date` | Teal `#14B8A6` |
| Deworming due | `deworming_records.next_due_date` | Orange `#F97316` |
| To-Do item due | `todo_items.due_date` | Red `#EF4444` (overdue) / White (pending) |
| Training session | `training_bookings.scheduled_date` | Indigo `#6366F1` |

### Month View
- Calendar grid (7 columns)
- Coloured dots under date if events exist (max 3 dots, then "+N more")
- Tap date → Day view for that date
- Long press date → "Add Event" action sheet

### Week View
- 7-column time grid (08:00–20:00)
- Events as coloured blocks at their time
- All-day events row at top (litter dates, heat dates, deworming)

### Day View
- Time slots every 30 minutes
- Scrollable
- Show all events for that day with full detail
- Tap event → relevant detail screen

### Year View
- 12 month mini-grids
- Colour highlight on months with events
- Tap month → month view

### Event Tap Routing
- Litter event → `app/(tabs)/dogs/litters/[id]`
- Heat event → dog profile
- Vet visit → `app/(tabs)/health/vet-visits/[id]`
- Vaccination → `app/(tabs)/health/vaccinations/[id]`
- To-Do → inline complete toggle + edit modal
- Training → `app/(tabs)/training/bookings/[id]`

### Add Event FAB (admin/trainer)
- Action sheet: "Add To-Do" | "Log Vet Visit" | "Record Heat" | "Schedule Training"
- Each opens a bottom sheet form

---

## MODULE 5: HEALTH MODULE

**File:** `app/(tabs)/health/index.tsx`

Three tabs at top: **Vaccinations | Worms/Ticks/Fleas | Vet Visits**

---

### Tab 1: Vaccinations
**File:** `app/(tabs)/health/vaccinations/index.tsx`

#### Layout
- Grouped list: group by `next_due_date` (Past Due → Today → This Week → Next Month → Future)
- Each group header is coloured: red (overdue), amber (due today/this week), green (future)

#### Vaccination Card
- Vaccine name (DA2PP, Rabies, Bordetella, etc.)
- Dogs included in this vaccination batch (show dog avatars — up to 5, then "+N")
- Date given
- Next due date + countdown ("Due in 14 days" / "OVERDUE 3 days")
- Administered by (vet name)
- Certificate/document link (if stored)

#### Filter Bar
- All | Past Due | Upcoming | Completed
- Dog filter dropdown (show one dog's history)

#### Add Vaccination (admin/trainer)
- Multi-dog selector (checkboxes)
- Vaccine name (dropdown with custom option)
- Date given
- Next due date (auto-calculated based on vaccine type)
- Vet name
- Notes
- Certificate upload (`expo-document-picker`)

---

### Tab 2: Worms / Ticks & Fleas
**File:** `app/(tabs)/health/deworming/index.tsx`

Same layout as vaccinations but queries `deworming_records`.

Fields:
- Treatment type: Dewormer / Tick & Flea / Both
- Product name
- Dogs treated (multi-dog)
- Date treated
- Next due date
- Weight at time of treatment (for dosage record)
- Notes

Show overdue treatments prominently at top with red warning.

---

### Tab 3: Vet Visits
**File:** `app/(tabs)/health/vet-visits/index.tsx`

#### Layout
- Chronological list (newest first)
- Filter: All | Scheduled | Completed | Follow-up Required

#### Vet Visit Card
- Dog name + photo
- Visit date/time
- Vet clinic name
- Reason for visit
- Diagnosis (truncated, tap to expand)
- Follow-up required badge (amber)
- Documents attached (paperclip icon + count)

#### Vet Visit Detail
**File:** `app/(tabs)/health/vet-visits/[id].tsx`
- Full diagnosis
- Treatment given
- Medications prescribed
- Follow-up date + reminder
- Documents (lab results, X-rays, prescriptions) — tap to open
- Internal notes
- Cost (links to finance module)

#### Add Vet Visit (admin/trainer)
- Dog selector
- Visit date/time
- Vet clinic (dropdown with custom)
- Reason
- Diagnosis
- Treatment
- Medications
- Follow-up date toggle
- Document upload (multiple, `expo-document-picker`)
- Cost → option to create invoice

---

## MODULE 6: GENETIC FORECAST TOOL

**File:** `app/(tabs)/genetics/index.tsx`

### Purpose
Allow admin/trainer to select two parent dogs (or enter loci manually) and calculate the statistical probability of offspring coat colours and types for Dobermanns.

---

### Dobermann Colour Loci (used in calculation)

**Colour genes:**
| Locus | Controls | Alleles |
|---|---|---|
| B (TYRP1) | Black vs Brown/Chocolate | B (dominant black), b (recessive brown) |
| D (MLPH) | Dilution | D (full colour), d (dilute = blue/fawn) |

Dobermann standard colours:
- **Black & Rust** = BB or Bb + DD or Dd
- **Red/Brown & Rust** = bb + DD or Dd
- **Blue & Rust** = BB or Bb + dd
- **Fawn (Isabella) & Rust** = bb + dd

**Additional health-relevant loci:**
| Locus | Note |
|---|---|
| vWD (Von Willebrand's) | Autosomal recessive bleeding disorder — show carrier/clear/affected |
| DCM (Dilated Cardiomyopathy) | Risk marker — informational only |

---

### Screen Layout

#### Step 1: Select Parents
- Parent A: dropdown to select from `dogs` table (show name + colour)
- Parent B: dropdown to select from `dogs` table
- OR: "Enter manually" toggle → show loci input fields

#### Step 2: Enter / Confirm Loci

For each parent, show loci input:
- **B locus:** BB / Bb / bb (3 options)
- **D locus:** DD / Dd / dd (3 options)
- **vWD status:** Clear / Carrier / Affected

If dog selected from DB, auto-fill from `dogs.genetics_b_locus`, `dogs.genetics_d_locus`, `dogs.genetics_vwd_status` columns (add these if missing via migration).

#### Step 3: Calculate

On tap "Calculate Offspring Probabilities":

Run Punnett square logic in TypeScript (no external library needed):

```typescript
// Example B locus cross
function crossLocus(parent1: string, parent2: string): Record<string, number> {
  const alleles1 = parent1.split('') // e.g. ['B','b']
  const alleles2 = parent2.split('')
  const results: Record<string, number> = {}
  for (const a1 of alleles1) {
    for (const a2 of alleles2) {
      const combo = [a1, a2].sort().join('') // normalise: Bb not bB
      results[combo] = (results[combo] || 0) + 0.25
    }
  }
  return results
}
```

Combine B and D locus results to produce colour outcomes with percentages.

#### Step 4: Results Display

Show a visually rich results panel:

- Colour swatches with percentage bars (gold progress bars on dark background)
- Each colour:
  - Colour name ("Black & Rust")
  - Colour swatch circle (use actual Dobermann colour hex: `#1a1a1a`, `#8B4513`, `#6B7280`, `#D2691E`)
  - Percentage probability
  - Genotype combinations that produce it

- vWD section:
  - Show % Clear / % Carrier / % Affected
  - Red warning if any % Affected > 0
  - Amber warning if % Carrier > 50%

- Disclaimer: "This tool provides statistical estimates based on classical genetics. DNA testing is recommended for confirmed genotypes."

#### Step 5: PDF Report

"Generate PDF Report" button at bottom.

**PDF contents:**
- Diedericks Dobermanns header (logo + gold bar)
- Report title: "Genetic Forecast Report"
- Date generated
- Parent A details (name, colour, loci)
- Parent B details
- Offspring colour probability table
- vWD probability table
- Colour swatch visual representation (coloured circles)
- Disclaimer
- Footer: "Diedericks Dobermanns | diedericksdobermanns.com"

**Export method:** `expo-print` → `expo-sharing` (same pattern as Finance module PDF).

---

### Database Columns Needed

Add to `dogs` table if not present (write a migration):

```sql
ALTER TABLE dogs
  ADD COLUMN IF NOT EXISTS genetics_b_locus TEXT CHECK (genetics_b_locus IN ('BB','Bb','bb')),
  ADD COLUMN IF NOT EXISTS genetics_d_locus TEXT CHECK (genetics_d_locus IN ('DD','Dd','dd')),
  ADD COLUMN IF NOT EXISTS genetics_vwd_status TEXT CHECK (genetics_vwd_status IN ('clear','carrier','affected'));
```

---

## MODULE 7: DOCUMENTS LIBRARY

**File:** `app/(tabs)/documents/index.tsx`

### Purpose
A centralised, searchable file store for the kennel — health certificates, pedigrees, contracts, photos, training manuals, marketing assets, legal docs.

---

### Layout

#### Header
- Title: "Documents"
- Search bar (search by name, category, tag)
- Filter by category (see below)
- Sort: Newest | Oldest | Name A–Z | Starred first

#### Category Tabs (horizontal scroll)
- All
- General
- Health
- Breeding
- Training
- Legal
- Marketing
- Templates

#### Document Card
- File type icon (PDF 📄 / Image 🖼️ / Video 🎬 / Word 📝 / Spreadsheet 📊)
- File name
- Category badge (coloured pill)
- Uploaded by + date
- File size
- Star/Favourite toggle (⭐ — saves to `kennel_documents.is_starred`)
- Tags (small pills)
- Action row: **Open | Share | Delete**

#### Open Behaviour
- Images/Videos: open in-app viewer (`expo-image` / `expo-av`)
- PDFs: open with `expo-web-browser` or `expo-sharing`
- Other: `expo-sharing` → opens in native app

#### Upload (admin/trainer)
- "Upload Document" FAB
- Opens bottom sheet:
  - File picker (`expo-document-picker`, allow multiple)
  - Category selector
  - Name (auto-filled from filename, editable)
  - Tags (freeform, comma-separated)
  - Link to dog (optional — dropdown)
  - Link to litter (optional — dropdown)
- Upload to Supabase Storage: `kennel-documents/[category]/[uuid]-[filename]`
- Insert row into `kennel_documents`

#### Starred Documents
- "Starred" filter shows `is_starred = true` docs
- Star toggles with optimistic UI update

#### Dog / Litter Linking
- If a document is linked to a dog, show dog avatar
- Tap dog avatar → routes to dog profile
- Dog profile's "Documents" tab also shows these linked docs

#### Delete
- Confirm alert before delete
- Delete from Supabase Storage AND `kennel_documents` table
- Admin only

---

## FILE STRUCTURE SUMMARY

Create or update the following files:

```
app/(tabs)/
  dashboard/
    index.tsx                          ← Dashboard home (all widgets)
  dogs/
    index.tsx                          ← All Dogs grid + filter tabs
    [id].tsx                           ← Dog profile (tabbed)
    litters/
      index.tsx                        ← Litters view (grouped cards)
      [id].tsx                         ← Litter detail
  contacts/
    index.tsx                          ← Contacts CRM (lists + tags)
    [id].tsx                           ← Contact detail
    enquiries/
      [id].tsx                         ← Enquiry detail
  calendar/
    index.tsx                          ← Calendar (day/week/month/year)
  health/
    index.tsx                          ← Health tabs router
    vaccinations/
      index.tsx                        ← Vaccinations list
      [id].tsx                         ← Vaccination detail / edit
    deworming/
      index.tsx                        ← Deworming list
    vet-visits/
      index.tsx                        ← Vet visits list
      [id].tsx                         ← Vet visit detail
  genetics/
    index.tsx                          ← Genetic Forecast tool
  documents/
    index.tsx                          ← Documents library

components/
  dashboard/
    LitterWidget.tsx
    HeatWidget.tsx
    EnquiryWidget.tsx
    TodoWidget.tsx
    QuickStatsRow.tsx
  dogs/
    DogCard.tsx
    DogGrid.tsx
    LitterGroup.tsx
    PuppyCard.tsx
  contacts/
    ContactCard.tsx
    ContactListFilter.tsx
    TagPill.tsx
  calendar/
    MonthGrid.tsx
    WeekGrid.tsx
    DayList.tsx
    EventDot.tsx
    EventBlock.tsx
  health/
    VaccinationCard.tsx
    DewormingCard.tsx
    VetVisitCard.tsx
    MultiDogSelector.tsx
  genetics/
    LocusSelector.tsx
    ColourResultBar.tsx
    ProbabilityTable.tsx
    GeneticPDFExport.ts
  documents/
    DocumentCard.tsx
    DocumentUploadSheet.tsx
    FileTypeIcon.tsx

hooks/
  useDashboard.ts           ← All dashboard widget queries
  useDogs.ts                ← Dog queries with filters
  useContacts.ts            ← Contact queries with tag filtering
  useCalendarEvents.ts      ← Merged event query across all tables
  useHealth.ts              ← Health record queries
  useGenetics.ts            ← Punnett square calculations
  useDocuments.ts           ← Document CRUD

lib/
  genetics/
    punnett.ts              ← Punnett square logic (pure TypeScript)
    dobermann-colours.ts    ← Colour name/hex/genotype mappings
```

---

## SUPABASE QUERIES — KEY PATTERNS

### Dashboard — Parallel Queries
```typescript
// Use Promise.all — never waterfall dashboard queries
const [litters, heats, enquiries, todos] = await Promise.all([
  supabase.from('litters').select('*,dam:dogs!dam_id(*),sire:dogs!sire_id(*)').eq('status','born'),
  supabase.from('heat_cycles').select('*,dog:dogs(*)').gte('next_heat_date', today).order('next_heat_date'),
  supabase.from('enquiries').select('*').eq('status','new').order('created_at', { ascending: false }).limit(5),
  supabase.from('todo_items').select('*').lte('due_date', today).eq('completed', false),
])
```

### Contacts — Tag Filter
```typescript
// tags stored as text[] — use @> operator
const { data } = await supabase
  .from('contacts')
  .select('*')
  .contains('tags', [selectedTag])  // @> array contains
  .ilike('full_name', `%${search}%`)
```

### Calendar — Merge All Events
```typescript
// Fetch all event types in parallel, merge and sort by date client-side
const events = [
  ...litters.map(l => ({ date: l.whelping_date, type: 'litter_birth', colour: '#C4A35A', ...l })),
  ...heats.map(h => ({ date: h.next_heat_date, type: 'heat', colour: '#EC4899', ...h })),
  ...vets.map(v => ({ date: v.visit_date, type: 'vet', colour: '#3B82F6', ...v })),
  ...todos.map(t => ({ date: t.due_date, type: 'todo', colour: t.overdue ? '#EF4444' : '#F5F0E8', ...t })),
].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
```

### Documents — Upload Pattern
```typescript
const uploadDocument = async (file: DocumentPickerAsset, category: string) => {
  const fileName = `${uuid()}-${file.name}`
  const path = `${category}/${fileName}`
  
  // 1. Upload to Storage
  const { error: uploadError } = await supabase.storage
    .from('kennel-documents')
    .upload(path, file.uri)
  
  // 2. Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('kennel-documents')
    .getPublicUrl(path)
  
  // 3. Insert DB record
  await supabase.from('kennel_documents').insert({
    name: file.name,
    category,
    file_url: publicUrl,
    storage_path: path,
    file_size: file.size,
    mime_type: file.mimeType,
    uploaded_by: user.id,
  })
}
```

---

## DATABASE MIGRATION REQUIRED

Run this migration before building the screens:

```sql
-- Migration: add_genetics_and_missing_columns
-- Add genetics columns to dogs
ALTER TABLE dogs
  ADD COLUMN IF NOT EXISTS genetics_b_locus TEXT CHECK (genetics_b_locus IN ('BB','Bb','bb')),
  ADD COLUMN IF NOT EXISTS genetics_d_locus TEXT CHECK (genetics_d_locus IN ('DD','Dd','dd')),
  ADD COLUMN IF NOT EXISTS genetics_vwd_status TEXT CHECK (genetics_vwd_status IN ('clear','carrier','affected')),
  ADD COLUMN IF NOT EXISTS call_sign TEXT,
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS collar_colour TEXT,
  ADD COLUMN IF NOT EXISTS breeding_status TEXT DEFAULT 'not_breeding' CHECK (breeding_status IN ('active','retired','not_breeding'));

-- Add contacts table if not exists
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  id_number TEXT,
  tags TEXT[] DEFAULT '{}',
  is_do_not_sell BOOLEAN DEFAULT FALSE,
  popia_consent BOOLEAN DEFAULT FALSE,
  popia_consent_date TIMESTAMPTZ,
  notes TEXT,
  first_contact_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer_and_above_contacts" ON contacts
  FOR ALL USING (is_trainer_or_above());

-- Do Not Sell: only super_admin can see flagged contacts
CREATE POLICY "super_admin_do_not_sell" ON contacts
  FOR SELECT USING (
    NOT is_do_not_sell OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

-- Add is_starred to kennel_documents if not present
ALTER TABLE kennel_documents
  ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_dog_id UUID REFERENCES dogs(id),
  ADD COLUMN IF NOT EXISTS linked_litter_id UUID REFERENCES litters(id),
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- vet_visits table
CREATE TABLE IF NOT EXISTS vet_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE,
  visit_date TIMESTAMPTZ NOT NULL,
  vet_clinic TEXT,
  vet_name TEXT,
  reason TEXT NOT NULL,
  diagnosis TEXT,
  treatment TEXT,
  medications TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date TIMESTAMPTZ,
  cost NUMERIC(10,2),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE vet_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer_and_above_vet" ON vet_visits FOR ALL USING (is_trainer_or_above());

-- deworming_records table  
CREATE TABLE IF NOT EXISTS deworming_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_ids UUID[] NOT NULL,
  treatment_type TEXT CHECK (treatment_type IN ('dewormer','tick_flea','both')) NOT NULL,
  product_name TEXT,
  date_treated DATE NOT NULL,
  next_due_date DATE,
  weight_kg NUMERIC(5,2),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE deworming_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer_and_above_deworming" ON deworming_records FOR ALL USING (is_trainer_or_above());
```

---

## UI STANDARDS — APPLY TO ALL MODULES

1. **Cards:** `bg-[#1C1A0E]` background, `border border-[#C4A35A]/20` (subtle gold border), `rounded-xl`, `p-4`
2. **Section headings:** Cinzel font, gold colour `#C4A35A`, `text-lg`
3. **Body text:** Lato font, `#F5F0E8`
4. **Muted text:** `#F5F0E8` at 60% opacity
5. **Status badges:** Pill shape, colour per status:
   - Available: `bg-green-900/50 text-green-400`
   - Reserved: `bg-amber-900/50 text-amber-400`
   - Sold: `bg-gray-700/50 text-gray-400`
   - Overdue/Alert: `bg-red-900/50 text-red-400`
6. **Loading states:** Gold shimmer skeleton `animate-pulse bg-[#C4A35A]/10`
7. **Empty states:** Centred, gold Dobermann silhouette icon, white message, gold "Add First [Item]" button
8. **FAB (Floating Action Button):** Bottom-right, `bg-[#C4A35A]`, black icon, shadow
9. **Bottom sheets:** `@gorhom/bottom-sheet`, dark background, drag handle in gold
10. **Swipe actions:** `react-native-gesture-handler` — swipe left to delete (red), swipe right to star (gold)
11. **Pull to refresh:** Gold `RefreshControl` tint

---

## NAVIGATION TABS — UPDATE IF NEEDED

Ensure bottom tab bar includes (or update) these tabs visible to admin/trainer:

| Tab | Icon | Screen |
|---|---|---|
| Home | house | `/(tabs)/dashboard` |
| Dogs | paw-print | `/(tabs)/dogs` |
| Health | heart-pulse | `/(tabs)/health` |
| Calendar | calendar | `/(tabs)/calendar` |
| Contacts | users | `/(tabs)/contacts` |
| Finance | banknotes | `/(tabs)/finance` |
| Documents | folder | `/(tabs)/documents` |
| Settings | cog | `/(tabs)/settings` |

Icons from `lucide-react-native`. Only show Finance, Documents, Contacts to `admin` and above.

---

## TESTING CHECKLIST

Before considering any module complete:

- [ ] All queries return real data from Supabase (not mock)
- [ ] Empty states shown when no data exists
- [ ] Error states handled (show toast, not crash)
- [ ] Loading skeletons show on first load
- [ ] Pull-to-refresh works on all list screens
- [ ] Add/Edit forms validate and show errors
- [ ] All navigation links route to correct screens
- [ ] Admin-only UI elements hidden from lower roles (check `profiles.role`)
- [ ] RLS policies block unauthorized access at DB level
- [ ] PDF export generates and opens share sheet
- [ ] Tap-to-call and WhatsApp links work on device
- [ ] Document upload compresses images before upload
- [ ] Calendar loads events from all 5+ sources without waterfall delay
- [ ] Genetics calculator produces correct probabilities (test: Bb × Bb should give 25% BB, 50% Bb, 25% bb)

---

## EXECUTION ORDER

Build in this order to avoid import errors:

1. Run the database migration above
2. Regenerate `database.types.ts` (`supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > database.types.ts`)
3. Build `lib/genetics/punnett.ts` and `lib/genetics/dobermann-colours.ts` (pure logic, no Supabase)
4. Build all custom hooks (`hooks/use*.ts`)
5. Build shared components (`components/*/`)
6. Build screens in order: Dashboard → Dogs → Health → Calendar → Contacts → Genetics → Documents
7. Update tab bar navigation
8. Test all screens with real data

---

*End of Cursor Prompt — Phase 10: Dashboard, Dogs, Contacts, Calendar, Health, Genetics & Documents*
*Diedericks Dobermanns | Premium Dobermann Platform*
