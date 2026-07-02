import type { BreedingDog, PairingRecord } from '@/types/breeding';
import type { TablesInsert, TablesUpdate } from '@/types/database.types';
import { requireSupabase } from '@/lib/supabase';

type DogLookup = Map<string, string>;

async function findDogId(lookup: DogLookup, ...fragments: string[]): Promise<string | null> {
  for (const fragment of fragments) {
    const key = fragment.toLowerCase();
    for (const [name, id] of lookup) {
      if (name.includes(key)) return id;
    }
  }
  return null;
}

function buildLookup(dogs: { id: string; name: string }[]): DogLookup {
  return new Map(dogs.map((d) => [d.name.toLowerCase(), d.id]));
}

interface SeedPairing {
  sire: string[];
  dam: string[];
  line: 'A' | 'B' | 'Bridge' | 'Sale' | 'Cross';
  status: PairingRecord['status'];
  priority: PairingRecord['priority'];
  notes: string;
  generation?: number;
}

const GEN1_PAIRINGS: SeedPairing[] = [
  {
    sire: ['Dharkha'],
    dam: ['Cleopatra'],
    line: 'Bridge',
    status: 'Planned',
    priority: 'Critical',
    notes:
      'BRIDGE PAIRING — DO THIS FIRST before Hunter × Cleo. Dharkha sperm declining — one litter remaining. D/C Son (retained male) will be the Gen 2 engine — his sire is Dharkha, NOT Hunter, so he can breed every Hunter daughter at 0% COI. Semen quality eval on Dharkha FIRST. DCM1–5 both parents. American DCM panel on Cleo.',
    generation: 1,
  },
  {
    sire: ['Hunter'],
    dam: ['Cleopatra'],
    line: 'A',
    status: 'Planned',
    priority: 'Critical',
    notes:
      "LINE A FOUNDATION — breed on Cleo's NEXT heat after Dharkha litter. True American outcross — Benchmark/Masaya × Smart Wood Hills/Panama. Retain: best son = Line A Sire 2; best 1–2 daughters = Line A dam pool. NOTE: Hunter × Cleo daughters are half-siblings of D/C Son (shared dam Cleo) — D/C Son cannot breed them.",
    generation: 1,
  },
  {
    sire: ['Hunter'],
    dam: ['Odessa'],
    line: 'B',
    status: 'Planned',
    priority: 'Urgent',
    notes:
      'LINE B — LAST LITTER for Odessa. Ennaxor/Wandrahm genetics unique to this litter. Holter Odessa before breeding. Full vet oversight. Retain: best daughter → Line B dam pool for D/C Son to breed in Gen 2.',
    generation: 1,
  },
  {
    sire: ['Hunter'],
    dam: ['Kim'],
    line: 'B',
    status: 'Planned',
    priority: 'Future',
    notes:
      "Kim DOB Sep 2025 — minimum 18 months. Do not breed before Mar 2027. Kim is D/C Son's half-sister (same sire Dharkha) — D/C Son cannot breed Kim. Hunter × Kim daughters CAN breed D/C Son (their sire is Hunter, not Dharkha).",
    generation: 1,
  },
  {
    sire: ['Santini'],
    dam: ['Claire'],
    line: 'Sale',
    status: 'Completed',
    priority: 'Done',
    notes:
      "COMPLETED — all pups trained and sold. No retention. Claire is D/C Son's half-sister via Dharkha — D/C Son cannot breed Claire.",
    generation: 1,
  },
  {
    sire: ['Santini'],
    dam: ['Hailey'],
    line: 'Sale',
    status: 'Planned',
    priority: 'Urgent',
    notes:
      "Hailey age 5 — URGENT, breed on next heat. All pups sale only. Holter all pups at 2 years (Raconti Toffi dam has 25% COI). Hailey's daughters CAN breed D/C Son in Gen 2.",
    generation: 1,
  },
  {
    sire: ['Santini'],
    dam: ['Cendra'],
    line: 'Sale',
    status: 'Planned',
    priority: 'Active',
    notes:
      "Cendra age ~3, prime window. All pups sale only. Cendra's daughters CAN breed D/C Son in Gen 2.",
    generation: 1,
  },
];

