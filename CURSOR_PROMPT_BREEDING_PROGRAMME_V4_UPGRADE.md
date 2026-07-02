# CURSOR PROMPT — BREEDING PROGRAMME V4 UPGRADE (Bridge Sire Plan)

## CONTEXT

App: Diedericks Dobermanns
Stack: React Native, Expo SDK 56, TypeScript strict, Expo Router, NativeWind
Supabase: nlmwxodvquwbjinhhbmr
Brand: Background #111008 | Surface #1C1A0E | Gold #C4A35A | Text #F5F0E8

The breeding module already exists and is partially built. Do NOT rebuild what exists.

### What already exists — DO NOT touch unless told below:
- `app/(admin)/breeding/index.tsx` — Dashboard screen
- `app/(admin)/breeding/planner.tsx` — Visual planner
- `app/(admin)/breeding/pairing-builder.tsx` — Pairing builder
- `app/(admin)/breeding/litter-recorder.tsx` — Litter recorder
- `app/(admin)/breeding/organogram.tsx` — Organogram view
- `app/(admin)/breeding/trial-planner.tsx` — Trial mating planner
- `lib/breeding/coi.ts`, `ancestors.ts`, `coi-info-content.ts`, `coiDisplay.ts` — untouched
- All `components/breeding/` components — untouched
- All hooks — untouched

### What this prompt UPGRADES:
1. `lib/breeding/constants.ts` — add Bridge line colour + fix Gen 2 pairings
2. `lib/breeding/rules.ts` — add missing prohibited pairs + D/C Son dynamic checks
3. `lib/breeding/seed.ts` — fix wrong pairings + add Bridge Sire seed data
4. `lib/breeding/programme-health.ts` — add Dharkha & D/C Son alerts
5. `app/(admin)/breeding/index.tsx` — add Bridge Sire panel + fix section layout

---

## THE PROGRAMME — CRITICAL CONTEXT (read before touching any file)

The kennel runs two permanent breeding lines (A and B) founded on Hunter (Hillo Betelges).

**The Bridge Sire problem:** Every dog Hunter sired (Hailey, Cendra, Cyrus pup, Line A Sire 2, Line B sires) is a half-sibling. Hunter sons CANNOT breed Hunter daughters. Without an unrelated male, there are no viable Gen 2 pairings.

**The Bridge Sire solution:** Dharkha Betelges (Fort Bellators Mata Leon × Chiquita Betelges) breeds Cleopatra FIRST, producing a son called D/C Son. His sire is Dharkha (NOT Hunter) → he can breed every Hunter daughter with 0% COI.

**Dharkha is URGENT.** His sperm quality is declining. One litter remaining. Must breed Cleopatra NOW — before Hunter does.

**Line structure:**
- Line A = Hunter × Cleopatra (American working genetics, true outcross)
- Line B = Hunter × Odessa + Hunter × Kim (European Raconti structure)
- Bridge = Dharkha × Cleopatra → D/C Son (engine of Gen 2)
- Sale = Santini × Hailey/Cendra/Claire (DCM carrier, no programme succession)

---

## TASK 1 — Fix `lib/breeding/constants.ts`

### 1.1 — Add Bridge and Sale line colours to LINE_COLORS

Find the `LINE_COLORS` object and add the missing entries:

```typescript
export const LINE_COLORS = {
  A: '#8B0000',
  B: '#1B2A6B',
  Bridge: '#006666',   // teal — Bridge Sire and Dharkha × Cleo pairing
  Sale: '#3D1A6B',     // purple — Santini sale pairings
  Cross: '#2D6A4F',
  Unknown: '#6B7280',
} as const;
```

### 1.2 — Fix GEN2_SUGGESTED_PAIRINGS (current version has errors)

Replace the entire `GEN2_SUGGESTED_PAIRINGS` array with this correct version:

