import { requireSupabase } from '@/lib/supabase';
import { isScenario } from '@/lib/protection/constants';
import type { DogSkillRow, TemperamentArea } from '@/lib/protection/types';

export async function tickLibrarySkill(dogId: string, libraryId: string): Promise<string> {
  const supabase = requireSupabase();
  const { data: lib, error: libErr } = await supabase
    .from('skill_library' as never)
    .select('id, discipline, label, detail, default_conditions, sort_order')
    .eq('id' as never, libraryId)
    .maybeSingle();
  if (libErr) throw new Error(libErr.message);
  if (!lib) throw new Error('Skill is no longer in the library.');
  const row = lib as {
    id: string;
    discipline: string;
    label: string;
    detail: string | null;
    default_conditions: string[] | null;
    sort_order: number;
  };
  const { data: existing } = await supabase
    .from('dog_skills' as never)
    .select('id')
    .eq('dog_id' as never, dogId)
    .eq('library_id' as never, libraryId)
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;
  const { data, error } = await supabase
    .from('dog_skills' as never)
    .insert({
      dog_id: dogId,
      library_id: row.id,
      discipline: row.discipline,
      label: row.label,
      detail: row.detail,
      conditions: row.default_conditions ?? [],
      level: isScenario(row.discipline) ? null : 'solid',
      sort_order: row.sort_order ?? 0,
      is_public: true,
    } as never)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function deleteDogSkill(dogId: string, skillId: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('dog_skills' as never)
    .delete()
    .eq('id' as never, skillId)
    .eq('dog_id' as never, dogId);
  if (error) throw new Error(error.message);
}

export async function updateDogSkill(
  dogId: string,
  skillId: string,
  patch: Partial<Pick<DogSkillRow, 'level' | 'is_public' | 'detail' | 'label' | 'conditions'>>,
): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('dog_skills' as never)
    .update(patch as never)
    .eq('id' as never, skillId)
    .eq('dog_id' as never, dogId);
  if (error) throw new Error(error.message);
}

export async function addCustomSkill(input: {
  dogId: string;
  discipline: string;
  label: string;
  detail?: string | null;
}): Promise<string> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('dog_skills' as never)
    .insert({
      dog_id: input.dogId,
      library_id: null,
      discipline: input.discipline,
      label: input.label.trim(),
      detail: input.detail?.trim() || null,
      conditions: [],
      level: isScenario(input.discipline) ? null : 'solid',
      sort_order: 0,
      is_public: true,
    } as never)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function addSkillToLibrary(dogId: string, skillId: string): Promise<string> {
  const supabase = requireSupabase();
  const { data: skill, error: skillErr } = await supabase
    .from('dog_skills' as never)
    .select('discipline, label, detail, conditions')
    .eq('id' as never, skillId)
    .eq('dog_id' as never, dogId)
    .maybeSingle();
  if (skillErr) throw new Error(skillErr.message);
  if (!skill) throw new Error('Skill not found.');
  const row = skill as {
    discipline: string;
    label: string;
    detail: string | null;
    conditions: string[] | null;
  };
  const { data: lib, error } = await supabase
    .from('skill_library' as never)
    .insert({
      discipline: row.discipline,
      label: row.label,
      detail: row.detail,
      default_conditions: row.conditions ?? [],
      sort_order: 0,
      is_active: true,
    } as never)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  const libraryId = (lib as { id: string }).id;
  const { error: linkErr } = await supabase
    .from('dog_skills' as never)
    .update({ library_id: libraryId } as never)
    .eq('id' as never, skillId);
  if (linkErr) throw new Error(linkErr.message);
  return libraryId;
}

export async function reorderDogSkills(dogId: string, ids: string[]): Promise<void> {
  const supabase = requireSupabase();
  const results = await Promise.all(
    ids.map((id, i) =>
      supabase
        .from('dog_skills' as never)
        .update({ sort_order: i } as never)
        .eq('id' as never, id)
        .eq('dog_id' as never, dogId),
    ),
  );
  const first = results.find((r) => r.error);
  if (first?.error) throw new Error(first.error.message);
}

export async function pasteSkillList(
  dogId: string,
  discipline: string,
  text: string,
): Promise<void> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) throw new Error('Paste one skill per line.');
  for (const label of lines) {
    await addCustomSkill({ dogId, discipline, label });
  }
}

export async function copyFromProtectionDog(dogId: string, sourceId: string): Promise<void> {
  const supabase = requireSupabase();
  const { data: source, error: srcErr } = await supabase
    .from('dogs')
    .select('id, temperament, programme_tier')
    .eq('id', sourceId)
    .maybeSingle();
  if (srcErr) throw new Error(srcErr.message);
  if (!source || source.programme_tier !== 'protection_dog') {
    throw new Error('That dog is not a protection listing.');
  }
  const { data: skills, error: skErr } = await supabase
    .from('dog_skills' as never)
    .select('library_id, discipline, label, detail, conditions, level, sort_order, is_public')
    .eq('dog_id' as never, sourceId);
  if (skErr) throw new Error(skErr.message);
  const { error: delErr } = await supabase
    .from('dog_skills' as never)
    .delete()
    .eq('dog_id' as never, dogId);
  if (delErr) throw new Error(delErr.message);
  const rows = ((skills ?? []) as Record<string, unknown>[]).map((s) => ({
    dog_id: dogId,
    library_id: s.library_id ?? null,
    discipline: s.discipline,
    label: s.label,
    detail: s.detail ?? null,
    conditions: s.conditions ?? [],
    level: s.level ?? null,
    sort_order: s.sort_order ?? 0,
    is_public: s.is_public !== false,
  }));
  if (rows.length > 0) {
    const { error: insErr } = await supabase.from('dog_skills' as never).insert(rows as never);
    if (insErr) throw new Error(insErr.message);
  }
  const { error: dogErr } = await supabase
    .from('dogs')
    .update({ temperament: source.temperament } as never)
    .eq('id', dogId);
  if (dogErr) throw new Error(dogErr.message);
}

export async function saveListingFields(
  dogId: string,
  patch: {
    temperament?: TemperamentArea[];
    training_exclusions?: string | null;
    scenario_exclusions?: string | null;
  },
): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('dogs').update(patch as never).eq('id', dogId);
  if (error) throw new Error(error.message);
}