const PROHIBITED_PAIRINGS: SeedPairing[] = [
  {
    sire: ['Hunter'],
    dam: ['Hailey'],
    line: 'Sale',
    status: 'Prohibited',
    priority: 'Prohibited',
    notes: "Father/daughter — Hillo Betelges confirmed as Hailey's sire (pedigree)",
  },
  {
    sire: ['Hunter'],
    dam: ['Cendra'],
    line: 'Sale',
    status: 'Prohibited',
    priority: 'Prohibited',
    notes: "Father/daughter — Hillo Betelges confirmed as Cendra's sire (pedigree)",
  },
  {
    sire: ['Hunter'],
    dam: ['Cyrus'],
    line: 'Sale',
    status: 'Prohibited',
    priority: 'Prohibited',
    notes: "Father/daughter — Hunter confirmed as Cyrus Pup's sire (owner confirmed)",
  },
  {
    sire: ['Hunter'],
    dam: ['Hannah'],
    line: 'Cross',
    status: 'Prohibited',
    priority: 'Prohibited',
    notes: "Uncle/niece — Havana Betelges is Hunter's full sister (both by Boromir × Panama) and Hannah's dam",
  },
  {
    sire: ['Santini'],
    dam: ['Hannah'],
    line: 'Cross',
    status: 'Prohibited',
    priority: 'Prohibited',
    notes: 'Half-siblings — both sired by Napoleon Betelges',
  },
  {
    sire: ['DC Son', 'D/C Son'],
    dam: ['Claire'],
    line: 'Bridge',
    status: 'Prohibited',
    priority: 'Prohibited',
    notes: "Half-siblings via Dharkha Betelges — D/C Son's sire is Dharkha; Claire's sire is Dharkha",
  },
  {
    sire: ['DC Son', 'D/C Son'],
    dam: ['Kim'],
    line: 'Bridge',
    status: 'Prohibited',
    priority: 'Prohibited',
    notes: "Half-siblings via Dharkha Betelges — D/C Son's sire is Dharkha; Kim's sire is Dharkha",
  },
];

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
    notes:
      'BRIDGE SIRE PRODUCER — sperm quality declining, possibly ONE litter remaining. Breed to Cleopatra FIRST before Hunter. Semen quality evaluation MANDATORY before breeding. DCM1–5 + HD + ED required. If semen eval fails, Bridge Sire plan is at risk — alert immediately.',
    urgency: true,
    flag_last_litter: true,
    line: 'Bridge',
    generation: 1,
    breeding_role: 'Sire',
  },
  {
    fragments: ['Odessa'],
    notes:
      "Raconti Odessa — ONE LITTER LEFT before retirement. Breed to Hunter on next heat. Holter required before breeding. Full vet oversight. Odessa daughters and Kim daughters (Kim's dam is Odessa) cannot breed each other.",
    urgency: true,
    flag_last_litter: true,
    line: 'B',
    generation: 1,
    breeding_role: 'Dam',
  },
  {
    fragments: ['Santini'],
    notes:
      'DCM factor present (not active). All pups from Santini pairings are SALE ONLY — never retain for breeding succession. Verify DCM1–5 before each use.',
    flag_dcm_carrier: true,
    flag_sale_only: true,
    line: 'Sale',
    generation: 1,
    breeding_role: 'Sire',
  },
  {
    fragments: ['Hailey'],
    notes:
      "Hunter's daughter — cannot breed Hunter. Age 5 — URGENT. Santini × Hailey pups are sale only. Dam (Raconti Toffi) has 25% COI — Holter ALL pups at 2 years before using as breeders. Hailey's daughters CAN breed D/C Son (Bridge Sire) in Gen 2.",
    urgency: true,
    flag_high_coi_bg: true,
    flag_sale_only: true,
    line: 'Sale',
    generation: 1,
    breeding_role: 'Dam',
  },
  {
    fragments: ['Cleopatra'],
    notes:
      "American outcross — Benchmark's Egyptian God × Masaya's Razin A Ruckus. Zero shared ancestry with any European kennel dog. BREEDS TWICE IN GEN 1: Dharkha × Cleo FIRST (produces D/C Son Bridge Sire), then Hunter × Cleo on next heat (produces Line A Sire 2). Run full American-specific DCM variant panel — not just standard European DCM panel.",
    line: 'A',
    generation: 1,
    breeding_role: 'Dam',
  },
  {
    fragments: ['Hannah'],
    notes:
      'Cannot breed in Gen 1. CANNOT breed Santini (half-sib via Napoleon) or Hunter (uncle/niece — Havana Betelges is Hunter\'s full sister). Primary Gen 2 pairing: Line A Sire 2 (Hunter × Cleo son) — COI ≈ 1.95%. Alternative: D/C Son (Bridge Sire) — COI ≈ 3.125%. Start health panel NOW: DCM1–5, HD, ED, Holter — do not wait until 2028.',
    line: 'Cross',
    generation: 2,
    breeding_role: 'Dam',
  },
  {
    fragments: ['Hunter', 'Hillo'],
    notes:
      'Foundation sire for Line A and Line B. Cannot breed Hailey or Cendra (daughters) or Hannah (uncle/niece via Havana). PSA1 (1st Leg).',
    line: 'A',
    generation: 1,
    breeding_role: 'Sire',
  },
  {
    fragments: ['Cendra'],
    notes:
      "Hunter's daughter — cannot breed Hunter. Age ~3, prime breeding window. Santini × Cendra pups sale only. Do NOT breed Santini × Cendra pups with Santini × Claire pups (shared sire + related dams). Cendra's daughters CAN breed D/C Son (Bridge Sire).",
    flag_sale_only: true,
    line: 'Sale',
    generation: 1,
    breeding_role: 'Dam',
  },
  {
    fragments: ['Kim'],
    notes:
      'DOB Sep 2025 — do not breed before Mar 2027 (min 18 months, ideally 24). Sire = Dharkha: Kim is D/C Son\'s half-sister — D/C Son CANNOT breed Kim. Dam = Odessa: Kim daughters and Odessa daughters cannot breed together. Hunter × Kim daughters CAN breed D/C Son.',
    line: 'B',
    generation: 1,
    breeding_role: 'Dam',
  },
  {
    fragments: ['Claire'],
    notes:
      "All Santini × Claire pups trained and sold — breeding complete. Sire = Dharkha: Claire is D/C Son's half-sister — D/C Son CANNOT breed Claire. Half-sister to Cendra (same dam Raconti Gravin Zone) and Kim (same sire Dharkha).",
    flag_sale_only: true,
    line: 'Sale',
    generation: 1,
    breeding_role: 'Dam',
  },
  {
    fragments: ['Cyrus'],
    notes:
      "Hunter's daughter — cannot breed Hunter or any Hunter son (half-siblings). Cyrus (Cyprys De Zelig) COI = 25% — full DCM1–5 + Holter mandatory before first breeding. Holter all offspring at 2 years. NOW HAS VIABLE PAIRING: D/C Son × Cyrus Pup = 0% COI (D/C Son's sire is Dharkha, not Hunter).",
    flag_high_coi_bg: true,
    flag_sale_only: true,
    line: 'Sale',
    generation: 1,
    breeding_role: 'Dam',
  },
];

