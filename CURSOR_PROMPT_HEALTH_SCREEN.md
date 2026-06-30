# CURSOR PROMPT — Health Screen (Vaccinations, Worms/Ticks & Fleas, Vet Visits)

## Context

**Project:** Diedericks Dobermanns mobile app
**File to update:** `app/(admin)/health/index.tsx` (and sub-screens)
**Stack:** React Native, Expo Router, TypeScript, Supabase, NativeWind
**Brand:** Background `#111008`, Surface `#1C1A0E`, Gold `#C4A35A`, Text `#F5F0E8`

---

## What's Already in the Database (DO NOT recreate)

### Tables
- `vaccinations` — vaccine_name, date_administered, next_due_date, schedule_type, doctor_name, vet_practice_id, health_product_id
- `deworming_records` — product_name, treatment_date, next_due_date, schedule_type, treatment_type ('deworming'|'tick_flea'|'both'), doctor_name, vet_practice_id, health_product_id
- `vet_visits` — visit_date, reason, next_due_date, schedule_type, doctor_name, vet_practice_id
- `vet_practices` — practice_name, vet_names (text array), phone, email, address
- `health_products` — product_name, category ('vaccination'|'deworming'|'tick_flea'), manufacturer, default_schedule_type
- `calendar_events` — synced automatically via triggers

### Pre-seeded health products
Vaccinations: Rabies, DHPPiL (5-in-1), Kennel Cough, Parvovirus, Leptospirosis
Deworming: Drontal Plus, Milbemax, Panacur
Tick & Flea: Bravecto, Nexgard, Frontline Plus, Simparica

### Auto-triggers already active (DO NOT replicate in app code)
- Saving any health record → auto-creates calendar_events entries
- Selecting schedule_type (annual/quarterly/etc) → auto-calculates next_due_date
- DO NOT calculate next_due_date in the app — the database does it

---

## STEP 1 — Regenerate Types

```bash
npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > types/supabase.ts
```

---

## STEP 2 — Update Health Hooks (`hooks/useHealth.ts`)

Add these hooks:

```ts
// Product library
useHealthProducts(category?: 'vaccination'|'deworming'|'tick_flea')
useAddHealthProduct()   // admin adds new product to library

// Vet practices
useVetPractices()
useAddVetPractice()
useUpdateVetPractice(id)

// Per-dog health
useVaccinationsForDog(dogId: string)
useDewormingForDog(dogId: string)
useVetVisitsForDog(dogId: string)

// Calendar / upcoming
useUpcomingHealthEvents(daysAhead?: number)  // default 30
// Query: SELECT * FROM calendar_events WHERE is_completed = false AND event_date BETWEEN NOW() AND NOW() + INTERVAL '30 days' ORDER BY event_date ASC
```

---

## STEP 3 — Health Screen Layout

### Top — Upcoming Due Strip
Horizontal scrollable row of alert cards for events due in next 30 days (all dogs).

Each card:
- Dog photo (small circle) + dog name
- Event chip: `VACCINATION` | `DEWORMING` | `TICK & FLEA` | `VET VISIT`
- "Due in X days" — red <7 days, orange 8–14 days, gold 15–30 days
- Tap → opens that record's edit bottom sheet

Hide strip if nothing due.

### Sections (accordion expand/collapse)
1. VACCINATIONS
2. WORMS / TICKS & FLEAS
3. VET VISITS
4. GENETIC FORECAST ← **leave completely unchanged**

---

## STEP 4 — Vaccinations Section

### Dog list:
Each row: photo + name | last vaccine name + date | next due chip (Overdue/Due Soon/Up to Date/Not Scheduled)
Tap → opens vaccination history bottom sheet for that dog

### Add / Edit Vaccination Bottom Sheet

```
Dog* (picker — active dogs: status IN ('keep','stud'))

── PRODUCT ─────────────────────────────
Vaccine* (searchable dropdown from health_products WHERE category='vaccination')
  + "Add new vaccine" option at bottom of list → opens mini form:
    Product Name* | Manufacturer (optional) | Default Schedule
    Saves to health_products table, immediately available in dropdown

── ADMINISTERED BY ─────────────────────
Veterinary Practice* (searchable dropdown from vet_practices)
  + "Add new practice" option → opens mini form:
    Practice Name* | Phone | Email | Address
    Saves to vet_practices, immediately available
    
Doctor / Vet Name* (searchable dropdown — pulls from vet_practices.vet_names array for selected practice)
  + "Add new doctor" option → adds name to vet_practices.vet_names array for that practice
  
── DATE ────────────────────────────────
Date Administered* (date picker — full calendar)
Batch Number (text — optional)

── NEXT DUE ────────────────────────────
Schedule:
  [ Annual ] [ Biannual ] [ Quarterly ] [ Custom Date ]
  Default: Annual (pre-selected)
  
  If Annual/Biannual/Quarterly:
    Show read-only: "Next due: [calculated date]"
    (database calculates automatically — do not calculate in app)
    
  If Custom Date:
    Show date picker

Notes (multiline — optional)
```

### Vaccination History (per dog):
List all past vaccinations for the selected dog, newest first.
Each row: vaccine name | date | doctor | practice | next due chip
Swipe left to delete (with confirmation).

---

## STEP 5 — Worms / Ticks & Fleas Section

