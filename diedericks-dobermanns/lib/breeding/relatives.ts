import { requireSupabase } from '@/lib/supabase';

export type RelativeDog = {
  id: string;
  name: string;
  call_name: string | null;
  sex: string | null;
  date_of_birth: string | null;
  litter_id: string | null;
  father_id: string | null;
  mother_id: string | null;
};

export type SiblingGroups = {
  littermates: RelativeDog[];
  fullSiblings: RelativeDog[];
  halfBySire: RelativeDog[];
  halfByDam: RelativeDog[];
};

export type ProgenyGroup = {
  litterId: string | null;
  litterLabel: string | null;
  actualDate: string | null;
  dogs: RelativeDog[];
};

const DOG_SELECT =
  'id, name, call_name, sex, date_of_birth, litter_id, father_id, mother_id';

function mapDog(row: Record<string, unknown>): RelativeDog {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    call_name: (row.call_name as string | null) ?? null,
    sex: (row.sex as string | null) ?? null,
    date_of_birth: (row.date_of_birth as string | null) ?? null,
    litter_id: (row.litter_id as string | null) ?? null,
    father_id: (row.father_id as string | null) ?? null,
    mother_id: (row.mother_id as string | null) ?? null,
  };
}

function byName(a: RelativeDog, b: RelativeDog) {
  return a.name.localeCompare(b.name);
}

export async function resolveDogParents(dogId: string): Promise<{
  litterId: string | null;
  fatherId: string | null;
  motherId: string | null;
}> {
  const { data } = await requireSupabase()
    .from('dogs')
    .select('mother_id, father_id, litter_id, litter:litter_id(mother_id, father_id)')
    .eq('id', dogId)
    .maybeSingle();
  if (!data) return { litterId: null, fatherId: null, motherId: null };
  const litter = data.litter as unknown as {
    mother_id: string | null;
    father_id: string | null;
  } | null;
  return {
    litterId: (data.litter_id as string | null) ?? null,
    fatherId: (data.father_id as string | null) ?? litter?.father_id ?? null,
    motherId: (data.mother_id as string | null) ?? litter?.mother_id ?? null,
  };
}

async function dogsByIds(ids: string[]): Promise<RelativeDog[]> {
  if (!ids.length) return [];
  const { data } = await requireSupabase().from('dogs').select(DOG_SELECT).in('id', ids);
  return (data ?? []).map((r) => mapDog(r as Record<string, unknown>));
}

async function puppyIdsFromLitters(filter: string): Promise<string[]> {
  const { data } = await requireSupabase()
    .from('litters')
    .select('id, puppies:dogs!dogs_litter_id_fkey(id)')
    .or(filter);
  const ids: string[] = [];
  for (const row of data ?? []) {
    const pups =
      (row as unknown as { puppies?: { id: string }[] | null }).puppies ?? [];
    for (const p of pups) ids.push(String(p.id));
  }
  return ids;
}