```typescript
export const GEN2_SUGGESTED_PAIRINGS = [
  {
    key: 'dc_son_odessa_daughter',
    line: 'Bridge' as const,
    label: 'D/C Son × Hunter/Odessa Daughter',
    notes: 'Core Line B Gen 2. D/C Son sire = Dharkha — 0% COI with all Hunter daughters.',
    coi: '0%',
  },
  {
    key: 'dc_son_kim_daughter',
    line: 'Bridge' as const,
    label: 'D/C Son × Hunter/Kim Daughter',
    notes: 'Second Line B dam branch. 0% COI.',
    coi: '0%',
  },
  {
    key: 'a_within',
    line: 'A' as const,
    label: 'Line A Sire 2 × Line A Dams (separate litter daughters only)',
    notes: 'Within-line. Verify COI. Same-litter sisters of Line A Sire 2 are PROHIBITED.',
    coi: 'Calculate before confirming',
  },
  {
    key: 'hannah_line_a',
    line: 'Cross' as const,
    label: 'Line A Sire 2 × Hannah',
    notes: 'COI ≈ 1.95% — Hannah\'s primary programme pairing. Retain best female → Line A pool.',
    coi: '~1.95%',
  },
  {
    key: 'dc_son_cyrus_pup',
    line: 'Bridge' as const,
    label: 'D/C Son × Cyrus Pup',
    notes: 'Premium pups. 0% COI. Cyrus pup must pass full DCM1–5 + Holter before breeding.',
    coi: '0%',
  },
  {
    key: 'hannah_dc_alternative',
    line: 'Cross' as const,
    label: 'D/C Son × Hannah (alternative)',
    notes: 'COI ≈ 3.125% via Chico/Chiquita Betelges. Use if Line A Sire 2 unavailable.',
    coi: '~3.125%',
  },
  {
    key: 'dc_son_hailey_daughters',
    line: 'Bridge' as const,
    label: 'D/C Son × Hailey Daughters',
    notes: 'After Santini × Hailey litter. D/C Son can breed Hailey\'s daughters — 0% COI.',
    coi: '0%',
  },
  {
    key: 'dc_son_cendra_daughters',
    line: 'Bridge' as const,
    label: 'D/C Son × Cendra Daughters',
    notes: 'After Santini × Cendra litter. D/C Son can breed Cendra\'s daughters — 0% COI.',
    coi: '0%',
  },
];
```

### 1.3 — Add Bridge Sire constants

Add these new exports at the bottom of the constants file:

```typescript
// Bridge Sire identification (used by rules engine and dashboard)
export const BRIDGE_SIRE_NAME_FRAGMENT = 'D/C Son';
export const DHARKHA_NAME_FRAGMENT = 'Dharkha';
export const HUNTER_NAME_FRAGMENT = 'Hunter';
export const CLEOPATRA_NAME_FRAGMENT = 'Cleopatra';
export const DC_SON_DAM_FRAGMENT = 'Cleopatra';   // D/C Son's dam

// Bridge Sire: females he CAN breed (all Hunter daughters by name fragment)
export const DC_SON_CAN_BREED_FRAGMENTS = [
  'Hailey', 'Cendra', // Hunter daughters (sale)
  // Plus daughters of Hailey, Cendra, Odessa, Kim — resolved dynamically by father check
];

// Bridge Sire: females he CANNOT breed (hardcoded half-sibling restrictions)
export const DC_SON_CANNOT_BREED_FRAGMENTS = [
  'Claire',      // half-sib via Dharkha (Dharkha × Gravin Zone)
  'Kim',         // half-sib via Dharkha (Dharkha × Odessa)
];
```

---

## TASK 2 — Fix `lib/breeding/rules.ts`

The rules engine is missing several critical checks. Add the following without removing anything existing.

### 2.1 — Add missing hardcoded prohibited pairs

Find the `PROHIBITED_PAIRS` array and add these entries:

```typescript
const PROHIBITED_PAIRS = [
  // --- existing entries (keep these) ---
  { sire: 'Hunter', dam: 'Hailey', reason: 'Father/daughter — Hunter is Hailey\'s sire (pedigree confirmed)' },
  { sire: 'Hunter', dam: 'Cendra', reason: 'Father/daughter — Hunter is Cendra\'s sire (pedigree confirmed)' },
  { sire: 'Santini', dam: 'Hannah', reason: 'Half-siblings — both sired by Napoleon Betelges' },
  { sire: 'Hunter', dam: 'Hannah', reason: 'Uncle/niece — Havana Betelges is Hunter\'s full sister and Hannah\'s dam' },
  // --- NEW entries ---
  { sire: 'Hunter', dam: 'Cyrus', reason: 'Father/daughter — Hunter is Cyrus Pup\'s sire (owner confirmed)' },
  { sire: 'DC Son', dam: 'Claire', reason: 'Half-siblings via Dharkha Betelges — D/C Son\'s sire is Dharkha; Claire\'s sire is Dharkha' },
  { sire: 'DC Son', dam: 'Kim', reason: 'Half-siblings via Dharkha Betelges — D/C Son\'s sire is Dharkha; Kim\'s sire is Dharkha' },
  // Reverse (in case dogs are passed the wrong way round)
  { sire: 'Claire', dam: 'DC Son', reason: 'Half-siblings via Dharkha Betelges' },
  { sire: 'Kim', dam: 'DC Son', reason: 'Half-siblings via Dharkha Betelges' },
] as const;
```

