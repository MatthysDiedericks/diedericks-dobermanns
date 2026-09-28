import type { GalleryItem } from '@/types/app.types';

export const ANNOUNCEMENT_CATEGORY = 'litter_announcements' as const;
export const PLANNED_LITTERS_CATEGORY = 'planned_litters' as const;

export const LITTER_LINKED_CATEGORIES = [
  ANNOUNCEMENT_CATEGORY,
  PLANNED_LITTERS_CATEGORY,
] as const;

export type LitterLinkedCategory = (typeof LITTER_LINKED_CATEGORIES)[number];

export function isLitterLinkedCategory(
  category: string | null | undefined,
): category is LitterLinkedCategory {
  return category === ANNOUNCEMENT_CATEGORY || category === PLANNED_LITTERS_CATEGORY;
}

export function litterIdSatisfiesCategory(
  category: string | null | undefined,
  litterId: string | null | undefined,
): boolean {
  if (!isLitterLinkedCategory(category)) return true;
  return Boolean(litterId);
}

export function publicGalleryIncludes(row: {
  litter_id: string | null;
  litterIsPublic: boolean | null;
}): boolean {
  return row.litter_id == null || row.litterIsPublic === true;
}

export function galleryGridIncludes(category: string | null | undefined): boolean {
  return category !== ANNOUNCEMENT_CATEGORY;
}

export function isAnnouncementUniqueViolation(error: {
  code?: string | null;
  message?: string | null;
}): boolean {
  if (error.code === '23505') return true;
  const m = (error.message ?? '').toLowerCase();
  return m.includes('gallery_items_one_announcement_per_litter');
}

export function isLitterRequiredViolation(error: {
  code?: string | null;
  message?: string | null;
}): boolean {
  if (error.code === '23514') {
    const m = (error.message ?? '').toLowerCase();
    return m.includes('gallery_items_litter_required') || m.includes('litter');
  }
  return (error.message ?? '').toLowerCase().includes('gallery_items_litter_required');
}

export function announcementWriteError(error: {
  code?: string | null;
  message?: string | null;
  error?: string | null;
}): string {
  const message = error.message ?? error.error ?? null;
  const shaped = { code: error.code, message };
  if (isAnnouncementUniqueViolation(shaped)) {
    return 'This litter already has an announcement poster. Choose Replace to overwrite it.';
  }
  if (isLitterRequiredViolation(shaped)) {
    return 'Pick the litter this poster belongs to.';
  }
  return message ?? 'Could not save the gallery item.';
}

export async function fetchLitterAnnouncement(litterId: string): Promise<GalleryItem | null> {
  const map = await fetchLitterAnnouncements([litterId]);
  return map.get(litterId) ?? null;
}

export async function fetchLitterAnnouncements(
  litterIds: string[],
): Promise<Map<string, GalleryItem>> {
  const out = new Map<string, GalleryItem>();
  const ids = [...new Set(litterIds.filter(Boolean))];
  if (ids.length === 0) return out;

  const { requireSupabase } = await import('@/lib/supabase');
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('gallery_items')
    .select(
      'id, title, description, image_url, video_url, category, discipline, is_featured, sort_order, photo_taken_at, created_at, litter_id',
    )
    .eq('category', ANNOUNCEMENT_CATEGORY)
    .in('litter_id', ids);

  if (error) {
    console.error('[fetchLitterAnnouncements]', error.message);
    return out;
  }

  for (const row of data ?? []) {
    if (row.litter_id) out.set(row.litter_id, row as unknown as GalleryItem);
  }
  return out;
}
