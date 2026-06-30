# Cursor Prompt — Litter Whelping & Puppy Weight Tracker

## Reference Design
The screenshots from DogBreederPro define the UX target. Study them before building:
- **View 1:** Per-female litter history — columns: Date | Sire | Male Puppies | Female Puppies | Notes | Reports
- **View 2:** All-company litters list — grouped by date, puppy cards with sex-border (pink/blue) + collar label
- **View 3:** Weight grid — spreadsheet style, rows = pups, columns = dates, each cell = "1 kg 129 g"
- **View 4:** Individual pup growth chart — dual X-axis (actual date top, day age bottom), grams on Y
- **View 5:** Litter detail full tab bar — Puppies | Calendar | Weights | Notes | Health | Photos | Reports | Contracts | Sharing | Documents | To-dos | Financials
- **View 6:** Health tab — UPCOMING / PAST sections, Date | Type | Description | Puppies table, add buttons at bottom
- **View 7:** Photos tab — LITTER PHOTOS section + PUPPY PHOTOS table per pup
- **View 8:** Reports tab — Litter Reports (AKC Litter Report, Litter Report PDF) + Puppy Reports (pedigrees, medical, dog report) with per-puppy PDF icons
- **View 9:** Sharing tab — chip toggles for public sections + per-puppy Public Page / Pedigree toggles
- **View 10:** To-dos tab — Litter To-Dos and Puppy To-Dos sections with due date, title, description
- **View 11:** Financials tab — ZAR transaction form with link to litter/dog/contact, line items, subtotal/tax/total

Apply the Diedericks Dobermanns brand — dark, gold, premium — not the light blue DogBreederPro style.

---

## Stack Context
- React Native, Expo SDK 56, TypeScript strict, Expo Router, NativeWind
- Supabase project: nlmwxodvquwbjinhhbmr
- Brand: Background `#111008`, Surface `#1C1A0E`, Gold `#C4A35A`, Text `#F5F0E8`
- **Step 1 always:** `npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > types/supabase.ts`

---

## What Already Exists — Read Before Starting

| File | What it does |
|------|-------------|
| `app/(admin)/litters/index.tsx` | Basic litter list — needs full replacement |
| `app/(admin)/litters/new.tsx` | Uses `LitterForm` — keep |
| `app/(admin)/litters/[id]/index.tsx` | Tabbed detail: Overview / Puppies / Weights / Documents |
| `components/litters/LitterWeightsTab.tsx` | Weight entry + accordion + chart — replace weight entry part |
| `components/litters/WeightEntryForm.tsx` | Single entry form — replace with grid |
| `components/litters/PuppyGrowthChart.tsx` | SVG line chart — upgrade |
| `hooks/useLitterWeights.ts` | Fetches puppies + weight_logs — extend |

### Existing database columns
- `dogs`: id, name, sex, colour, **collar_colour ✅**, litter_id, date_of_birth, status, mother_id, father_id
- `litters`: id, name, litter_letter, actual_date, expected_date, go_home_date, male_count, female_count, mother_id, father_id, status, description
- `weight_logs`: id, dog_id, weight_kg, recorded_date (DATE), notes, created_at

---

## TASK 1 — Database migrations

### Migration 0017 — litter_weight_timestamps.sql

```sql
-- Timestamp support for twice-daily weighings
ALTER TABLE weight_logs
  ADD COLUMN IF NOT EXISTS recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS session text CHECK (session IN ('AM', 'PM', 'daily')) DEFAULT 'daily';

-- Per-puppy birth weight
ALTER TABLE dogs
  ADD COLUMN IF NOT EXISTS birth_weight_grams integer;

-- Whelp time on litter
ALTER TABLE litters
  ADD COLUMN IF NOT EXISTS actual_time time;

-- Notes columns for litter
ALTER TABLE litters
  ADD COLUMN IF NOT EXISTS whelping_notes text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Deceased count per litter
ALTER TABLE litters
  ADD COLUMN IF NOT EXISTS deceased_count integer NOT NULL DEFAULT 0;
```

### Migration 0018 — litter_health_photos_todos.sql

