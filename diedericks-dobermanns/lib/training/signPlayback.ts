import { requireSupabase } from '@/lib/supabase';
import { TRAINING_VIDEO_BUCKET } from '@/lib/training/paths';

export async function signTrainingPlayback(videoId: string): Promise<string | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke('sign-training-video', {
    body: { videoId, purpose: 'play' },
  });
  if (error || !data || typeof data !== 'object' || !('url' in data)) return null;
  const url = (data as { url?: string }).url;
  return url ?? null;
}

export async function signTrainingThumbs(videoIds: string[]): Promise<Record<string, string>> {
  if (videoIds.length === 0) return {};
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke('sign-training-video', {
    body: { purpose: 'thumb', videoIds },
  });
  if (error || !data || typeof data !== 'object' || !('thumbs' in data)) return {};
  return ((data as { thumbs?: Record<string, string> }).thumbs ?? {}) as Record<string, string>;
}

export { TRAINING_VIDEO_BUCKET };