### 2.2 — Add D/C Son dynamic checks to `checkPairingValidity`

After the hardBlock check and before the `sharesCrossLitterOrigin` check, add:

```typescript
// ── D/C SON DYNAMIC CHECKS ─────────────────────────────────────────────────

// D/C Son × Hunter/Cleo daughters → BLOCK (half-siblings via Cleopatra)
// D/C Son's dam = Cleopatra. Hunter × Cleo daughters' dam = Cleopatra. Same dam = half-sibling.
const sireIsDCSon = nameIncludes(sire.name, 'DC Son') || nameIncludes(sire.name, 'D/C Son');
const damIsDCSon = nameIncludes(dam.name, 'DC Son') || nameIncludes(dam.name, 'D/C Son');

if (sireIsDCSon) {
  // Block if dam's mother is Cleopatra AND dam's father is Hunter (Hunter × Cleo daughters)
  if (
    dam.mother_id &&
    sire.mother_id &&
    dam.mother_id === sire.mother_id  // both have Cleo as mother
  ) {
    return {
      allowed: false,
      reason: 'Half-siblings via Cleopatra — D/C Son\'s dam is Cleopatra; this dog\'s dam is also Cleopatra',
      coi_flag: false,
    };
  }
}

// Odessa line restriction: Hunter/Odessa son × Hunter/Kim daughter (or vice versa) → WARN
// Kim's dam is Odessa — offspring of both litters share Odessa in generation 2
const isHunterOdessaOffspring = (dog: BreedingDog): boolean => {
  return nameIncludes(dog.name, 'Odessa') === false &&
    dog.father_id != null &&
    // Both parents of sire and dam would need lookup — use note-based fallback:
    (dog.notes?.toLowerCase().includes('odessa') ?? false);
};
// Note: Full Odessa restriction is enforced in the prohibited_pairs DB table.
// The dynamic check here is a name-fragment safeguard only.
if (
  (nameIncludes(sire.name, 'Odessa') && nameIncludes(dam.name, 'Kim')) ||
  (nameIncludes(dam.name, 'Odessa') && nameIncludes(sire.name, 'Kim'))
) {
  return {
    allowed: false,
    reason: 'Half-siblings via Odessa — Kim\'s dam is Raconti Odessa. Odessa offspring and Kim offspring cannot breed.',
    coi_flag: false,
  };
}

// ── Any Hunter son × Cyrus Pup → BLOCK (half-siblings via Hunter) ──────────
// Cyrus Pup's sire is Hunter. All Hunter's children are half-siblings.
const sireIsHunterSon = sire.father_id != null && nameIncludes(sire.name, 'Hunter') === false &&
  // If sire's father is Hunter, block pairing with any Hunter daughter
  (dam.father_id != null && sire.father_id === dam.father_id &&
    /* covered by existing half-sibling check above */ false);
// The half-sibling sire check above already covers this case if father_ids are set correctly.
// Additional name-based safety net for Cyrus Pup:
if (nameIncludes(dam.name, 'Cyrus') && nameIncludes(dam.name, 'Pup')) {
  // Any Hunter son is a half-sibling of Cyrus Pup
  if (sire.father_id != null && nameIncludes(sire.name, 'Hunter') === false) {
    // Covered dynamically by father_id check — no additional action needed
  }
}
```

### 2.3 — Add DCM carrier sale-only flag function

Add this new export after `coiSeverity`:

```typescript
/**
 * Returns true if the sire carries a DCM flag that means all pups must be sale-only.
 * Currently Santini only — extend if other carriers are added.
 */
export function isSaleOnlySire(sire: BreedingDog): boolean {
  return sire.flag_dcm_carrier === true || nameIncludes(sire.name, 'Santini');
}

/**
 * Returns the Bridge Sire validity banner message when D/C Son is selected as sire.
 * Call in PairingBuilder when sire name matches D/C Son.
 */
export function getBridgeSireBanner(sire: BreedingDog): string | null {
  if (nameIncludes(sire.name, 'DC Son') || nameIncludes(sire.name, 'D/C Son')) {
    return '✓ Bridge Sire selected — D/C Son can breed all Hunter daughters (sire is Dharkha, not Hunter). COI = 0% with Hunter offspring.';
  }
  return null;
}
```

---

## TASK 3 — Fix `lib/breeding/seed.ts`

The current seed data has significant errors. Replace the `GEN1_PAIRINGS` array and `DOG_NOTE_UPDATES` with the corrected versions below.

### 3.1 — Replace GEN1_PAIRINGS

