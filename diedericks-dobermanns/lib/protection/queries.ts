import { requireSupabase } from '@/lib/supabase';
import type {
  DogSkillRow,
  ProtectionDogOption,
  SkillLevel,
  SkillLibraryRow,
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

export async function fetchPublicDogSkills(dogId: string): Promise<DogSkillRow[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('dog_skills' as never)
    .select(SKILL_SELECT)
    .eq('dog_id' as never, dogId)
    .eq('is_public' as never, true)
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
