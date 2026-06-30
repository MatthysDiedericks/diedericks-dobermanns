# Cursor Prompt — Diedericks Dobermanns Breeding Programme Module

---

## STACK CONTEXT (do not change)

- **App:** React Native, Expo Router, TypeScript, NativeWind
- **Backend:** Supabase (project ID: nlmwxodvquwbjinhhbmr)
- **Brand:** Background `#111008`, Surface `#1C1A0E`, Gold `#C4A35A`, Text `#F5F0E8`
- **Dog registry already exists** — `dogs` table in Supabase with RLS. Build on top of it.
- **Step 1 always:** `npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > types/supabase.ts`

---

## CONTEXT

I am building a kennel management app for **Diedericks Dobermanns**, a professional Dobermann breeding and training operation. The app already has a dog registry with individual dog records (name, sire, dam, date of birth, line, health test results, titles/sport scores).

I need to add a **Breeding Programme module** that manages a structured two-line line breeding plan across multiple generations. The module must enforce specific breeding rules, display generation flow, and guide the user on which dogs to breed and when.

---

## THE BREEDING STRUCTURE

The programme runs **two permanent lines** that are maintained in parallel and occasionally crossed for hybrid vigour. The lines never merge — they stay distinct, with controlled cross pairings every second generation to prevent COI drift.

### Line A — Betelges Working Line
- Foundation genetics: Napoleon Betelges / Hillo Betelges / Boromir bloodlines
- Primary sire (Gen 1): **Santini Betelges**
- Dams (Gen 1): Hailey De Zelig, Cendra Diedericks, (Claire — already bred, cross litter)

### Line B — Foundation Cross Line
- Foundation genetics: Hunter (Hillo Betelges) / Cleopatra (American PDC lines)
- Primary sire (Gen 1): **Hunter (Hillo Betelges)**
- Dams (Gen 1): Cleopatra, Kim von Diedericks

### Special Case
- **Hannah** — Line A female who cannot breed to any current Line A or Line B sire (uncle/niece with Hunter; half-sibling with Santini). Must wait for a Gen 2 Line B male.

---

## DATA MODEL — ADDITIONS NEEDED

Each dog record should support the following fields (add if not present via ALTER TABLE, use ADD COLUMN IF NOT EXISTS):

```sql
ALTER TABLE dogs
  ADD COLUMN IF NOT EXISTS line text CHECK (line IN ('A', 'B', 'Cross', 'Unknown')),
  ADD COLUMN IF NOT EXISTS generation int,
  ADD COLUMN IF NOT EXISTS breeding_role text CHECK (breeding_role IN ('Sire', 'Dam', 'Both', 'Retired', 'Prospect')),
  ADD COLUMN IF NOT EXISTS urgency_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS health_dcm1 text CHECK (health_dcm1 IN ('Clear', 'Carrier', 'Affected', 'Pending')),
  ADD COLUMN IF NOT EXISTS health_dcm2 text CHECK (health_dcm2 IN ('Clear', 'Carrier', 'Affected', 'Pending')),
  ADD COLUMN IF NOT EXISTS health_dcm3 text CHECK (health_dcm3 IN ('Clear', 'Carrier', 'Affected', 'Pending')),
  ADD COLUMN IF NOT EXISTS health_dcm4 text CHECK (health_dcm4 IN ('Clear', 'Carrier', 'Affected', 'Pending')),
  ADD COLUMN IF NOT EXISTS health_dcm5 text CHECK (health_dcm5 IN ('Clear', 'Carrier', 'Affected', 'Pending')),
  ADD COLUMN IF NOT EXISTS health_hd text CHECK (health_hd IN ('A', 'B', 'C', 'D', 'E', 'Pending')),
  ADD COLUMN IF NOT EXISTS health_ed text CHECK (health_ed IN ('0', '1', '2', '3', 'Pending')),
  ADD COLUMN IF NOT EXISTS holter_date date,
  ADD COLUMN IF NOT EXISTS holter_result text CHECK (holter_result IN ('Normal', 'Abnormal', 'Pending'));
```