```typescript
const GEN1_PAIRINGS: SeedPairing[] = [
  // ── BRIDGE PAIRING — MUST BE FIRST ───────────────────────────────────────
  {
    sire: ['Dharkha'],
    dam: ['Cleopatra'],
    line: 'Bridge',
    status: 'Planned',
    priority: 'Critical',
    notes: 'BRIDGE PAIRING — DO THIS FIRST before Hunter × Cleo. Dharkha sperm declining — one litter remaining. D/C Son (retained male) will be the Gen 2 engine — his sire is Dharkha, NOT Hunter, so he can breed every Hunter daughter at 0% COI. Semen quality eval on Dharkha FIRST. DCM1–5 both parents. American DCM panel on Cleo.',
    generation: 1,
  },

  // ── PROGRAMME PAIRINGS (Hunter) ───────────────────────────────────────────
  {
    sire: ['Hunter'],
    dam: ['Cleopatra'],
    line: 'A',  // ← FIXED: this is Line A (American Working), NOT Line B
    status: 'Planned',
    priority: 'Critical',
    notes: 'LINE A FOUNDATION — breed on Cleo\'s NEXT heat after Dharkha litter. True American outcross — Benchmark/Masaya × Smart Wood Hills/Panama. Retain: best son = Line A Sire 2; best 1–2 daughters = Line A dam pool. NOTE: Hunter × Cleo daughters are half-siblings of D/C Son (shared dam Cleo) — D/C Son cannot breed them.',
    generation: 1,
  },
  {
    sire: ['Hunter'],
    dam: ['Odessa'],
    line: 'B',
    status: 'Planned',
    priority: 'Urgent',
    notes: 'LINE B — LAST LITTER for Odessa. Ennaxor/Wandrahm genetics unique to this litter. Holter Odessa before breeding. Full vet oversight. Retain: best daughter → Line B dam pool for D/C Son to breed in Gen 2.',
    generation: 1,
  },
  {
    sire: ['Hunter'],
    dam: ['Kim'],
    line: 'B',
    status: 'Planned',
    priority: 'Future',
    notes: 'Kim DOB Sep 2025 — minimum 18 months. Do not breed before Mar 2027. Kim is D/C Son\'s half-sister (same sire Dharkha) — D/C Son cannot breed Kim. Hunter × Kim daughters CAN breed D/C Son (their sire is Hunter, not Dharkha).',
    generation: 1,
  },

  // ── SALE PAIRINGS (Santini) ───────────────────────────────────────────────
  {
    sire: ['Santini'],
    dam: ['Claire'],
    line: 'Sale',
    status: 'Completed',
    priority: 'Done',
    notes: 'COMPLETED — all pups trained and sold. No retention. Claire is D/C Son\'s half-sister via Dharkha — D/C Son cannot breed Claire.',
    generation: 1,
  },
  {
    sire: ['Santini'],
    dam: ['Hailey'],
    line: 'Sale',
    status: 'Planned',
    priority: 'Urgent',
    notes: 'Hailey age 5 — URGENT, breed on next heat. All pups sale only. Holter all pups at 2 years (Raconti Toffi dam has 25% COI). Hailey\'s daughters CAN breed D/C Son in Gen 2.',
    generation: 1,
  },
  {
    sire: ['Santini'],
    dam: ['Cendra'],
    line: 'Sale',
    status: 'Planned',
    priority: 'Active',
    notes: 'Cendra age ~3, prime window. All pups sale only. Cendra\'s daughters CAN breed D/C Son in Gen 2.',
    generation: 1,
  },
];
```

### 3.2 — Replace PROHIBITED_PAIRINGS seed

```typescript
const PROHIBITED_PAIRINGS: SeedPairing[] = [
  { sire: ['Hunter'], dam: ['Hailey'], line: 'Sale', status: 'Prohibited', priority: 'Prohibited',
    notes: 'Father/daughter — Hillo Betelges confirmed as Hailey\'s sire (pedigree)' },
  { sire: ['Hunter'], dam: ['Cendra'], line: 'Sale', status: 'Prohibited', priority: 'Prohibited',
    notes: 'Father/daughter — Hillo Betelges confirmed as Cendra\'s sire (pedigree)' },
  { sire: ['Hunter'], dam: ['Cyrus'], line: 'Sale', status: 'Prohibited', priority: 'Prohibited',
    notes: 'Father/daughter — Hunter confirmed as Cyrus Pup\'s sire (owner confirmed)' },
  { sire: ['Hunter'], dam: ['Hannah'], line: 'Cross', status: 'Prohibited', priority: 'Prohibited',
    notes: 'Uncle/niece — Havana Betelges is Hunter\'s full sister (both by Boromir × Panama) and Hannah\'s dam' },
  { sire: ['Santini'], dam: ['Hannah'], line: 'Cross', status: 'Prohibited', priority: 'Prohibited',
    notes: 'Half-siblings — both sired by Napoleon Betelges' },
  { sire: ['DC Son', 'D/C Son'], dam: ['Claire'], line: 'Bridge', status: 'Prohibited', priority: 'Prohibited',
    notes: 'Half-siblings via Dharkha Betelges — D/C Son\'s sire is Dharkha; Claire\'s sire is Dharkha' },
  { sire: ['DC Son', 'D/C Son'], dam: ['Kim'], line: 'Bridge', status: 'Prohibited', priority: 'Prohibited',
    notes: 'Half-siblings via Dharkha Betelges — D/C Son\'s sire is Dharkha; Kim\'s sire is Dharkha' },
];
```