async function seedDCSonProspect(
  client: ReturnType<typeof requireSupabase>,
  lookup: DogLookup,
): Promise<void> {
  const dharkhaId = await findDogId(lookup, 'Dharkha');
  const cleoId = await findDogId(lookup, 'Cleopatra');
  if (!dharkhaId || !cleoId) return;

  const existing = await findDogId(lookup, 'DC Son', 'D/C Son');
  if (existing) return;

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
    notes:
      "Bridge Sire — retained from Dharkha × Cleopatra litter. His sire = Dharkha (NOT Hunter) → can breed ALL Hunter daughters at 0% COI. CANNOT breed: Claire (half-sib via Dharkha), Kim (half-sib via Dharkha), Hunter × Cleo daughters (half-sib via Cleo). Full DCM1–5 + HD + ED mandatory before any programme use. Update name when born.",
    ...( { flag_bridge_sire: true } as Record<string, unknown> ),
  } as TablesInsert<'dogs'>);
}

/** Seeds Gen 1 programme state when pairings table is empty. Idempotent. */
export async function seedBreedingProgrammeIfEmpty(): Promise<boolean> {
  const client = requireSupabase();

  const { count, error: countErr } = await client
    .from('pairings')
    .select('id', { count: 'exact', head: true });
  if (countErr) {
    console.warn('[seedBreedingProgramme]', countErr.message);
    return false;
  }
  if ((count ?? 0) > 0) return false;

  const { data: dogs, error: dogsErr } = await client.from('dogs').select('id, name');
  if (dogsErr || !dogs?.length) {
    console.warn('[seedBreedingProgramme] No dogs found for lookup');
    return false;
  }

  const lookup = buildLookup(dogs);

  const inserts: TablesInsert<'pairings'>[] = [];
  for (const p of [...GEN1_PAIRINGS, ...PROHIBITED_PAIRINGS]) {
    const sireId = await findDogId(lookup, ...p.sire);
    const damId = await findDogId(lookup, ...p.dam);
    if (!sireId || !damId) {
      console.warn(`[seedBreedingProgramme] Skipping ${p.sire}/${p.dam} — dog not found`);
      continue;
    }
    inserts.push({
      sire_id: sireId,
      dam_id: damId,
      line: p.line,
      generation: p.generation ?? 1,
      status: p.status,
      priority: p.priority,
      notes: p.notes,
    });
  }

  if (inserts.length) {
    const { error: insErr } = await client.from('pairings').insert(inserts);
    if (insErr) {
      console.warn('[seedBreedingProgramme] insert failed', insErr.message);
      return false;
    }
  }

  for (const upd of DOG_NOTE_UPDATES) {
    const id = await findDogId(lookup, ...upd.fragments);
    if (!id) continue;
    const patch: TablesUpdate<'dogs'> = {};
    const extended: Record<string, unknown> = {};
    if (upd.notes) patch.notes = upd.notes;
    if (upd.urgency) patch.urgency_flag = true;
    if (upd.line) patch.line = upd.line;
    if (upd.generation) patch.generation = upd.generation;
    if ('breeding_role' in upd && upd.breeding_role) patch.breeding_role = upd.breeding_role;
    if (upd.flag_last_litter) extended.flag_last_litter = true;
    if (upd.flag_sale_only) extended.flag_sale_only = true;
    if (upd.flag_dcm_carrier) extended.flag_dcm_carrier = true;
    if (upd.flag_high_coi_bg) extended.flag_high_coi_bg = true;
    const merged = { ...patch, ...extended };
    if (Object.keys(merged).length) {
      await client.from('dogs').update(merged as TablesUpdate<'dogs'>).eq('id', id);
    }
  }

  await seedDCSonProspect(client, lookup);

  return true;
}
