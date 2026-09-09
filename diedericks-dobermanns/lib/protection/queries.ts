import { requireSupabase } from '@/lib/supabase';
import { isScenario } from '@/lib/protection/constants';
import type {
  DogSkillRow,
  ProtectionDogOption,
  SkillLevel,
  SkillLibraryRow,
  TemperamentArea,
} from '@/lib/protection/types';

const LIBRARY_SELECT =
  'id, discipline, label, detail, default_conditions, sort_order, is_active';
const SKILL_SELECT =
  'id, dog_id, library_id, discipline, label, detail, conditions, level, sort_order, is_public';

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v)).filter(Boolean);
}

function mapLibrary(r: Record<string, unknown>): SkillLibraryRow {
  return {
    id: String(r.id),
    discipline: String(r.discipline),
    label: String(r.label ?? ''),
    detail: (r.detail as string | null) ?? null,
    default_conditions: asStringArray(r.default_conditions),
    sort_order: Number(r.sort_order ?? 0),
    is_active: r.is_active !== false,
  };
}

function mapSkill(r: Record<string, unknown>): DogSkillRow {
  const level = r.level;
  const parsed: SkillLevel | null =
    level === 'building' || level === 'solid' || level === 'proofed' ? level : null;
  return {
    id: String(r.id),
    dog_id: String(r.dog_id),
    library_id: r.library_id ? String(r.library_id) : null,
    discipline: String(r.discipline),
    label: String(r.label ?? ''),
    detail: (r.detail as string | null) ?? null,
    conditions: asStringArray(r.conditions),
    level: parsed,
    sort_order: Number(r.sort_order ?? 0),
    is_public: r.is_public !== false,
  };
}

export async function fetchSkillLibrary(opts?: {
  includeInactive?: boolean;
}): Promise<SkillLibraryRow[]> {
  const supabase = requireSupabase();
  let q = supabase
    .from('skill_library' as never)
    .select(LIBRARY_SELECT)
    .order('discipline' as never)
    .order('sort_order' as never);
  if (!opts?.includeInactive) q = q.eq('is_active' as never, true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapLibrary);
}

export async function fetchDogSkills(dogId: string): Promise<DogSkillRow[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('dog_skills' as never)
    .select(SKILL_SELECT)
    .eq('dog_id' as never, dogId)
    .order('sort_order' as never);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapSkill);
}

export async function fetchOtherProtectionDogs(
  exceptId: string,
): Promise<ProtectionDogOption[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('dogs')
    .select('id, name')
    .eq('programme_tier', 'protection_dog')
    .neq('id', exceptId)
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []).map((d) => ({ id: d.id, name: d.name }));
}

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