### 3.3 — Replace DOG_NOTE_UPDATES

```typescript
const DOG_NOTE_UPDATES: {
  fragments: string[];
  notes?: string;
  urgency?: boolean;
  line?: BreedingDog['line'];
  generation?: number;
  breeding_role?: BreedingDog['breeding_role'];
  flag_last_litter?: boolean;
  flag_bridge_sire?: boolean;
  flag_sale_only?: boolean;
  flag_dcm_carrier?: boolean;
  flag_high_coi_bg?: boolean;
}[] = [
  {
    fragments: ['Dharkha'],
    notes: 'BRIDGE SIRE PRODUCER — sperm quality declining, possibly ONE litter remaining. Breed to Cleopatra FIRST before Hunter. Semen quality evaluation MANDATORY before breeding. DCM1–5 + HD + ED required. If semen eval fails, Bridge Sire plan is at risk — alert immediately.',
    urgency: true,
    flag_last_litter: true,
    line: 'Bridge',
    generation: 1,
    breeding_role: 'Sire',
  },
  {
    fragments: ['Odessa'],
    notes: 'Raconti Odessa — ONE LITTER LEFT before retirement. Breed to Hunter on next heat. Holter required before breeding. Full vet oversight. Odessa daughters and Kim daughters (Kim\'s dam is Odessa) cannot breed each other.',
    urgency: true,
    flag_last_litter: true,
    line: 'B',
    generation: 1,
    breeding_role: 'Dam',
  },
  {
    fragments: ['Santini'],
    notes: 'DCM factor present (not active). All pups from Santini pairings are SALE ONLY — never retain for breeding succession. Verify DCM1–5 before each use.',
    flag_dcm_carrier: true,
    flag_sale_only: true,
    line: 'Sale',
    generation: 1,
    breeding_role: 'Sire',
  },
  {
    fragments: ['Hailey'],
    notes: 'Hunter\'s daughter — cannot breed Hunter. Age 5 — URGENT. Santini × Hailey pups are sale only. Dam (Raconti Toffi) has 25% COI — Holter ALL pups at 2 years before using as breeders. Hailey\'s daughters CAN breed D/C Son (Bridge Sire) in Gen 2.',
    urgency: true,
    flag_high_coi_bg: true,
    flag_sale_only: true,
    line: 'Sale',
    generation: 1,
    breeding_role: 'Dam',
  },
  {
    fragments: ['Cleopatra'],
    notes: 'American outcross — Benchmark\'s Egyptian God × Masaya\'s Razin A Ruckus. Zero shared ancestry with any European kennel dog. BREEDS TWICE IN GEN 1: Dharkha × Cleo FIRST (produces D/C Son Bridge Sire), then Hunter × Cleo on next heat (produces Line A Sire 2). Run full American-specific DCM variant panel — not just standard European DCM panel.',
    line: 'A',
    generation: 1,
    breeding_role: 'Dam',
  },
  {
    fragments: ['Hannah'],
    notes: 'Cannot breed in Gen 1. CANNOT breed Santini (half-sib via Napoleon) or Hunter (uncle/niece — Havana Betelges is Hunter\'s full sister). Primary Gen 2 pairing: Line A Sire 2 (Hunter × Cleo son) — COI ≈ 1.95%. Alternative: D/C Son (Bridge Sire) — COI ≈ 3.125%. Start health panel NOW: DCM1–5, HD, ED, Holter — do not wait until 2028.',
    line: 'Cross',
    generation: 2,
    breeding_role: 'Dam',
  },
  {
    fragments: ['Hunter', 'Hillo'],
    notes: 'Foundation sire for Line A and Line B. Cannot breed Hailey or Cendra (daughters) or Hannah (uncle/niece via Havana). PSA1 (1st Leg).',
    line: 'A',
    generation: 1,
    breeding_role: 'Sire',
  },
  {
    fragments: ['Cendra'],
    notes: 'Hunter\'s daughter — cannot breed Hunter. Age ~3, prime breeding window. Santini × Cendra pups sale only. Do NOT breed Santini × Cendra pups with Santini × Claire pups (shared sire + related dams). Cendra\'s daughters CAN breed D/C Son (Bridge Sire).',
    flag_sale_only: true,
    line: 'Sale',
    generation: 1,
    breeding_role: 'Dam',
  },
  {
    fragments: ['Kim'],
    notes: 'DOB Sep 2025 — do not breed before Mar 2027 (min 18 months, ideally 24). Sire = Dharkha: Kim is D/C Son\'s half-sister — D/C Son CANNOT breed Kim. Dam = Odessa: Kim daughters and Odessa daughters cannot breed together. Hunter × Kim daughters CAN breed D/C Son.',
    line: 'B',
    generation: 1,
    breeding_role: 'Dam',
  },
  {
    fragments: ['Claire'],
    notes: 'All Santini × Claire pups trained and sold — breeding complete. Sire = Dharkha: Claire is D/C Son\'s half-sister — D/C Son CANNOT breed Claire. Half-sister to Cendra (same dam Raconti Gravin Zone) and Kim (same sire Dharkha).',
    flag_sale_only: true,
    line: 'Sale',
    generation: 1,
    breeding_role: 'Dam',
  },
  {
    fragments: ['Cyrus'],
    notes: 'Hunter\'s daughter — cannot breed Hunter or any Hunter son (half-siblings). Cyrus (Cyprys De Zelig) COI = 25% — full DCM1–5 + Holter mandatory before first breeding. Holter all offspring at 2 years. NOW HAS VIABLE PAIRING: D/C Son × Cyrus Pup = 0% COI (D/C Son\'s sire is Dharkha, not Hunter).',
    flag_high_coi_bg: true,
    flag_sale_only: true,
    line: 'Sale',
    generation: 1,
    breeding_role: 'Dam',
  },
];
```

