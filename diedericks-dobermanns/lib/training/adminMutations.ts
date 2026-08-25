import { requireSupabase } from '@/lib/supabase';
import type { AccessTier } from '@/lib/training/access';

export async function updateVideoFields(
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    week_label?: string | null;
    is_active?: boolean;
    video_url?: string | null;
    thumbnail_url?: string | null;
    duration_seconds?: number | null;
    access_tier?: AccessTier;
    bundle_id?: string | null;
    sort_order?: number;
  },
) {
  const { error } = await requireSupabase()
    .from('training_videos')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export interface CreateVideoInput {
  category_id: string;
  title: string;
  description?: string | null;
  access_tier: AccessTier;
  bundle_id?: string | null;
  video_url?: string | null;
  week_label?: string | null;
  sort_order?: number;
}

export async function createVideo(input: CreateVideoInput) {
  const { error } = await requireSupabase().from('training_videos').insert({
    category_id: input.category_id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    access_tier: input.access_tier,
    bundle_id: input.bundle_id ?? null,
    video_url: input.video_url?.trim() || null,
    week_label: input.week_label?.trim() || null,
    sort_order: input.sort_order ?? 0,
    is_active: true,
  });
  if (error) throw new Error(error.message);
}

export async function logTierChange(videoIds: string[], from: string, to: string, categoryId?: string) {
  const args: {
    p_video_ids: string[];
    p_from: string;
    p_to: string;
    p_category_id?: string;
  } = {
    p_video_ids: videoIds,
    p_from: from,
    p_to: to,
  };
  if (categoryId) args.p_category_id = categoryId;
  await requireSupabase().rpc('log_training_tier_change', args);
}
