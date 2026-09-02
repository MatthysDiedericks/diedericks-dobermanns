import { requireSupabase } from '@/lib/supabase';

/** Same list the website unlabelled screen assigns. Do not invent values. */
export const LABELLABLE_CATEGORIES: { value: string; label: string }[] = [
  { value: 'pedigree', label: 'Pedigree' },
  { value: 'registration', label: 'Registration' },
  { value: 'dna_test', label: 'DNA test' },
  { value: 'hip_elbow_score', label: 'Hip & elbow score' },
  { value: 'vaccination_record', label: 'Vaccination record' },
  { value: 'health_certificate', label: 'Health certificate' },
  { value: 'microchip', label: 'Microchip' },
  { value: 'eye_test', label: 'Eye test' },
  { value: 'heart_test', label: 'Heart test' },
  { value: 'export_permit', label: 'Export papers' },
  { value: 'import_permit', label: 'Import permit' },
  { value: 'other', label: 'Other (keep unlabelled)' },
];

const MEANINGLESS_NAMES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const;

export type UnlabelledDocument = {
  id: string;
  document_name: string;
  original_filename: string | null;
  category: string;
  entity_type: string;
  entity_id: string;
  storage_path: string;
  file_type: string | null;
  mime_type: string | null;
  dogName: string | null;
};

const SELECT =
  'id, document_name, original_filename, category, entity_type, entity_id, storage_path, file_type, mime_type';

type RawRow = Omit<UnlabelledDocument, 'dogName'>;

export function isMeaninglessName(name: string | null | undefined): boolean {
  const stem = (name ?? '').trim().replace(/\.[a-z0-9]+$/i, '');
  if (!stem) return true;
  return /^\d{1,2}$/.test(stem) || /^[a-z]$/i.test(stem);
}

function isOtherCategory(category: string): boolean {
  return category === 'other' || category === 'Other';
}

async function attachDogNames(rows: RawRow[]): Promise<UnlabelledDocument[]> {
  const supabase = requireSupabase();
  const dogIds = [...new Set(rows.filter((r) => r.entity_type === 'dog').map((r) => r.entity_id))];
  const { data: dogs } = dogIds.length
    ? await supabase.from('dogs').select('id, name').in('id', dogIds)
    : { data: [] as { id: string; name: string }[] };
  const nameByDog = new Map((dogs ?? []).map((d) => [d.id, d.name]));
  return rows.map((r) => ({
    ...r,
    dogName: r.entity_type === 'dog' ? (nameByDog.get(r.entity_id) ?? null) : null,
  }));
}

/** Category `other` (website) plus names that are just a number — the 1–4 pile. */
export async function fetchUnlabelledDocuments(): Promise<UnlabelledDocument[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('documents')
    .select(SELECT)
    .or(`category.in.(other,Other),document_name.in.(${MEANINGLESS_NAMES.join(',')})`)
    .order('uploaded_at', { ascending: false });
  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as RawRow[]).filter(
    (r) => isOtherCategory(r.category) || isMeaninglessName(r.document_name),
  );
  return attachDogNames(rows);
}

export async function countUnlabelledDocuments(): Promise<number> {
  const rows = await fetchUnlabelledDocuments();
  return rows.length;
}

export async function labelDocument(
  id: string,
  documentName: string,
  category: string,
): Promise<{ error?: string }> {
  const name = documentName.trim();
  if (!name) return { error: 'Give it a real name.' };
  const allowed = LABELLABLE_CATEGORIES.some((c) => c.value === category);
  if (!allowed) return { error: 'Pick a category from the existing list.' };
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('documents')
    .update({ document_name: name, category })
    .eq('id', id);
  if (error) return { error: error.message };
  return {};
}

export async function signedDocumentPreviewUrl(storagePath: string): Promise<string> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(storagePath, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export function isImageDocument(row: Pick<UnlabelledDocument, 'file_type' | 'mime_type'>): boolean {
  if (row.file_type === 'jpg' || row.file_type === 'png') return true;
  return (row.mime_type ?? '').startsWith('image/');
}