### New `pairings` table:
```sql
CREATE TABLE IF NOT EXISTS pairings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sire_id uuid NOT NULL REFERENCES dogs(id),
  dam_id uuid NOT NULL REFERENCES dogs(id),
  line text NOT NULL CHECK (line IN ('A', 'B', 'Cross')),
  generation int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'Active', 'Completed', 'Cancelled')),
  priority text NOT NULL DEFAULT 'Active' CHECK (priority IN ('Critical', 'Urgent', 'High', 'Active', 'Future', 'Prohibited')),
  target_date date,
  date_bred date,
  coi_estimate float,
  expected_litter_date date,
  litter_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pairings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pairings admin full" ON pairings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "pairings staff read" ON pairings
  FOR SELECT USING (public.is_trainer_or_above());
```

### Update `litters` table:
```sql
ALTER TABLE litters
  ADD COLUMN IF NOT EXISTS pairing_id uuid REFERENCES pairings(id),
  ADD COLUMN IF NOT EXISTS retained_male_id uuid REFERENCES dogs(id),
  ADD COLUMN IF NOT EXISTS retained_female_ids uuid[];
```

---

## BREEDING RULES ENGINE

Create `lib/breeding/rules.ts`:

```ts
export function checkPairingValidity(sire: Dog, dam: Dog): {
  allowed: boolean
  reason: string
  coi_flag: boolean
} {
  // Hard prohibitions
  if (dam.sire_id === sire.id) return { allowed: false, reason: 'Father × Daughter — prohibited', coi_flag: false }
  if (sire.dam_id === dam.id) return { allowed: false, reason: 'Mother × Son — prohibited', coi_flag: false }
  if (sire.sire_id === dam.sire_id && sire.dam_id === dam.dam_id)
    return { allowed: false, reason: 'Full siblings — prohibited', coi_flag: false }
  if (sire.sire_id && sire.sire_id === dam.sire_id)
    return { allowed: false, reason: 'Half-siblings (same sire) — prohibited', coi_flag: false }
  if (sire.dam_id && sire.dam_id === dam.dam_id)
    return { allowed: false, reason: 'Half-siblings (same dam) — prohibited', coi_flag: false }

  // Kennel-specific hardcoded prohibitions (safety net by name)
  const PROHIBITED_PAIRS = [
    { sire: 'Hunter', dam: 'Hailey', reason: 'Father/daughter' },
    { sire: 'Hunter', dam: 'Cendra', reason: 'Father/daughter' },
    { sire: 'Santini', dam: 'Hannah', reason: 'Half-siblings (both by Napoleon Betelges)' },
    { sire: 'Hunter', dam: 'Hannah', reason: 'Uncle/niece (Hunter\'s sister Havana is Hannah\'s dam)' },
  ]
  const hardBlock = PROHIBITED_PAIRS.find(
    p => sire.name.includes(p.sire) && dam.name.includes(p.dam)
  )
  if (hardBlock) return { allowed: false, reason: hardBlock.reason, coi_flag: false }

  return { allowed: true, reason: '', coi_flag: false }
}

export function healthGatePassed(dog: Dog): boolean {
  return (
    dog.health_dcm1 === 'Clear' &&
    dog.health_dcm2 === 'Clear' &&
    dog.health_dcm3 === 'Clear' &&
    dog.health_dcm4 === 'Clear' &&
    dog.health_dcm5 === 'Clear' &&
    ['A', 'B'].includes(dog.health_hd ?? '') &&
    ['0', '1'].includes(dog.health_ed ?? '')
  )
}

export function ageGatePassed(dam: Dog, breedingDate: Date): { passed: boolean; warning?: string } {
  const ageMonths = (breedingDate.getTime() - new Date(dam.dob).getTime()) / (1000 * 60 * 60 * 24 * 30)
  if (ageMonths < 18) return { passed: false, warning: 'Dam is under 18 months — too young to breed' }
  if (ageMonths < 24) return { passed: true, warning: 'Dam is under 24 months — first litter ideally at 24+ months' }
  return { passed: true }
}
```

