import { requireSupabase } from '@/lib/supabase';
import {
  litterOptionLabel,
  type LitterParentageOption,
} from '@/lib/dogs/litterParentage';

type LitterRow = {
  id: string;
  name: string | null;
  litter_letter: string | null;
  actual_date: string | null;
  expected_date: string | null;
  father_id: string | null;
  mother_id: string | null;
  father: { id: string; name: string } | null;
  mother: { id: string; name: string } | null;
};

export async function fetchLitterParentageOptions(): Promise<LitterParentageOption[]> {
  const { data, error } = await requireSupabase()
    .from('litters')
    .select(
      'id, name, litter_letter, actual_date, expected_date, father_id, mother_id, father:dogs!litters_father_id_fkey(id, name), mother:dogs!litters_mother_id_fkey(id, name)',
    )
    .order('actual_date', { ascending: false });
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as LitterRow[]).map((row) => ({
    id: row.id,
    sireId: row.father_id,
    damId: row.mother_id,
    sireName: row.father?.name ?? null,
    damName: row.mother?.name ?? null,
    label: litterOptionLabel({
      name: row.name,
      litterLetter: row.litter_letter,
      actualDate: row.actual_date,
      expectedDate: row.expected_date,
      sireName: row.father?.name ?? null,
      damName: row.mother?.name ?? null,
    }),
  }));
}

export async function fetchParentDogOptions(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await requireSupabase()
    .from('dogs')
    .select('id, name')
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; name: string }[];
}