### 3.4 — Update the seedBreedingProgrammeIfEmpty function signature

After the inserts loop, also patch the new flag columns if they exist on the dogs table:

```typescript
for (const upd of DOG_NOTE_UPDATES) {
  const id = await findDogId(lookup, ...upd.fragments);
  if (!id) continue;
  const patch: TablesUpdate<'dogs'> & {
    flag_last_litter?: boolean;
    flag_bridge_sire?: boolean;
    flag_sale_only?: boolean;
    flag_dcm_carrier?: boolean;
    flag_high_coi_bg?: boolean;
  } = {};
  if (upd.notes) patch.notes = upd.notes;
  if (upd.urgency) patch.urgency_flag = true;
  if (upd.line) patch.line = upd.line;
  if (upd.generation) patch.generation = upd.generation;
  if ('breeding_role' in upd && upd.breeding_role) patch.breeding_role = upd.breeding_role;
  // Patch flag columns if they exist in the schema
  if (upd.flag_last_litter) (patch as Record<string, unknown>).flag_last_litter = true;
  if (upd.flag_sale_only) (patch as Record<string, unknown>).flag_sale_only = true;
  if (upd.flag_dcm_carrier) (patch as Record<string, unknown>).flag_dcm_carrier = true;
  if (upd.flag_high_coi_bg) (patch as Record<string, unknown>).flag_high_coi_bg = true;
  if (Object.keys(patch).length) {
    await client.from('dogs').update(patch).eq('id', id);
  }
}
```

### 3.5 — Seed the D/C Son prospect record

Add this function and call it from `seedBreedingProgrammeIfEmpty`:

```typescript
async function seedDCSonProspect(client: ReturnType<typeof requireSupabase>, lookup: DogLookup): Promise<void> {
  // Find Dharkha and Cleopatra IDs
  const dharkhaId = await findDogId(lookup, 'Dharkha');
  const cleoId = await findDogId(lookup, 'Cleopatra');
  if (!dharkhaId || !cleoId) return;

  // Check if D/C Son already exists
  const existing = await findDogId(lookup, 'DC Son', 'D/C Son');
  if (existing) return;

  // Insert prospect record
  await client.from('dogs').insert({
    name: 'D/C Son (Bridge Sire)',
    call_name: 'D/C Son',
    sex: 'male',
    father_id: dharkhaId,
    mother_id: cleoId,
    line: 'Bridge',
    generation: 2,
    breeding_role: 'Sire',
    status: 'prospect',
    notes: 'Bridge Sire — retained from Dharkha × Cleopatra litter. His sire = Dharkha (NOT Hunter) → can breed ALL Hunter daughters at 0% COI. CANNOT breed: Claire (half-sib via Dharkha), Kim (half-sib via Dharkha), Hunter × Cleo daughters (half-sib via Cleo). Full DCM1–5 + HD + ED mandatory before any programme use. Update name when born.',
  } as TablesInsert<'dogs'>);
}
```