---

## SEED DATA — GEN 1 PROGRAMME STATE

On first load of the Breeding Programme screen, if the pairings table is empty, insert these records. Use the actual dog UUIDs from the dogs table (look them up by name):

| Pairing | Line | Status | Priority | Notes |
|---|---|---|---|---|
| Santini × Claire | Cross | Completed | Done | Cross litter. Retain best female for Gen 2 cross pool. |
| Santini × Hailey | A | Planned | Urgent | Hailey age 5 — act on next heat. |
| Santini × Cendra | A | Planned | Active | Cendra age 3 — prime window. |
| Hunter × Cleopatra | B | Planned | Critical | Only pure Line B Gen 1 litter. Line B Sire 2 must come from here. |
| Hunter × Kim | B | Planned | Future | Kim DOB Sep 2025 — minimum 18 months. Target 2027. |

### Known prohibited pairings (insert with status = Prohibited, priority = Prohibited):
| Pairing | Reason |
|---|---|
| Hunter × Hailey | Father/daughter |
| Hunter × Cendra | Father/daughter |
| Santini × Hannah | Half-siblings (both by Napoleon Betelges) |
| Hunter × Hannah | Uncle/niece (Hunter's sister Havana is Hannah's dam) |

### Hannah flag:
Update Hannah's record: `notes = 'Cannot breed in Gen 1. Awaiting best male from Hunter × Cleopatra (Line B Sire 2) in Gen 2 (~2028). Target pairing: Hannah × Line B Sire 2.'`

---

## UI / SCREENS

### `app/(admin)/breeding/index.tsx` — Breeding Programme Dashboard

Layout:
- Header: "BREEDING PROGRAMME" with gold underline
- **Generation selector** tabs: Gen 1 | Gen 2 | Gen 3
- **Urgency banner**: If any dam has urgency_flag = true → red banner "⚠ HAILEY — Act on next heat"
- **Active pairings grid**: Cards showing each pairing with:
  - Priority badge: CRITICAL (red) | URGENT (orange) | ACTIVE (gold) | FUTURE (grey) | COMPLETED (green) | PROHIBITED (dark red ✗)
  - Sire name × Dam name
  - Line badge: A (red) | B (navy) | Cross (green)
  - Health gate status: ✓ Both cleared | ⚠ Pending tests
  - Action button: "Plan Mating" / "Record Litter" / "View"

### `app/(admin)/breeding/pairing-builder.tsx` — Pairing Builder

- Sire picker (active sires from dogs table)
- Dam picker (active dams from dogs table)
- **Real-time validation**: as user selects both dogs → call `checkPairingValidity()` → show ✓ Allowed or ✗ [reason] immediately
- Health gate check: show status of both dogs' DCM1–5, HD, ED
- Age gate check: show dam's age in months
- COI warning: if estimated COI > 6.25%, show yellow warning; if > 12.5%, show red warning
- Save button disabled if: pairing prohibited OR health gate failed OR age gate failed

### `app/(admin)/breeding/litter-recorder.tsx` — Litter Recorder

- Link to pairing (dropdown or passed via route param)
- Whelp date, number of pups, sexes
- **Succession section**: "Select pups to retain"
  - Retained male: assign as "Line [X] Sire 2 Prospect" — role = Sire, generation = parent + 1
  - Retained females: assign as "Line [X] Dam Prospects"
  - For cross litters: prompt "Which line does this pup return to?"
- Auto-suggestion banner: "This litter should produce your next Line B Sire (Gen 2)"

### `app/(admin)/breeding/organogram.tsx` — Generation Tree

Visual generation tree using React Native SVG or a scrollable FlatList-based tree:

