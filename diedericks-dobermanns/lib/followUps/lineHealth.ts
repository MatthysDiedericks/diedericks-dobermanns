import { requireSupabase } from '@/lib/supabase';

export type LineHealthStat = {
  parentId: string;
  parentName: string;
  role: 'sire' | 'dam';
  avgLifespanYears: number | null;
  nLifespan: number;
  dcmScreened: number;
  dcmTotal: number;
  conditions: Record<string, number>;
  responses: number;
  checkInsSent: number;
};

type ParentAgg = {
  parentId: string;
  parentName: string;
  role: 'sire' | 'dam';
  lifespans: number[];
  dcmScreened: number;
  dcmTotal: number;
  conditions: Record<string, number>;
  dogIds: Set<string>;
};

export type LineHealthReport = {
  bySire: LineHealthStat[];
  byDam: LineHealthStat[];
  overall: {
    avgLifespanYears: number | null;
    nLifespan: number;
    dcmRate: number | null;
    nDcm: number;
    responseRate: number | null;
    nSent: number;
    nAnswered: number;
    conditions: Record<string, number>;
  };
};

type LitterJoin = {
  mother: { id: string; name: string } | null;
  father: { id: string; name: string } | null;
};

export async function fetchLineHealthReport(): Promise<LineHealthReport> {
  const client = requireSupabase();
  const [{ data: reports, error: rErr }, { data: checkIns, error: cErr }, { data: dogs, error: dErr }] =
    await Promise.all([
      client
        .from('owner_health_reports')
        .select('dog_id, overall, dcm_screened, conditions, age_at_death_months, died_at'),
      client.from('check_ins').select('dog_id, status').in('status', ['sent', 'answered', 'no_response']),
      client
        .from('dogs')
        .select(
          'id, litter_id, litter:litters!dogs_litter_id_fkey(mother_id, father_id, mother:dogs!litters_mother_id_fkey(id, name), father:dogs!litters_father_id_fkey(id, name))',
        )
        .not('owner_contact_id', 'is', null),
    ]);
  if (rErr) throw new Error(rErr.message);
  if (cErr) throw new Error(cErr.message);
  if (dErr) throw new Error(dErr.message);

  const parents = new Map<string, ParentAgg>();
  const dogParent = new Map<string, { sire?: { id: string; name: string }; dam?: { id: string; name: string } }>();

  function ensure(role: 'sire' | 'dam', dog: { id: string; name: string }) {
    const key = `${role}:${dog.id}`;
    if (!parents.has(key)) {
      parents.set(key, {
        parentId: dog.id,
        parentName: dog.name,
        role,
        lifespans: [],
        dcmScreened: 0,
        dcmTotal: 0,
        conditions: {},
        dogIds: new Set(),
      });
    }
    return parents.get(key)!;
  }

  for (const d of dogs ?? []) {
    const litter = d.litter as unknown as LitterJoin | null;
    if (!litter) continue;
    const entry: { sire?: { id: string; name: string }; dam?: { id: string; name: string } } = {};
    if (litter.father) {
      entry.sire = litter.father;
      ensure('sire', litter.father).dogIds.add(d.id);
    }
    if (litter.mother) {
      entry.dam = litter.mother;
      ensure('dam', litter.mother).dogIds.add(d.id);
    }
    dogParent.set(d.id, entry);
  }

  const overallConditions: Record<string, number> = {};
  const overallLifespans: number[] = [];
  let dcmScreened = 0;
  let dcmTotal = 0;

  for (const r of reports ?? []) {
    const linked = dogParent.get(r.dog_id);
    if (r.age_at_death_months != null) overallLifespans.push(r.age_at_death_months / 12);
    if (r.dcm_screened != null) {
      dcmTotal += 1;
      if (r.dcm_screened) dcmScreened += 1;
    }
    for (const c of r.conditions ?? []) {
      overallConditions[c] = (overallConditions[c] ?? 0) + 1;
    }
    for (const role of ['sire', 'dam'] as const) {
      const p = linked?.[role];
      if (!p) continue;
      const agg = parents.get(`${role}:${p.id}`);
      if (!agg) continue;
      if (r.age_at_death_months != null) agg.lifespans.push(r.age_at_death_months / 12);
      if (r.dcm_screened != null) {
        agg.dcmTotal += 1;
        if (r.dcm_screened) agg.dcmScreened += 1;
      }
      for (const c of r.conditions ?? []) {
        agg.conditions[c] = (agg.conditions[c] ?? 0) + 1;
      }
    }
  }

  let nSent = 0;
  let nAnswered = 0;
  const sentByDog = new Map<string, { sent: number; answered: number }>();
  for (const c of checkIns ?? []) {
    nSent += 1;
    if (c.status === 'answered') nAnswered += 1;
    const cur = sentByDog.get(c.dog_id) ?? { sent: 0, answered: 0 };
    cur.sent += 1;
    if (c.status === 'answered') cur.answered += 1;
    sentByDog.set(c.dog_id, cur);
  }

  function toStat(agg: ParentAgg): LineHealthStat {
    let responses = 0;
    let checkInsSent = 0;
    for (const id of agg.dogIds) {
      const s = sentByDog.get(id);
      if (s) {
        checkInsSent += s.sent;
        responses += s.answered;
      }
    }
    return {
      parentId: agg.parentId,
      parentName: agg.parentName,
      role: agg.role,
      avgLifespanYears:
        agg.lifespans.length > 0
          ? agg.lifespans.reduce((a, b) => a + b, 0) / agg.lifespans.length
          : null,
      nLifespan: agg.lifespans.length,
      dcmScreened: agg.dcmScreened,
      dcmTotal: agg.dcmTotal,
      conditions: agg.conditions,
      responses,
      checkInsSent,
    };
  }

  const stats = [...parents.values()].map(toStat);
  return {
    bySire: stats.filter((s) => s.role === 'sire'),
    byDam: stats.filter((s) => s.role === 'dam'),
    overall: {
      avgLifespanYears:
        overallLifespans.length > 0
          ? overallLifespans.reduce((a, b) => a + b, 0) / overallLifespans.length
          : null,
      nLifespan: overallLifespans.length,
      dcmRate: dcmTotal > 0 ? dcmScreened / dcmTotal : null,
      nDcm: dcmTotal,
      responseRate: nSent > 0 ? nAnswered / nSent : null,
      nSent,
      nAnswered,
      conditions: overallConditions,
    },
  };
}