Call `seedDCSonProspect(client, lookup)` at the end of `seedBreedingProgrammeIfEmpty`, after the dog note updates loop.

---

## TASK 4 — Update `lib/breeding/programme-health.ts`

Find the programme health alert logic and ensure these alerts are included:

```typescript
// In your alert generation function, add these checks:

// Dharkha urgency — Bridge Sire plan at risk
const dharkha = dogs?.find(d => d.name.toLowerCase().includes('dharkha'));
if (dharkha && dharkha.urgency_flag) {
  alerts.push('⚡ DHARKHA — Sperm quality declining. One litter remaining. Breed Cleopatra NOW before Hunter. Semen eval mandatory first.');
}

// Odessa last litter
const odessa = dogs?.find(d => d.name.toLowerCase().includes('odessa'));
if (odessa && odessa.urgency_flag) {
  alerts.push('⚡ ODESSA — Last litter remaining. Breed to Hunter on next heat.');
}

// Hailey age urgency
const hailey = dogs?.find(d => d.name.toLowerCase().includes('hailey'));
if (hailey && hailey.urgency_flag) {
  alerts.push('⚡ HAILEY — Age 5. Breed to Santini on next heat. Prime window closing.');
}

// D/C Son not yet born
const dcSon = dogs?.find(d => d.name.toLowerCase().includes('dc son') || d.name.toLowerCase().includes('d/c son'));
if (!dcSon || dcSon.status === 'prospect') {
  alerts.push('🔷 D/C Son (Bridge Sire) not yet born — Gen 2 Line B pairings are pending his arrival and health clearance.');
}
```

---

## TASK 5 — Update `app/(admin)/breeding/index.tsx`

### 5.1 — Add Bridge Sire Panel

Add a dedicated teal-bordered Bridge Sire status card to the dashboard, displayed ABOVE the active pairings list. It should show:
- D/C Son birth status (Prospect / Born / Health-cleared)
- Which females he CAN breed when ready
- Which females he CANNOT breed

```typescript
// Add this component or inline JSX section:
// Position: after the urgentDams alerts, before the generation tabs

{/* BRIDGE SIRE PANEL */}
<View className="mx-6 mb-4 rounded-xl border-2 p-4" style={{ borderColor: '#006666', backgroundColor: '#001a1a' }}>
  <View className="mb-2 flex-row items-center gap-2">
    <View className="h-2 w-2 rounded-full" style={{ backgroundColor: '#00cccc' }} />
    <Typography variant="label" style={{ color: '#00cccc' }}>
      BRIDGE SIRE — D/C Son (Dharkha × Cleopatra)
    </Typography>
  </View>
  <Typography variant="caption" className="mb-2" style={{ color: '#66dddd' }}>
    Status: {dcSonStatus} {/* 'Prospect — not yet born' | 'Born — health tests pending' | 'Health cleared — ready' */}
  </Typography>
  <Typography variant="caption" style={{ color: '#aaffff' }}>
    ✓ CAN breed: Hailey daughters · Cendra daughters · Hunter/Odessa daughters · Hunter/Kim daughters · Cyrus pup
  </Typography>
  <Typography variant="caption" className="mt-1" style={{ color: '#ff9999' }}>
    ✗ CANNOT breed: Claire · Kim · Hunter/Cleo daughters
  </Typography>
  <Typography variant="caption" className="mt-2" style={{ color: '#888' }}>
    Why: D/C Son's sire is Dharkha (not Hunter) → 0% COI with all Hunter daughters
  </Typography>
</View>
```

Derive `dcSonStatus` from the active pairings or dogs list:
```typescript
const dcSon = /* find from dogs list or pairings */ null;
const dcSonStatus = !dcSon
  ? 'Prospect — Dharkha × Cleo litter not yet born'
  : dcSon.status === 'active'
  ? 'Born — health tests in progress'
  : 'Ready';
```

### 5.2 — Visual section labels for pairings

Separate the `activePairings` display into three visual groups by adding section headers:

