import { requireSupabase } from '@/lib/supabase';

export type PendingClientDocument = {
  id: string;
  document_name: string;
  category: string;
  uploaded_at: string | null;
  uploaded_by: string | null;
  entity_id: string;
  review_note: string | null;
  storage_path: string;
  file_type: string | null;
  mime_type: string | null;
  clientName: string | null;
  dogName: string | null;
};

const SELECT =
  'id, document_name, category, uploaded_at, uploaded_by, entity_id, review_note, storage_path, file_type, mime_type';

type RawRow = Omit<PendingClientDocument, 'clientName' | 'dogName'>;

export async function fetchPendingClientDocuments(): Promise<PendingClientDocument[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('documents')
    .select(SELECT)
    .eq('provided_by', 'client')
    .eq('review_status', 'pending')
    .order('uploaded_at', { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as RawRow[];
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.uploaded_by).filter(Boolean))] as string[];
  const dogIds = [...new Set(rows.map((r) => r.entity_id))];
  const [{ data: users }, { data: dogs }] = await Promise.all([
    userIds.length
      ? supabase.from('users').select('id, full_name').in('id', userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    dogIds.length
      ? supabase.from('dogs').select('id, name').in('id', dogIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const nameByUser = new Map((users ?? []).map((u) => [u.id, u.full_name]));
  const nameByDog = new Map((dogs ?? []).map((d) => [d.id, d.name]));
  return rows.map((r) => ({
    ...r,
    clientName: r.uploaded_by ? (nameByUser.get(r.uploaded_by) ?? null) : null,
    dogName: nameByDog.get(r.entity_id) ?? null,
  }));
}

export async function countPendingClientDocuments(): Promise<number> {
  const supabase = requireSupabase();
  const { count, error } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('provided_by', 'client')
    .eq('review_status', 'pending');
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function reviewClientDocument(
  id: string,
  decision: 'verified' | 'rejected',
  note?: string,
): Promise<{ error?: string }> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('documents')
    .update({
      review_status: decision,
      review_note: decision === 'rejected' ? note?.trim() || 'A clearer copy is needed.' : null,
    })
    .eq('id', id)
    .eq('provided_by', 'client');
  if (error) return { error: error.message };
  return {};
}
