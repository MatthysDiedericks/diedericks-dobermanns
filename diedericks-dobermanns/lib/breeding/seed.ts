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
  line: 'A' | 'B' | 'Cross';
  status: PairingRecord['status'];
  priority: PairingRecord['priority'];
  notes: string;
  generation?: number;
}

const GEN1_PAIRINGS: SeedPairing[] = [
  {
    sire: ['Santini'],
    dam: ['Claire'],
    line: 'Cross',
    status: 'Completed',
    priority: 'Done',
    notes: 'Cross litter. Retain best female for Gen 2 cross pool.',
  },
  {
    sire: ['Santini'],
    dam: ['Hailey'],
    line: 'A',
    status: 'Planned',
    priority: 'Urgent',
    notes: 'Hailey age 5 — act on next heat.',
  },
  {
    sire: ['Santini'],
    dam: ['Cendra'],
    line: 'A',
    status: 'Planned',
    priority: 'Active',
    notes: 'Cendra age 3 — prime window.',
  },
  {
    sire: ['Hunter'],
    dam: ['Cleopatra'],
    line: 'B',
    status: 'Planned',
    priority: 'Critical',
    notes: 'Only pure Line B Gen 1 litter. Line B Sire 2 must come from here.',
  },
  {
    sire: ['Hunter'],
    dam: ['Kim'],
    line: 'B',
    status: 'Planned',
    priority: 'Future',
    notes: 'Kim DOB Sep 2025 — minimum 18 months. Target 2027.',
    generation: 1,
  },
];

const PROHIBITED_PAIRINGS: SeedPairing[] = [
  {
    sire: ['Hunter'],
    dam: ['Hailey'],
    line: 'B',
    status: 'Prohibited',
    priority: 'Prohibited',
    notes: 'Father/daughter',
  },
  {
    sire: ['Hunter'],
    dam: ['Cendra'],
    line: 'B',
    status: 'Prohibited',
    priority: 'Prohibited',
    notes: 'Father/daughter',
  },
  {
    sire: ['Santini'],
    dam: ['Hannah'],
    line: 'A',
    status: 'Prohibited',
    priority: 'Prohibited',
    notes: 'Half-siblings (both by Napoleon Betelges)',
  },
  {
    sire: ['Hunter'],
    dam: ['Hannah'],
    line: 'Cross',
    status: 'Prohibited',
    priority: 'Prohibited',
    notes: "Uncle/niece (Hunter's sister Havana is Hannah's dam)",
  },
];

const DOG_NOTE_UPDATES: {
  fragments: string[];
  notes?: string;
  urgency?: boolean;
  line?: BreedingDog['line'];
  generation?: number;
  breeding_role?: BreedingDog['breeding_role'];
}[] = [
  {
    fragments: ['Santini'],
    notes: 'Verify own DCM1–5 before first use as sire',
    line: 'A',
    generation: 1,
    breeding_role: 'Sire',
  },
  {
    fragments: ['Hailey'],
    notes:
      'Dam (Raconti Toffi) has 25% internal COI — Holter-monitor ALL retained pups from Santini × Hailey at age 2 before using as breeders',
    urgency: true,
    line: 'A',
    generation: 1,
    breeding_role: 'Dam',
  },
  {
    fragments: ['Cleopatra'],
    notes:
      'American lines — run full American-specific DCM variant panel (not just standard European panel)',
    line: 'B',
    generation: 1,
    breeding_role: 'Dam',
  },
  {
    fragments: ['Hannah'],
    notes:
      'Cannot breed in Gen 1. Awaiting best male from Hunter × Cleopatra (Line B Sire 2) in Gen 2 (~2028). Target pairing: Hannah × Line B Sire 2.',
    line: 'A',
    generation: 1,
    breeding_role: 'Dam',
  },
  {
    fragments: ['Hunter'],
    line: 'B',
    generation: 1,
    breeding_role: 'Sire',
    notes: 'Foundation Cross Line primary sire (Gen 1).',
  },
  {
    fragments: ['Cendra'],
    line: 'A',
    generation: 1,
    breeding_role: 'Dam',
  },
  {
    fragments: ['Kim'],
    line: 'B',
    generation: 1,
    breeding_role: 'Dam',
  },
] as const;

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
    if (upd.notes) patch.notes = upd.notes;
    if (upd.urgency) patch.urgency_flag = true;
    if (upd.line) patch.line = upd.line;
    if (upd.generation) patch.generation = upd.generation;
    if ('breeding_role' in upd && upd.breeding_role) patch.breeding_role = upd.breeding_role;
    if (Object.keys(patch).length) {
      await client.from('dogs').update(patch).eq('id', id);
    }
  }

  return true;
}
