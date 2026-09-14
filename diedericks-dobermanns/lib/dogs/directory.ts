import { requireSupabase } from '@/lib/supabase';
import type { DogSearchable } from '@/lib/dogs/search';
import type { Dog, DogMedia } from '@/types/app.types';

export type DirectoryDog = Dog &
  DogSearchable & {
    litter_name?: string | null;
    litter_letter?: string | null;
    litter_date?: string | null;
    buyer_name?: string | null;
    document_count?: number | null;
  };

type LitterJoin = {
  id: string;
  name: string | null;
  litter_letter: string | null;
  actual_date: string | null;
} | null;

type ContactJoin = { full_name: string | null } | null;

type MediaRow = {
  url: string;
  thumbnail_url: string | null;
  is_primary: boolean;
  uploaded_at: string | null;
};

function mapMedia(dogId: string, rows: MediaRow[] | null | undefined): DogMedia[] {
  return (rows ?? []).map((m, i) => ({
    id: `${dogId}-${i}`,
    dog_id: dogId,
    type: 'photo' as const,
    url: m.url,
    thumbnail_url: m.thumbnail_url,
    caption: null,
    is_primary: m.is_primary,
    sort_order: i,
    uploaded_at: m.uploaded_at ?? '',
  }));
}

/**
 * Full kennel roster for grouped search and missing-data flags.
 */
export async function fetchDogDirectory(): Promise<DirectoryDog[]> {
  const supabase = requireSupabase();
  const [{ data, error }, { data: docs }] = await Promise.all([
    supabase
      .from('dogs')
      .select(
        '*, dog_media!dog_media_dog_id_fkey(url, thumbnail_url, is_primary, uploaded_at), litter:litter_id(id, name, litter_letter, actual_date), buyer_contact:buyer_contact_id(full_name), owner_contact:owner_contact_id(full_name)',
      )
      .order('name'),
    supabase.from('documents').select('entity_id').eq('entity_type', 'dog'),
  ]);
  if (error) throw new Error(error.message);

  const docCounts = new Map<string, number>();
  for (const row of docs ?? []) {
    const id = row.entity_id as string | null;
    if (!id) continue;
    docCounts.set(id, (docCounts.get(id) ?? 0) + 1);
  }

  return ((data ?? []) as unknown as Array<
    DirectoryDog & {
      litter: LitterJoin;
      buyer_contact: ContactJoin;
      owner_contact: ContactJoin;
      dog_media: MediaRow[] | null;
    }
  >).map((row) => {
    const buyer =
      row.buyer_contact?.full_name?.trim() ||
      row.owner_contact?.full_name?.trim() ||
      row.new_owner_name?.trim() ||
      row.reserved_for_name?.trim() ||
      null;
    return {
      ...row,
      media: mapMedia(row.id, row.dog_media),
      litter_name: row.litter?.name ?? null,
      litter_letter: row.litter?.litter_letter ?? null,
      litter_date: row.litter?.actual_date ?? null,
      buyer_name: buyer,
      document_count: docCounts.get(row.id) ?? 0,
    };
  });
}