- **Gen 1 row**: Santini (A), Hunter (B)
- **Arrows down** to litters and retained pups
- **Gen 2 row**: Line A Sire 2, Line A Dams, Line B Sire 2, Line B Dams, Hannah
- Colour coding: Line A nodes = `#8B0000` (dark red) | Line B nodes = `#1B2A6B` (navy) | Cross = `#2D6A4F` (green)
- Tap any node → `router.push('/dogs/[id]')` to open that dog's full profile

---

## HEALTH SPECIAL FLAGS (add as notes on specific dogs)

Update these dogs' notes fields:
- **Santini**: "Verify own DCM1–5 before first use as sire"
- **Hailey**: "Dam (Raconti Toffi) has 25% internal COI — Holter-monitor ALL retained pups from Santini × Hailey at age 2 before using as breeders"
- **Cleopatra**: "American lines — run full American-specific DCM variant panel (not just standard European panel)"

### Cross-litter sibling flag:
In `checkPairingValidity()`, also check:
- If both dogs' `pairing_id` maps to either (Santini × Claire) or (Santini × Cendra) — block with reason: "Pups from Santini × Claire and Santini × Cendra share the same sire and half-sibling dams — do not cross"

---

## GEN 2 PLANNED PAIRINGS (auto-generate after Gen 1 litters complete)

After user designates Gen 2 retained dogs, auto-suggest these pairings:

| Pairing | Line | Notes |
|---|---|---|
| Line A Sire 2 × Line A Dams | A | Within-line. Check COI before confirming. |
| Line B Sire 2 × Line B Dams + Kim daughters | B | Within-line. Initially low COI. |
| Line A Sire 2 × Santini/Claire daughter | Cross | Verify COI carefully — dam carries Santini genetics. |
| Line B Sire 2 × Hannah | Cross/Special | Only viable pairing for Hannah. Retain female → Line A pool. |

---

## SELF-SUSTAINING CHECKS (run after each litter is recorded)

```ts
function checkProgrammeHealth(line: 'A' | 'B') {
  // Count active sires for this line
  // Count active dams for this line
  // If activeSires < 1 → ALERT: "Line [X] has no active sire — succession required"
  // If activeDams < 1 → ALERT: "Line [X] has no active dams"
  // If generation 2 within-line COI estimate > 6.25% → suggest cross pairing
  // If both lines have Gen 2 dogs active → mark programme status = "Self-Sustaining"
}
```

Show programme health status on breeding dashboard: 🔴 At Risk | 🟡 Developing | 🟢 Self-Sustaining

---

## TONE / BRAND (for all user-facing copy)

- Kennel name: **Diedericks Dobermanns**
- Slogan: **Born With Purpose. Built With Discipline.**
- Voice: confident, authoritative, premium — no generic language
- Health framing: "We test further than required — DCM1 through DCM5, plus HD and ED on every breeding dog."
- Never use "punishment" — use "correction"

---

## TESTING CHECKLIST

- [ ] Hunter × Hailey → shows ✗ PROHIBITED (Father/daughter) immediately on selection
- [ ] Santini × Hannah → shows ✗ PROHIBITED (Half-siblings) immediately
- [ ] Santini × Cendra → shows ✓ Allowed (Active pairing)
- [ ] Hunter × Kim → shows ✓ Allowed but ⚠ Age warning (Kim under 24 months)
- [ ] Dog with any DCM = Pending → health gate blocks pairing confirmation
- [ ] Gen 1 pairings all appear on dashboard with correct priority badges
- [ ] Hannah shows "Awaiting Gen 2 Line B Sire" note
- [ ] Urgency flag shows on Hailey (age 5+)
- [ ] Litter recorder saves retained pup with correct line/generation assigned
- [ ] Organogram shows Gen 1 founders with correct line colours
- [ ] Tapping any node in organogram opens dog profile
- [ ] No TypeScript errors in rules.ts, pairing-builder, or organogram