### Dog list:
Each row: photo + name | two side-by-side chips: DEWORMING [date] | TICK & FLEA [date]
Tap → opens treatment history bottom sheet

### Add / Edit Treatment Bottom Sheet

```
Dog* (picker)

── TREATMENT TYPE ──────────────────────
[ Deworming ] [ Tick & Flea ] [ Both ]

── PRODUCT ─────────────────────────────
Product* (searchable dropdown from health_products WHERE category matches treatment type)
  + "Add new product" → mini form: Product Name* | Manufacturer | Category | Default Schedule
  
── ADMINISTERED BY ─────────────────────
Veterinary Practice (searchable dropdown from vet_practices — optional for home treatments)
  + "Add new practice" option
  
Doctor / Vet Name (searchable — optional, leave blank if owner administered)
  + "Add new doctor" option

── DATE ────────────────────────────────
Date Administered* (date picker)
Dosage (text — e.g. "1 tablet", "2ml")

── NEXT DUE ────────────────────────────
Schedule:
  [ Monthly ] [ Quarterly ] [ Biannual ] [ Custom Date ]
  Default: Quarterly (pre-selected)
  
  If Monthly/Quarterly/Biannual:
    Show read-only: "Next due: [calculated date]"
    
  If Custom Date:
    Show date picker

Notes (optional)
```

---

## STEP 6 — Vet Visits Section

### Dog list:
Each row: photo + name | last visit date + reason | next scheduled chip
Tap → opens visit history

### Add / Edit Vet Visit Bottom Sheet

```
Dog* (picker)

── VISIT DETAILS ───────────────────────
Visit Date* (date picker)
Reason* (text input)
  Quick-select chips: [ Annual Checkup ] [ Illness ] [ Injury ] [ Follow-up ] [ Other ]

── VETERINARY PRACTICE ─────────────────
Practice* (searchable dropdown from vet_practices)
  + "Add new practice" option → mini form

Doctor / Vet Name* (searchable — from selected practice's vet_names)
  + "Add new doctor" option

── VISIT NOTES ─────────────────────────
Diagnosis (multiline)
Treatment (multiline)
Medications (text)
Cost (numeric — optional, R prefix)

── FOLLOW-UP ───────────────────────────
Schedule next visit?
  [ Annual ] [ Biannual ] [ Quarterly ] [ Custom Date ] [ None ]
  Default: None
  
  If Annual/Biannual/Quarterly:
    Read-only: "Next visit: [calculated date]"
    
  If Custom Date:
    Date picker

Notes (optional)
```

---

## STEP 7 — Manage Products & Practices Screen

Create `app/(admin)/health/settings.tsx` — accessible via gear icon on Health screen header.

Two sections:

### Vaccine & Product Library
List all health_products grouped by category.
Each row: product name | manufacturer | default schedule | active toggle
"+ Add Product" button → same mini form as inline add

### Veterinary Practices
List all vet_practices.
Each row: practice name | phone | doctor count
Tap → expand to show doctors list, phone, email, address
"+ Add Practice" button
Edit/delete each practice

---

## STEP 8 — Calendar Integration (already automatic)

The database triggers handle all calendar sync — no extra code needed in the app for saving.

For the Calendar screen (`app/(admin)/calendar/index.tsx`), update it to:
- Show calendar_events from Supabase (already populated by triggers)
- Colour code by event_type:
  - 💉 Vaccination → Blue
  - 🐛 Deworming → Green  
  - 🐜 Tick & Flea → Orange
  - 🏥 Vet Visit → Purple
  - 🌡️ Heat → Red
  - 🐾 Whelping → Gold
  - 🏠 Go Home → Teal
- Tap event → navigate to source record
- Month view default, list view option
- Filter by dog or event type

---

## STEP 9 — Status Chip Colours

| Chip | Colour | Condition |
|------|--------|-----------|
| OVERDUE | Red | next_due_date < today |
| DUE SOON | Orange | next_due_date ≤ 14 days |
| DUE THIS MONTH | Gold | next_due_date ≤ 30 days |
| UP TO DATE | Green | next_due_date > 30 days |
| NOT SCHEDULED | Grey | next_due_date is null |

---

## Testing Checklist

- [ ] Upcoming strip shows correct dogs with colour-coded urgency
- [ ] Vaccine dropdown shows seeded products (Rabies, DHPPiL, etc.)
- [ ] "Add new vaccine" saves to health_products and immediately appears in dropdown
- [ ] Vet practice dropdown works; "Add new practice" saves and appears
- [ ] Doctor dropdown filters to selected practice's doctors
- [ ] "Add new doctor" appends to vet_practices.vet_names array
- [ ] Date picker opens calendar correctly
- [ ] Annual schedule → next_due_date = +365 days (set by database, shown read-only)
- [ ] Quarterly → +91 days
- [ ] Custom date → manual date picker shown
- [ ] Saving vaccination → appears on calendar screen automatically
- [ ] Saving deworming → appears on calendar
- [ ] Saving vet visit → appears on calendar
- [ ] Treatment type toggle switches product dropdown (Bravecto vs Drontal)
- [ ] Vet visit cost saved with R prefix display
- [ ] Health settings screen shows all products and practices
- [ ] Genetic Forecast section unchanged