export async function fetchSiblingGroups(dogId: string): Promise<SiblingGroups> {
  const { litterId, fatherId, motherId } = await resolveDogParents(dogId);
  const empty: SiblingGroups = {
    littermates: [],
    fullSiblings: [],
    halfBySire: [],
    halfByDam: [],
  };

  let littermates: RelativeDog[] = [];
  if (litterId) {
    const { data } = await requireSupabase()
      .from('dogs')
      .select(DOG_SELECT)
      .eq('litter_id', litterId)
      .neq('id', dogId);
    littermates = (data ?? []).map((r) => mapDog(r as Record<string, unknown>)).sort(byName);
  }

  const littermateIds = new Set(littermates.map((d) => d.id));
  littermateIds.add(dogId);

  const candidateIds = new Set<string>();
  if (fatherId && motherId) {
    const { data: direct } = await requireSupabase()
      .from('dogs')
      .select('id')
      .eq('father_id', fatherId)
      .eq('mother_id', motherId)
      .neq('id', dogId);
    for (const r of direct ?? []) candidateIds.add(String(r.id));
    for (const id of await puppyIdsFromLitters(
      `and(mother_id.eq.${motherId},father_id.eq.${fatherId})`,
    )) {
      candidateIds.add(id);
    }
  }
  if (fatherId) {
    const { data: bySire } = await requireSupabase()
      .from('dogs')
      .select('id')
      .eq('father_id', fatherId)
      .neq('id', dogId);
    for (const r of bySire ?? []) candidateIds.add(String(r.id));
    for (const id of await puppyIdsFromLitters(`father_id.eq.${fatherId}`)) {
      candidateIds.add(id);
    }
  }
  if (motherId) {
    const { data: byDam } = await requireSupabase()
      .from('dogs')
      .select('id')
      .eq('mother_id', motherId)
      .neq('id', dogId);
    for (const r of byDam ?? []) candidateIds.add(String(r.id));
    for (const id of await puppyIdsFromLitters(`mother_id.eq.${motherId}`)) {
      candidateIds.add(id);
    }
  }

  const others = (await dogsByIds([...candidateIds].filter((id) => !littermateIds.has(id)))).map(
    (d) => d,
  );

  // Resolve effective parents for classification (dog cols or litter).
  const litterParentCache = new Map<string, { f: string | null; m: string | null }>();
  async function effectiveParents(d: RelativeDog): Promise<{ f: string | null; m: string | null }> {
    if (d.father_id || d.mother_id) {
      return { f: d.father_id, m: d.mother_id };
    }
    if (!d.litter_id) return { f: null, m: null };
    if (litterParentCache.has(d.litter_id)) return litterParentCache.get(d.litter_id)!;
    const { data } = await requireSupabase()
      .from('litters')
      .select('father_id, mother_id')
      .eq('id', d.litter_id)
      .maybeSingle();
    const parents = {
      f: (data?.father_id as string | null) ?? null,
      m: (data?.mother_id as string | null) ?? null,
    };
    litterParentCache.set(d.litter_id, parents);
    return parents;
  }

  const fullSiblings: RelativeDog[] = [];
  const halfBySire: RelativeDog[] = [];
  const halfByDam: RelativeDog[] = [];

  for (const d of others) {
    const { f, m } = await effectiveParents(d);
    const sameSire = Boolean(fatherId && f === fatherId);
    const sameDam = Boolean(motherId && m === motherId);
    if (sameSire && sameDam) fullSiblings.push(d);
    else if (sameSire && !sameDam) halfBySire.push(d);
    else if (sameDam && !sameSire) halfByDam.push(d);
  }

  return {
    littermates,
    fullSiblings: fullSiblings.sort(byName),
    halfBySire: halfBySire.sort(byName),
    halfByDam: halfByDam.sort(byName),
  };
}

export async function fetchProgenyGroups(dogId: string): Promise<ProgenyGroup[]> {
  const [{ data: direct }, { data: litters }] = await Promise.all([
    requireSupabase()
      .from('dogs')
      .select(DOG_SELECT)
      .or(`father_id.eq.${dogId},mother_id.eq.${dogId}`),
    requireSupabase()
      .from('litters')
      .select(
        'id, name, litter_letter, actual_date, puppies:dogs!dogs_litter_id_fkey(' +
          DOG_SELECT +
          ')',
      )
      .or(`mother_id.eq.${dogId},father_id.eq.${dogId}`)
      .order('actual_date', { ascending: false, nullsFirst: false }),
  ]);

  const byLitter = new Map<string | null, ProgenyGroup>();
  const seen = new Set<string>();

  for (const litter of litters ?? []) {
    const row = litter as unknown as {
      id: string;
      name: string | null;
      litter_letter: string | null;
      actual_date: string | null;
      puppies: Record<string, unknown>[] | null;
    };
    const dogs = (row.puppies ?? [])
      .map(mapDog)
      .filter((d) => d.id !== dogId)
      .sort(byName);
    for (const d of dogs) seen.add(d.id);
    if (!dogs.length) continue;
    byLitter.set(row.id, {
      litterId: row.id,
      litterLabel: row.litter_letter
        ? `Litter ${row.litter_letter}`
        : row.name?.trim() || 'Litter',
      actualDate: row.actual_date,
      dogs,
    });
  }

  const ungrouped: RelativeDog[] = [];
  for (const row of direct ?? []) {
    const d = mapDog(row as Record<string, unknown>);
    if (seen.has(d.id) || d.id === dogId) continue;
    if (!d.litter_id) {
      ungrouped.push(d);
      continue;
    }
    const existing = byLitter.get(d.litter_id);
    if (existing) {
      existing.dogs.push(d);
      existing.dogs.sort(byName);
    } else {
      byLitter.set(d.litter_id, {
        litterId: d.litter_id,
        litterLabel: 'Litter',
        actualDate: d.date_of_birth,
        dogs: [d],
      });
    }
    seen.add(d.id);
  }

  const groups = [...byLitter.values()].sort((a, b) =>
    (b.actualDate ?? '').localeCompare(a.actualDate ?? ''),
  );
  if (ungrouped.length) {
    groups.push({
      litterId: null,
      litterLabel: 'Ungrouped',
      actualDate: null,
      dogs: ungrouped.sort(byName),
    });
  }
  return groups;
}