```sql
-- HEALTH RECORDS (vaccinations, dewormings, vet visits, health tests)
CREATE TABLE IF NOT EXISTS puppy_health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  litter_id uuid REFERENCES litters(id) ON DELETE CASCADE,
  dog_id uuid REFERENCES dogs(id) ON DELETE CASCADE,  -- null = whole litter
  record_type text NOT NULL CHECK (record_type IN ('vaccination', 'deworming', 'vet_visit', 'health_test')),
  record_date date NOT NULL,
  type_label text NOT NULL,           -- e.g. "Worms, Ticks, Fleas"
  description text NOT NULL,          -- e.g. "Deworming"
  notes text,
  administered_by text,
  next_due_date date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE puppy_health_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_health" ON puppy_health_records
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "client_view_own_health" ON puppy_health_records
  FOR SELECT USING (
    dog_id IN (
      SELECT d.id FROM dogs d
      INNER JOIN puppy_reservations pr ON pr.dog_id = d.id
      WHERE pr.client_id = auth.uid()
    )
  );

-- LITTER & PUPPY PHOTOS (stored in Supabase Storage bucket: litter-media)
CREATE TABLE IF NOT EXISTS litter_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  litter_id uuid REFERENCES litters(id) ON DELETE CASCADE,
  dog_id uuid REFERENCES dogs(id) ON DELETE CASCADE,  -- null = litter-level photo
  media_type text NOT NULL CHECK (media_type IN ('photo', 'video')),
  storage_path text NOT NULL,    -- path inside 'litter-media' bucket
  public_url text NOT NULL,
  caption text,
  sort_order integer DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE litter_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_media" ON litter_media
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "client_view_litter_media" ON litter_media
  FOR SELECT USING (
    litter_id IN (
      SELECT d.litter_id FROM dogs d
      INNER JOIN puppy_reservations pr ON pr.dog_id = d.id
      WHERE pr.client_id = auth.uid() AND d.litter_id IS NOT NULL
    )
  );

-- LITTER TO-DOS (litter level and per-puppy)
CREATE TABLE IF NOT EXISTS litter_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  litter_id uuid REFERENCES litters(id) ON DELETE CASCADE,
  dog_id uuid REFERENCES dogs(id) ON DELETE CASCADE,  -- null = litter-level
  due_date date,
  title text NOT NULL,
  description text,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE litter_todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_todos" ON litter_todos
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- LITTER TRANSACTIONS (financials)
CREATE TABLE IF NOT EXISTS litter_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  litter_id uuid REFERENCES litters(id) ON DELETE CASCADE,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  category text,
  currency text NOT NULL DEFAULT 'ZAR',
  amounts_tax_mode text DEFAULT 'exclusive' CHECK (amounts_tax_mode IN ('inclusive', 'exclusive')),
  invoice_number text,
  notes text,
  attachment_path text,
  subtotal_cents integer NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS litter_transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES litter_transactions(id) ON DELETE CASCADE,
  dog_id uuid REFERENCES dogs(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  sort_order integer DEFAULT 0
);

ALTER TABLE litter_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE litter_transaction_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_transactions" ON litter_transactions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_all_transaction_items" ON litter_transaction_items
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- PUPPY PUBLIC SHARING SETTINGS
CREATE TABLE IF NOT EXISTS puppy_sharing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid REFERENCES dogs(id) ON DELETE CASCADE UNIQUE,
  is_public_page boolean DEFAULT false,
  is_pedigree_public boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE puppy_sharing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_sharing" ON puppy_sharing
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Shared sections on litter (stored as array of enabled section keys)
ALTER TABLE litters
  ADD COLUMN IF NOT EXISTS public_sections text[] DEFAULT '{}';
  -- Values: 'physical_attributes', 'genetic_tests', 'health_tests', 'vet_visits',
  --         'vaccinations', 'dewormings', 'breeding_info', 'gallery'

-- Indexes
CREATE INDEX IF NOT EXISTS idx_puppy_health_litter ON puppy_health_records(litter_id);
CREATE INDEX IF NOT EXISTS idx_puppy_health_dog ON puppy_health_records(dog_id);
CREATE INDEX IF NOT EXISTS idx_litter_media_litter ON litter_media(litter_id);
CREATE INDEX IF NOT EXISTS idx_litter_media_dog ON litter_media(dog_id);
CREATE INDEX IF NOT EXISTS idx_litter_todos_litter ON litter_todos(litter_id);
CREATE INDEX IF NOT EXISTS idx_litter_transactions_litter ON litter_transactions(litter_id);
```

