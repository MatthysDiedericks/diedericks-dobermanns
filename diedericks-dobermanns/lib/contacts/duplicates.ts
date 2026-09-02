import { requireSupabase } from '@/lib/supabase';

export type DupeContact = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  company: string | null;
  notes: string | null;
  contact_type: string;
  source: string | null;
};

export type MoveImpact = {
  dogs: number;
  checkIns: number;
  testimonials: number;
};

export type OpenDuplicatePair = {
  candidateId: string;
  confidence: string;
  matchReason: string;
  matchDetail: string | null;
  a: DupeContact;
  b: DupeContact;
  impactA: MoveImpact;
  impactB: MoveImpact;
};

const CONTACT_COLS =
  'id, full_name, email, phone, whatsapp_number, address, city, country, company, notes, contact_type, source';

const CONFIDENCE_RANK: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const EMPTY_IMPACT: MoveImpact = { dogs: 0, checkIns: 0, testimonials: 0 };

/** Counts FK rows that would move when this contact is merged away. */
export async function countMoveImpact(contactId: string): Promise<MoveImpact> {
  const supabase = requireSupabase();
  try {
    const [dogs, checkIns, testimonials] = await Promise.all([
      supabase
        .from('dogs')
        .select('id', { count: 'exact', head: true })
        .eq('owner_contact_id', contactId),
      supabase
        .from('check_ins')
        .select('id', { count: 'exact', head: true })
        .eq('contact_id', contactId),
      supabase
        .from('testimonials')
        .select('id', { count: 'exact', head: true })
        .eq('contact_id', contactId),
    ]);
    return {
      dogs: dogs.count ?? 0,
      checkIns: checkIns.count ?? 0,
      testimonials: testimonials.count ?? 0,
    };
  } catch (err) {
    console.error('[countMoveImpact]', err);
    return { ...EMPTY_IMPACT };
  }
}

export async function countOpenDuplicates(): Promise<number> {
  const supabase = requireSupabase();
  const { count, error } = await supabase
    .from('contact_duplicate_candidates')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open');
  if (error) {
    console.error('[countOpenDuplicates]', error.message);
    return 0;
  }
  return count ?? 0;
}

type CandidateRow = {
  id: string;
  contact_a_id: string;
  contact_b_id: string;
  match_reason: string;
  match_detail: string | null;
  confidence: string;
};

export async function fetchOpenDuplicatePairs(): Promise<OpenDuplicatePair[]> {
  const supabase = requireSupabase();
  const { data: raw, error } = await supabase
    .from('contact_duplicate_candidates')
    .select('id, contact_a_id, contact_b_id, match_reason, match_detail, confidence')
    .eq('status', 'open');
  if (error) throw new Error(error.message);

  const candidates = ((raw ?? []) as CandidateRow[]).sort((a, b) => {
    const ra = CONFIDENCE_RANK[a.confidence] ?? 9;
    const rb = CONFIDENCE_RANK[b.confidence] ?? 9;
    if (ra !== rb) return ra - rb;
    return a.id.localeCompare(b.id);
  });
  if (!candidates.length) return [];

  const ids = [...new Set(candidates.flatMap((c) => [c.contact_a_id, c.contact_b_id]))];
  const { data: contacts, error: contactErr } = await supabase
    .from('contacts')
    .select(CONTACT_COLS)
    .in('id', ids);
  if (contactErr) throw new Error(contactErr.message);

  const byId = new Map(((contacts ?? []) as DupeContact[]).map((c) => [c.id, c]));
  const impactEntries = await Promise.all(
    ids.map(async (id) => [id, await countMoveImpact(id)] as const),
  );
  const impactById = new Map(impactEntries);

  const pairs: OpenDuplicatePair[] = [];
  for (const c of candidates) {
    const a = byId.get(c.contact_a_id);
    const b = byId.get(c.contact_b_id);
    if (!a || !b) continue;
    pairs.push({
      candidateId: c.id,
      confidence: c.confidence,
      matchReason: c.match_reason,
      matchDetail: c.match_detail,
      a,
      b,
      impactA: impactById.get(a.id) ?? EMPTY_IMPACT,
      impactB: impactById.get(b.id) ?? EMPTY_IMPACT,
    });
  }
  return pairs;
}

/** Soft-merge via the existing RPC — never deletes the loser row. */
export async function mergeDuplicateCandidate(
  candidateId: string,
  survivorId: string,
  loserId: string,
  actorId: string,
): Promise<void> {
  if (survivorId === loserId) throw new Error('Pick two different contacts.');
  const supabase = requireSupabase();
  const { error } = await supabase.rpc('merge_contacts', {
    p_survivor_id: survivorId,
    p_loser_id: loserId,
    p_actor_id: actorId,
  });
  if (error) throw new Error(error.message);

  await supabase
    .from('contact_duplicate_candidates')
    .update({
      status: 'merged',
      resolved_by: actorId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', candidateId);
}

export async function resolveDuplicateNotSame(
  candidateId: string,
  actorId: string,
): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('contact_duplicate_candidates')
    .update({
      status: 'not_duplicates',
      resolved_by: actorId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', candidateId)
    .eq('status', 'open');
  if (error) throw new Error(error.message);
}
