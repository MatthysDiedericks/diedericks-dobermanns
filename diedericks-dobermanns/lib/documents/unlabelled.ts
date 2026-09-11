import { fetchDocumentCategories } from '@/lib/documents/categories';
import {
  isMeaninglessDocumentName,
  MEANINGLESS_DOCUMENT_NAME_MESSAGE,
} from '@/lib/documents/documentName';
import { requireSupabase } from '@/lib/supabase';

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

async function attachDogNames(rows: RawRow[]): Promise<UnlabelledDocument[]> {
  const supabase = requireSupabase();
  const dogIds = [...new Set(rows.map((r) => r.entity_id))];
  const { data: dogs } = dogIds.length
    ? await supabase.from('dogs').select('id, name').in('id', dogIds)
    : { data: [] as { id: string; name: string }[] };
  const nameByDog = new Map((dogs ?? []).map((d) => [d.id, d.name]));
  return rows.map((r) => ({
    ...r,
    dogName: nameByDog.get(r.entity_id) ?? null,
  }));
}

/** Dog files whose display name carries no information. */
export async function fetchUnlabelledDocuments(): Promise<UnlabelledDocument[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('documents')
    .select(SELECT)
    .eq('entity_type', 'dog')
    .order('uploaded_at', { ascending: false });
  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as RawRow[]).filter((r) => isMeaninglessDocumentName(r.document_name));
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
  if (isMeaninglessDocumentName(documentName)) return { error: MEANINGLESS_DOCUMENT_NAME_MESSAGE };
  const name = documentName.trim();
  const rows = await fetchDocumentCategories();
  const allowed = rows.some((c) => c.is_active && c.key === category);
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