---

## TASK 2 — Replace `app/(admin)/litters/index.tsx` — Two Views

This screen needs a **view toggle**: ALL LITTERS | BY FEMALE

### View A: ALL LITTERS (company-wide)
Mirrors DogBreederPro screenshot 2 — all litters the kennel has produced, most recent first.

**Layout:**
```
[ALL LITTERS]  [BY FEMALE]        ← toggle chips top right
[+ NEW LITTER]                    ← button top left

────────────────────────────────
5 Jun 2026  (10 weeks: 14 Aug)   [Go To Litter →]
Litter I · Dam: Cyprys De Zelig · Sire: Hillo Betelges

[Pink card ♀]          [Blue card ♂]          [Blue card ♂]
Puppy 1 (Black)        Puppy 2 (Brown)        Puppy 3
5 Jun '26 · 2w 6d      5 Jun '26 · 2w 6d      Collar: Orange
Collar: Red            Collar: Blue
```

**Puppy card rules:**
- Pink left border (`border-l-4 border-pink-400`) = female
- Blue left border (`border-l-4 border-blue-400`) = male
- Show: name (colour in brackets), age string, collar dot + label
- Tap puppy card → `/(admin)/dogs/${puppy.id}`
- Tap "Go To Litter →" → `/(admin)/litters/${litter.id}`

**Active litters** (status = whelped, born, nursing) at top with gold "ACTIVE" badge.
**Completed litters** collapsible section below.

### View B: BY FEMALE
Mirrors DogBreederPro screenshot 1 — per-female breeding history table.

**Layout:**
```
[Female picker — All Females | Cyprys | Cendra | ...]

Table columns (horizontal scroll):
Date        | Sire              | ♂ Males          | ♀ Females       | Notes          | Actions
────────────────────────────────────────────────────────────────────────────────────────────
4 Apr 2023  | Hillo Betelges    | Diablo           | Puppy 1 Shasha  | Deceased: 2    | [View]
8wk 30 May  |                   | Bliksem Elite    | Cendra D        |                | [Report]
```

---

## TASK 3 — New screen: `app/(admin)/litters/[id]/register-pups.tsx`

Fast pup registration at birth.

**Header:** "REGISTER PUPS — Litter [Letter]"
**Running total strip (updates live):** `♂ 2   ♀ 1   Total: 3   ● Red Male  ● Blue Female  ● Green Male`

**Form per pup:**
```
PUP #[N]
TIME BORN          [time picker — default: now]
SEX                [♂ MALE]  [♀ FEMALE]  ← large gold toggle
COLOUR             [text — "Black & Tan"]
COLLAR COLOUR      Chip grid (3 per row): ● Red ● Blue ● Green ● Yellow ● Pink ● Orange ● Purple ● White ● Black ● None
                   (warn if colour already used in this litter)
BIRTH WEIGHT       [____] g  →  live preview: "= 0.45 kg"

[  SAVE & ADD NEXT PUP  ]
[  LITTER COMPLETE — DONE  ]  ← appears after 1st pup saved
```

On save: insert `dogs` row (name = `[LitterLetter][N]`, sex, colour, collar_colour, date_of_birth, litter_id, status = 'puppy', birth_weight_grams) + insert `weight_logs` row (weight_kg = grams/1000, recorded_date = actual_date, session = 'AM').
On Done: update litter male_count, female_count → navigate to litter detail Weights tab.

---

## TASK 4 — Replace `components/litters/WeightEntryForm.tsx` with `WeightGrid.tsx`

Spreadsheet grid — DogBreederPro screenshot 3 style.

```
WEIGHING SESSION
[AM — Morning]  [PM — Evening]  [Daily]      ← auto-selected by time of day
Date: [today]   Time: [now]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                          Week 3
 #   Puppy         17 Jun    18 Jun    19 Jun
 1  ● Red  Hunter  1kg 129g  1kg 189g  [____g]
 2  ● Blue Diesel  1kg 310g  1kg 390g  [____g]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[LOG SESSION WEIGHTS]
```

