import { requireSupabase } from '@/lib/supabase';

/**
 * Read-only queries for the public (anon-facing) litter page. Every query
 * here uses an explicit column allow-list — NEVER `select('*')` — so buyer
 * names, prices, microchip numbers, and admin notes can never leak into the
 * anon API response, regardless of what RLS permits at the row level.
 */

export interface PublicLitterRow {
  id: string;
  name: string | null;
  status: string;
  actual_date: string | null;
  expected_date: string | null;
  go_home_date: string | null;
  go_home_weeks: number | null;
  puppy_count: number | null;
  available_count: number | null;
  male_count: number | null;
  female_count: number | null;
  description: string | null;
}

export interface PublicPuppyMedia {
  id: string;
  url: string;
  thumbnail_url: string | null;
  is_primary: boolean;
  sort_order: number;
  uploaded_at: string | null;
}

export interface PublicPuppyRow {
  id: string;
  name: string;
  sex: string | null;
  colour: string | null;
  collar_colour: string | null;
  birth_weight_grams: number | null;
  status: string;
  date_of_birth: string | null;
  dog_media: PublicPuppyMedia[];
}

export interface PublicLitterMediaRow {
  id: string;
  litter_id: string | null;
  dog_id: string | null;
  media_type: 'photo' | 'video';
  public_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string | null;
}

export interface PublicWeightLogRow {
  id: string;
  dog_id: string;
  weight_kg: number;
  recorded_date: string;
  recorded_at: string | null;
  session: string | null;
}

const LITTER_SELECT =
  'id, name, status, actual_date, expected_date, go_home_date, go_home_weeks, ' +
  'puppy_count, available_count, male_count, female_count, description';

const PUPPY_SELECT =
  'id, name, sex, colour, collar_colour, birth_weight_grams, status, date_of_birth, ' +
  'dog_media!dog_media_dog_id_fkey(id, url, thumbnail_url, is_primary, sort_order, uploaded_at)';

const MEDIA_SELECT = 'id, litter_id, dog_id, media_type, public_url, caption, sort_order, created_at';

const WEIGHT_SELECT = 'id, dog_id, weight_kg, recorded_date, recorded_at, session';

/** Fetches a public litter's curated fields. Null if not found or not public (RLS-enforced). */
export async function fetchPublicLitter(id: string): Promise<PublicLitterRow | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('litters')
    .select(LITTER_SELECT)
    .eq('id', id)
    .eq('is_public', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as PublicLitterRow) ?? null;
}

/** Fetches a public litter's puppies — safe fields only. */
export async function fetchPublicLitterPuppies(litterId: string): Promise<PublicPuppyRow[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('dogs')
    .select(PUPPY_SELECT)
    .eq('litter_id', litterId)
    .eq('is_public', true)
    .order('name');
  if (error) throw new Error(error.message);
  return (data as unknown as PublicPuppyRow[]) ?? [];
}

/** Fetches the public photo/video gallery for a litter. */
export async function fetchPublicLitterMedia(litterId: string): Promise<PublicLitterMediaRow[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('litter_media')
    .select(MEDIA_SELECT)
    .eq('litter_id', litterId)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data as unknown as PublicLitterMediaRow[]) ?? [];
}

/** Fetches weight history for a set of public puppies. */
export async function fetchPublicPuppyWeights(dogIds: string[]): Promise<PublicWeightLogRow[]> {
  if (dogIds.length === 0) return [];
  const client = requireSupabase();
  const { data, error } = await client
    .from('weight_logs')
    .select(WEIGHT_SELECT)
    .in('dog_id', dogIds)
    .order('recorded_date', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as unknown as PublicWeightLogRow[]) ?? [];
}