```typescript
// Group pairings by type
const bridgePairings = activePairings.filter(p => p.line === 'Bridge');
const programmePairings = activePairings.filter(p => p.line === 'A' || p.line === 'B');
const salePairings = activePairings.filter(p => p.line === 'Sale');

// Render with section labels:
// ── BRIDGE PAIRING (teal header) ──
// ── PROGRAMME PAIRINGS — HUNTER (gold header) ──
// ── SALE PAIRINGS — SANTINI (purple header) ──
```

---

## TASK 6 — Migration (if new dog flag columns are needed)

Check if the `dogs` table already has these columns. If NOT present, create:
`supabase/migrations/0033_breeding_dog_flags.sql`

```sql
-- Add breeding programme flag columns to dogs table
-- Only adds columns that don't already exist

ALTER TABLE dogs
  ADD COLUMN IF NOT EXISTS flag_last_litter     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_bridge_sire     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_sale_only       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_dcm_carrier     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_high_coi_bg     boolean DEFAULT false;

-- Add line enum value 'Bridge' and 'Sale' if not present
-- (only if line is an enum type — skip if it's text)
-- Check first: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'dogs' AND column_name = 'line';
```

**IMPORTANT:** Before creating this migration, read the existing migration files to check if these columns already exist. If they exist, skip this task entirely.

---

## CRITICAL WARNINGS

- Do NOT rebuild existing screens or components — only update the files listed above
- Do NOT apply any migration that creates a table or column that already exists — use `ADD COLUMN IF NOT EXISTS`
- The `line` field for Hunter × Cleopatra is `'A'` (Line A — American Working) NOT `'B'` — this was wrong in the old seed
- Dharkha × Cleopatra is `priority: 'Critical'` and must appear FIRST in the seed array so it seeds first
- D/C Son's dam = Cleopatra AND D/C Son's sire = Dharkha — this is what makes him the Bridge Sire
- Sale pairings use `line: 'Sale'` — not `'A'` or `'B'`
- Never put `SUPABASE_SERVICE_ROLE_KEY` in client code

---

## TESTING CHECKLIST

- [ ] Pairing builder: select Hunter as sire + Hailey as dam → BLOCKED "Father/daughter"
- [ ] Pairing builder: select Hunter as sire + Cyrus Pup as dam → BLOCKED "Father/daughter"
- [ ] Pairing builder: select D/C Son as sire + Claire as dam → BLOCKED "Half-siblings via Dharkha"
- [ ] Pairing builder: select D/C Son as sire + Kim as dam → BLOCKED "Half-siblings via Dharkha"
- [ ] Pairing builder: select D/C Son as sire + Hunter/Odessa daughter → GREEN "Bridge Sire — 0% COI"
- [ ] Pairing builder: select Santini as sire → yellow "Sale only — DCM carrier" banner
- [ ] Dashboard: Bridge Sire panel visible in teal with CAN/CANNOT breed lists
- [ ] Dashboard Gen 1 tab: shows Dharkha × Cleo as first pairing (Critical priority)
- [ ] Dashboard Gen 1 tab: Hunter × Cleo shows Line A (not Line B)
- [ ] Dashboard Gen 1 tab: Hunter × Odessa shows as Urgent
- [ ] Dashboard Gen 2 tab: D/C Son pairings shown with 0% COI labels
- [ ] Urgency alerts: Dharkha, Odessa, Hailey all showing ⚡ alerts
- [ ] `npx tsc --noEmit` passes with zero errors

---

## REFERENCE — COMPLETE PROHIBITED PAIRS (pedigree-confirmed)

| Sire | Dam | Reason |
|------|-----|--------|
| Hunter | Hailey | Father/daughter |
| Hunter | Cendra | Father/daughter |
| Hunter | Cyrus Pup | Father/daughter |
| Hunter | Hannah | Uncle/niece (Havana = Hunter's full sister = Hannah's dam) |
| Santini | Hannah | Half-siblings (both by Napoleon Betelges) |
| D/C Son | Claire | Half-siblings via Dharkha Betelges |
| D/C Son | Kim | Half-siblings via Dharkha Betelges |
| D/C Son | Hunter/Cleo daughters | Half-siblings via Cleopatra (shared dam) |
| Any Hunter son | Cyrus Pup | Half-siblings (Cyrus Pup's sire = Hunter) |
| Hunter/Odessa daughter | Hunter/Kim son | Half-siblings via Odessa (Kim's dam is Odessa) |
| Santini/Claire pups | Santini/Cendra pups | Shared sire + related dams (Claire & Cendra share dam Raconti Gravin Zone) |

*Version 4 — July 2026 — Bridge Sire Plan — Diedericks Dobermanns*
