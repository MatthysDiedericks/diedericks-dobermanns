/**
 * Apply phone normalisation, auto-merges, and review-queue inserts.
 */

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 */
export async function loadExistingPairs(sb) {
  const { data, error } = await sb
    .from('contact_duplicate_candidates')
    .select('contact_a_id, contact_b_id, status');
  if (error) throw new Error(error.message);
  const open = new Set();
  const blocked = new Set();
  for (const r of data ?? []) {
    const key = `${r.contact_a_id}:${r.contact_b_id}`;
    if (r.status === 'not_duplicates' || r.status === 'merged') blocked.add(key);
    else open.add(key);
  }
  return { open, blocked };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @param {{ phonePatches: any[]; autoMerges: any[]; queueMedium: any[]; queueLow: any[] }} plan
 */
export async function applyDedupeWrites(sb, plan) {
  const { phonePatches, autoMerges, queueMedium, queueLow } = plan;
  let normalised = 0;
  let merged = 0;
  let queued = 0;

  for (let i = 0; i < phonePatches.length; i += 50) {
    const batch = phonePatches.slice(i, i + 50);
    for (const p of batch) {
      const { error } = await sb
        .from('contacts')
        .update({ phone_e164: p.phone_e164, whatsapp_e164: p.whatsapp_e164 })
        .eq('id', p.id);
      if (error) console.error('  phone update failed:', error.message);
      else normalised++;
    }
  }

  const { blocked, open } = await loadExistingPairs(sb);

  for (const m of autoMerges) {
    const loser = m.survivor.id === m.a.id ? m.b : m.a;
    if (loser.merged_into_contact_id || m.survivor.merged_into_contact_id) continue;
    const { error } = await sb.rpc('merge_contacts', {
      p_survivor_id: m.survivor.id,
      p_loser_id: loser.id,
      p_actor_id: null,
    });
    if (error) console.error(`  merge failed ${m.survivor.full_name}:`, error.message);
    else {
      merged++;
      loser.merged_into_contact_id = m.survivor.id;
    }
  }

  for (const q of [...queueMedium, ...queueLow]) {
    const key = `${q.a.id}:${q.b.id}`;
    if (blocked.has(key) || open.has(key)) continue;
    if (q.a.merged_into_contact_id || q.b.merged_into_contact_id) continue;
    const { error } = await sb.from('contact_duplicate_candidates').upsert(
      {
        contact_a_id: q.a.id,
        contact_b_id: q.b.id,
        match_reason: q.reason,
        match_detail: q.detail,
        confidence: q.confidence,
        status: 'open',
      },
      { onConflict: 'contact_a_id,contact_b_id', ignoreDuplicates: true },
    );
    if (error) console.error('  queue insert failed:', error.message);
    else queued++;
  }

  return { normalised, merged, queued };
}
