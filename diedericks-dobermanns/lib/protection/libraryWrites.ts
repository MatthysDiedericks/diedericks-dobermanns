import { requireSupabase } from '@/lib/supabase';

export async function addLibrarySkill(input: {
  discipline: string;
  label: string;
  detail?: string | null;
}): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('skill_library' as never).insert({
    discipline: input.discipline.trim(),
    label: input.label.trim(),
    detail: input.detail?.trim() || null,
    default_conditions: [],
    sort_order: 0,
    is_active: true,
  } as never);
  if (error) throw new Error(error.message);
}

export async function addDiscipline(name: string): Promise<void> {
  const discipline = name.trim().toLowerCase().replace(/\s+/g, '_');
  if (!discipline) throw new Error('Name the discipline.');
  await addLibrarySkill({ discipline, label: '' });
}

export async function retireLibrarySkill(id: string, active: boolean): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('skill_library' as never)
    .update({ is_active: active } as never)
    .eq('id' as never, id);
  if (error) throw new Error(error.message);
}

export async function renameLibrarySkill(id: string, label: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('skill_library' as never)
    .update({ label } as never)
    .eq('id' as never, id);
  if (error) throw new Error(error.message);
}