- Historical cells: read-only. Current session: editable text input (grams).
- Display: ≥1000g → "1 kg 129 g", <1000g → "450 g"
- Upsert per puppy + date + session — no duplicates.
- Week grouping header calculated from whelp date.

---

## TASK 5 — Upgrade `components/litters/PuppyGrowthChart.tsx`

Target: DogBreederPro screenshots 4 & 5.

1. **Dual X-axis** — top: actual dates, bottom: day ages (0d, 2d, 4d…)
2. **Y-axis in grams** — auto-scale: <1500g show full grams, >1500g switch to kg
3. **Lines coloured by collar colour** — `COLLAR_COLOURS[collar_colour].hex`
4. **Tap legend item** → isolate that pup (others fade to 20% opacity)
5. **Day 14 phase marker** — vertical dashed gold line labelled "Daily →"
6. **PDF export** (top right) → `expo-print` generates chart + weight table as PDF

---

## TASK 6 — Upgrade `hooks/useLitterWeights.ts`

```ts
export interface LitterPuppy {
  id: string
  name: string
  sex: string | null
  colour: string | null
  collar_colour: string | null      // ADD
  birth_weight_grams: number | null // ADD
}

export interface PuppyWeightLog {
  id: string
  dog_id: string
  weight_kg: number
  recorded_date: string
  recorded_at: string | null              // ADD
  session: 'AM' | 'PM' | 'daily' | null  // ADD
  notes: string | null
}

// Add batch upsert
async function logWeightsBatch(
  entries: { puppyId: string; weightKg: number }[],
  session: 'AM' | 'PM' | 'daily',
  recordedAt: Date,
): Promise<void>

export interface WeighingSummary {
  ageDays: number
  phase: 'twice-daily' | 'daily' | 'complete'
  lastWeighedAt: Date | null
  isDueNow: boolean
  isDueSoon: boolean
  nextSessionLabel: string
}
```

---

## TASK 7 — Add `app/(admin)/dogs/[id]/litter-history.tsx`

Per-female breeding history table. Route: `/(admin)/dogs/${dogId}/litter-history`
Summary strip: total litters, total puppies born, deceased count.
Table: Date | Sire | Males | Females | Notes (deceased count) | [View] [Report]
Add link from female dog detail screen → Overview tab → "LITTER HISTORY" button.

---

## TASK 8 — Upgrade `app/(admin)/litters/[id]/index.tsx` — 12-Tab Detail Screen

Expand to a **horizontally scrollable tab bar** (12 tabs — too many for fixed width):

```
Puppies | Calendar | Weights | Notes | Health | Photos | Reports | Contracts | Sharing | Documents | To-dos | Financials
```

Implement each tab as its own component file (no tab over 300 lines). Tab bar scrolls horizontally with the active tab highlighted in gold.

---

### Tab: Puppies
Existing tab — keep and improve. List all pups in the litter with collar dot, sex badge, birth weight, age. Tap → dog detail. "Register More Pups" button routes to `register-pups.tsx`.

---

### Tab: Calendar
Future scope — stub with "Coming Soon" placeholder. Reserve the route.

---

### Tab: Weights
Uses upgraded `WeightGrid.tsx` and `PuppyGrowthChart.tsx`. Add weighing schedule strip showing current phase and next due session.

---

### Tab: Notes
Editable text area for whelping notes + general litter notes. Auto-save on blur. Shows last updated timestamp.

---

### Tab: Health
**Reference: DogBreederPro screenshot — Health tab**

Two sections: **UPCOMING** and **PAST** (split by today's date).

**Table layout per section:**
```
DATE        TYPE                 DESCRIPTION    PUPPIES
─────────────────────────────────────────────────────────────
3 Jul 2026  Worms, Ticks, Fleas  Deworming     [♀ Puppy 1 (Black)]  [🗑]
19 Jun 2026 Worms, Ticks, Fleas  Deworming     [♀ Puppy 1 (Black)]  [🗑]
```

- Puppies column shows sex icon + name badge (collared pill). If `dog_id` is null → shows "All Puppies" badge.
- Tap row → edit sheet (date, type, description, puppies, notes, next due date).

**Add buttons at bottom:**
```
[+ Add Vaccinations]  [+ Add Dewormings]  [+ Add Vet Visit]  [+ Add Health Test]
```

Each opens a bottom sheet with fields:
- Record type (pre-filled by button)
- Type label (e.g. "Worms, Ticks, Fleas" / "DHPP" / "Hip X-Ray")
- Description (e.g. "Deworming", "Vaccination", "OFA Hip Screening")
- Date (date picker)
- Applies to: [All Puppies] or [Select puppies → multi-select chips]
- Notes (optional)
- Administered by (optional)
- Next due date (optional)

On save: insert one `puppy_health_records` row per selected puppy (or one row with dog_id null for "All Puppies").

**Hook:** `hooks/useLitterHealth.ts` — fetches all health records for this litter_id, split into upcoming/past.

**Component:** `components/litters/LitterHealthTab.tsx`

---

### Tab: Photos
**Reference: DogBreederPro screenshot — Photos tab**

Two sections:

**LITTER PHOTOS**
```
[+]  [photo thumb]  [photo thumb]   ← horizontal scroll grid
```
- Tap [+] → `expo-image-picker` (multi-select, compress with expo-image-manipulator, max 1200px)
- Upload to Supabase Storage bucket `litter-media` at path `litters/{litter_id}/litter/{uuid}.jpg`
- Insert `litter_media` row with `dog_id = null`
- Tap existing photo → full-screen lightbox with delete option

**PUPPY PHOTOS**
```
Table:
#   PUPPY               PHOTOS
1   [♀] Puppy 1 (Black)  [photo1] [photo2] [+]
2   [♂] Puppy 2 (Brown)  [+]
```
- Per-puppy row with sex icon + name
- [+] tap → picker → upload to `litters/{litter_id}/puppies/{dog_id}/{uuid}.jpg`
- Insert `litter_media` row with `dog_id = dog.id`
- Tap thumbnail → lightbox

**Hook:** `hooks/useLitterMedia.ts` — fetches litter_media rows split by dog_id null vs per-puppy.
**Component:** `components/litters/LitterPhotosTab.tsx`

---

### Tab: Reports
**Reference: DogBreederPro screenshot — Reports tab**

**LITTER REPORTS section:**
```
[📄 AKC Litter Report]   [📄 Litter Report]
```

**PUPPY REPORTS section:**
```
[📋 All pedigrees]   [📋 All medical reports]   [📋 All dog reports]
Excludes deceased & stillborn puppies.

#   PUPPY               PEDIGREE    MEDICAL REPORT    DOG REPORT
1   [♀] Puppy 1 (Black)   [📄]          [📄]              [📄]
```

**PDF generation using `expo-print` + `expo-sharing`:**

**Litter Report PDF format (based on screenshot):**
```
LITTER RECORD
Dam's AKC# | Dam's Name: [name]     | Date of Birth: [date]
Sire's AKC# | Sire's Name: [name]   | # Male Puppies: [n]
Litter #: [letter] | Sire Owner | Breed: Dobermann Pinscher | # Female Puppies: [n]

Table:
NEW OWNER INFORMATION          | PUPPY INFORMATION                    | DISPOSITION
Name, Address & Tel | Email    | Puppy# | Sex | Microchip/Tattoo | Color & Markings | Date Transferred/Deceased | Papers Y/N | Limited Y/N
```

**Dog Report PDF format (based on screenshot):**
```
[Puppy Name]
Whelping Type | Litter Number | Puppies Born | Puppies Deceased

DAM: [Name]
DOB | Breed | Microchip | Tattoo | Registrations | Owner | Photo

SIRE: [Name]
DOB | Breed | Microchip | Tattoo | Registrations | Owner | Photo

PUPPIES - Puppy Details
# | Sex | Name | Color / Markings | Identifiers

NEW OWNER DETAILS
# | Sex | Identifiers | Date Transferred | New Owner | Papers Provided | Price

DECEASED PUPPIES
# | Sex | Date of Death | Cause of Death
```

**Pedigree PDF format (4-generation tree):**
```
[Puppy Name]
Breed: Dobermann Pinscher | DOB: [date] | Gender: [sex]
Wright's COI: [%] | Color: [colour]

[4-generation pedigree table with Wright's COI per ancestor]
- Show photos for dam and sire
- Show registrations (KUSA, KSS, etc.)
```

All PDFs: use `expo-print` to generate HTML template → PDF, then `expo-sharing` to share/export.

**Hook:** `hooks/useLitterReports.ts` — fetches dam, sire, all puppies with pedigree data for PDF population.
**Component:** `components/litters/LitterReportsTab.tsx`
**PDF templates:** `lib/reports/litterReportPdf.ts`, `lib/reports/dogReportPdf.ts`, `lib/reports/pedigreePdf.ts`

---

### Tab: Contracts
Stub for now — reserved for puppy sale contracts. Show "Contracts coming soon" with a note that it links to puppy sales flow.

---

### Tab: Sharing
**Reference: DogBreederPro screenshot — Sharing tab**

**SECTIONS SHARED ON PUBLIC PAGE:**
```
[Select all]
[Physical attributes ✓]  [Genetic tests ✓]  [Health tests ✓]  [Vet visits]
[Vaccinations ✓]  [Dewormings]  [Breeding info ✓]  [Gallery ✓]
```
Active = gold filled chip. Inactive = outlined chip.

**Per-puppy sharing:**
```
#   PUPPY               PUBLIC PAGE    PEDIGREE
1   [♀] Puppy 1 (Black)  [toggle]       [toggle]
```

On change: upsert `puppy_sharing` row for each dog. Upsert `litters.public_sections` array.

Section keys: `physical_attributes`, `genetic_tests`, `health_tests`, `vet_visits`, `vaccinations`, `dewormings`, `breeding_info`, `gallery`

**Hook:** `hooks/useLitterSharing.ts`
**Component:** `components/litters/LitterSharingTab.tsx`

---

### Tab: Documents
Existing documents tab — keep. Filter to non-photo attachments (PDFs, contracts, vet certificates).

---

### Tab: To-dos
**Reference: DogBreederPro screenshot — To-dos tab**

Top bar: `[☑ Show Completed]` checkbox on left, `[+ Add To-Do Item]` button on right.

**LITTER TO-DOS section:**
Tasks with `dog_id = null` — apply to the whole litter.

**PUPPY TO-DOS section:**
Tasks with `dog_id` set.
```
Table:
[☑ 1/2]  DUE DATE     TITLE      DESCRIPTION                          [🗑]
          3 Jul 2026   Deworming  Deworm Cryres puppy - 2nd deworming
```
- Checkbox = completion toggle. Number badge (e.g. 1/2) shows how many of this pup's todos are done.
- Tap row → edit sheet.
- [+ Add To-Do Item] bottom sheet: Applies to (Whole Litter / select puppy), Due Date, Title, Description.

**Auto-populate to-dos on litter creation:**
When a litter is registered, auto-create standard to-dos:
- Deworming #1 at Day 14 (for all puppies)
- Deworming #2 at Day 28
- Deworming #3 at Day 42
- First vaccination at Day 49
- Second vaccination at Day 63

**Hook:** `hooks/useLitterTodos.ts`
**Component:** `components/litters/LitterTodosTab.tsx`

---

### Tab: Financials
**Reference: DogBreederPro screenshot — Financials tab**

**Add Transaction form:**
```
ATTACHMENT
[Drop file or Browse]  ← expo-document-picker for invoice/receipt PDF

Date *          Invoice Number (optional)
Type *          Category *
[Expense ▼]     [e.g. Veterinary]
Note (optional)

LINK ALL ITEMS
[+ Link contact]  [+ Link dog]  [+ Link litter]
[🐾 (Litter I: 5 Jun 2026) ×]   ← litter auto-linked

LINE ITEMS
Currency                    Amounts and tax
[South African Rand (ZAR) ▼] [Tax-exclusive ▼]

Description     Linked To          Amount    Tax    [🗑]
[_________]     [contact][dog][+]  [0,00]   [0,00]
[🐾 litter tag]
[+ Add Line Item]

─────────────────────────────
Subtotal        ZAR      0.00
Tax                       0.00
Total           ZAR      0.00

[Cancel]   [Save Transaction]
```

**Transaction list** (above form — shows existing transactions):
- Type badge (income = green, expense = red)
- Date, category, total
- Tap → expand to see line items
- Delete button on each

**Amount handling:**
- All amounts stored as integer cents (R 1 500.00 → 150000 cents)
- Display: `R 1 500.00` format
- Tax calculated: amount_cents × tax_rate or entered manually

**Hook:** `hooks/useLitterFinancials.ts`
**Component:** `components/litters/LitterFinancialsTab.tsx`
**Sub-components:** `components/litters/TransactionForm.tsx`, `components/litters/TransactionList.tsx`

---

## COLLAR COLOUR SYSTEM

```ts
// lib/litters/collarColours.ts
export const COLLAR_COLOURS = [
  { id: 'red',    label: 'Red',    hex: '#ef4444' },
  { id: 'blue',   label: 'Blue',   hex: '#3b82f6' },
  { id: 'green',  label: 'Green',  hex: '#22c55e' },
  { id: 'yellow', label: 'Yellow', hex: '#eab308' },
  { id: 'pink',   label: 'Pink',   hex: '#ec4899' },
  { id: 'orange', label: 'Orange', hex: '#f97316' },
  { id: 'purple', label: 'Purple', hex: '#a855f7' },
  { id: 'white',  label: 'White',  hex: '#f8fafc' },
  { id: 'black',  label: 'Black',  hex: '#374151' },
  { id: 'none',   label: 'No collar', hex: '#6b7280' },
] as const

export type CollarColourId = (typeof COLLAR_COLOURS)[number]['id']

export function collarHex(id: string | null): string {
  return COLLAR_COLOURS.find(c => c.id === id)?.hex ?? '#6b7280'
}

export function CollarDot({ colour, size = 10 }: { colour: string | null; size?: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: collarHex(colour),
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
    }} />
  )
}
```

---

## WEIGHING SCHEDULE RULES

```ts
// Phase 1: Days 0–13   → TWICE DAILY (AM ~06:00 + PM ~18:00)
// Phase 2: Days 14–70  → ONCE DAILY (session = 'daily')
// Phase 3: Day 71+     → COMPLETE

// DUE NOW (phase 1): last weight > 10 hours ago
// DUE NOW (phase 2): last weight > 22 hours ago
// DUE SOON: within 2 hours of due
```

---

## FILE STRUCTURE

```
supabase/migrations/
  0017_litter_weight_timestamps.sql
  0018_litter_health_photos_todos.sql

lib/litters/
  collarColours.ts
lib/reports/
  litterReportPdf.ts
  dogReportPdf.ts
  pedigreePdf.ts

app/(admin)/litters/
  index.tsx                               ← REPLACE — two views
  [id]/
    index.tsx                             ← UPGRADE — 12 scrollable tabs
    register-pups.tsx                     ← CREATE

app/(admin)/dogs/[id]/
  litter-history.tsx                      ← CREATE

components/litters/
  PuppyCard.tsx                           ← pink/blue border card + collar dot
  LitterRow.tsx                           ← per-female table row
  CollarPicker.tsx                        ← chip grid
  WeightGrid.tsx                          ← spreadsheet entry (TASK 4)
  PuppyGrowthChart.tsx                    ← UPGRADE (TASK 5)
  LitterWeightsTab.tsx                    ← uses WeightGrid
  LitterHealthTab.tsx                     ← TASK 8 Health
  LitterPhotosTab.tsx                     ← TASK 8 Photos
  LitterReportsTab.tsx                    ← TASK 8 Reports
  LitterSharingTab.tsx                    ← TASK 8 Sharing
  LitterTodosTab.tsx                      ← TASK 8 To-dos
  LitterFinancialsTab.tsx                 ← TASK 8 Financials
  TransactionForm.tsx                     ← used by LitterFinancialsTab
  TransactionList.tsx                     ← used by LitterFinancialsTab

hooks/
  useLitterWeights.ts                     ← EXTEND
  useFemaleLitterHistory.ts               ← CREATE
  useLitterHealth.ts                      ← CREATE
  useLitterMedia.ts                       ← CREATE
  useLitterReports.ts                     ← CREATE
  useLitterSharing.ts                     ← CREATE
  useLitterTodos.ts                       ← CREATE
  useLitterFinancials.ts                  ← CREATE
```

---

## CRITICAL WARNINGS

- `recorded_date` (DATE) must STILL be written on every `weight_logs` row. Write BOTH `recorded_date` AND `recorded_at`.
- Birth weight stored as `grams` in `dogs.birth_weight_grams`, as `kg` in `weight_logs.weight_kg` — divide by 1000.
- Collar colour stored as text id (`'red'`) — never store hex directly.
- All financial amounts stored as **integer cents** — never floats for money.
- PDF templates are HTML strings passed to `expo-print` — use inline CSS only (no external stylesheets).
- Supabase Storage bucket name: `litter-media` — create this bucket if it doesn't exist (set public = false, use signed URLs).
- Health records with `dog_id = null` mean "applies to whole litter" — handle this in display logic.
- Tab bar with 12 tabs must be horizontally scrollable — use `ScrollView horizontal` for the tab strip.
- Keep all files under 300 lines — every tab is its own component file.
- `npx tsc --noEmit` must pass before done.

---

## TESTING CHECKLIST

**Litter index — ALL view:**
- [ ] Litters grouped by date, most recent first
- [ ] Puppy cards show pink/blue left border by sex
- [ ] Collar colour dot visible on each card
- [ ] ACTIVE badge on current litters
- [ ] "Go To Litter" navigates correctly

**Litter index — BY FEMALE view:**
- [ ] Female picker lists all dams
- [ ] Table: Date, Sire, Males, Females, Notes (deceased), View button
- [ ] Report action per row

**Register pups:**
- [ ] Running total strip updates after each save
- [ ] Collar colour duplicate warning fires
- [ ] Both `dogs` and `weight_logs` rows inserted correctly
- [ ] "Done" updates litter counts

**Weight grid:**
- [ ] Rows = puppies with collar dot
- [ ] Columns = dates scrolling right
- [ ] Week grouping header correct
- [ ] Batch save inserts one row per puppy, no duplicates

**Growth chart:**
- [ ] Lines coloured by collar colour
- [ ] Dual X-axis (dates top, day ages bottom)
- [ ] Y-axis in grams
- [ ] Day 14 phase marker visible
- [ ] Tap legend → isolates pup
- [ ] PDF export generates and opens share sheet

**Health tab:**
- [ ] UPCOMING / PAST split by today
- [ ] Correct DATE | TYPE | DESCRIPTION | PUPPIES columns
- [ ] All 4 add buttons open correct bottom sheet
- [ ] Delete removes row
- [ ] "All Puppies" badge shows when dog_id is null

**Photos tab:**
- [ ] Litter-level photos upload and display in grid
- [ ] Per-puppy photos upload and display per row
- [ ] Tap thumbnail opens fullscreen lightbox
- [ ] Delete photo removes from storage + DB

**Reports tab:**
- [ ] Litter Report PDF generates with dam/sire/puppy table
- [ ] Dog Report PDF generates with full litter details
- [ ] Pedigree PDF generates 4-generation tree with COI
- [ ] All pedigrees / all medical / all dog reports batch generate
- [ ] Excludes deceased puppies from batch reports

**Sharing tab:**
- [ ] Section chips toggle on/off and persist to DB
- [ ] "Select all" selects all 8 sections
- [ ] Per-puppy public page toggle persists
- [ ] Per-puppy pedigree toggle persists

**To-dos tab:**
- [ ] "Show Completed" toggle filters completed items
- [ ] Litter-level and puppy-level todos in separate sections
- [ ] Completion checkbox toggles and saves
- [ ] Add to-do bottom sheet saves correctly
- [ ] Auto-populated deworming/vaccination todos created on litter registration
- [ ] Due date shows on each puppy todo row

**Financials tab:**
- [ ] Income and expense transactions both save
- [ ] Line items calculate subtotal correctly (amounts in cents)
- [ ] Tax computed correctly
- [ ] Attachment upload works (PDF invoice)
- [ ] Link to litter auto-populates on new transaction
- [ ] Link to specific dog works on line items
- [ ] Transaction list shows correct type badge (income=green, expense=red)
- [ ] Delete transaction removes all line items via CASCADE

**Female litter history:**
- [ ] Accessible from female dog detail screen
- [ ] Table shows all past litters
- [ ] Summary strip: total litters, pups, deceased
- [ ] View → navigates to litter detail
