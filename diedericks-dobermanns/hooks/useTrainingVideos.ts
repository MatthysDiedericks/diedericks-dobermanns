import { useCallback, useEffect, useState } from 'react';

import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { canWatchVideo } from '@/lib/training/access';
import { sortVideos } from '@/lib/training/format';
import { signTrainingPlayback, signTrainingThumbs } from '@/lib/training/signPlayback';

export interface VideoCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  colour: string;
  sort_order: number;
}

export interface VideoBundle {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

export interface TrainingVideo {
  id: string;
  category_id: string;
  bundle_id: string | null;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  access_tier: string;
  sort_order: number;
  week_label: string | null;
  tags: string[] | null;
  is_active: boolean;
  category?: VideoCategory;
  bundle?: VideoBundle | null;
  thumbSrc?: string | null;
}

export interface WatchProgress {
  video_id: string;
  watched_seconds: number;
  completed: boolean;
}

const VIDEO_SELECT =
  'id, category_id, bundle_id, title, description, video_url, thumbnail_url, duration_seconds, access_tier, sort_order, week_label, tags, is_active';

async function withThumbs(rows: TrainingVideo[]): Promise<TrainingVideo[]> {
  const thumbs = await signTrainingThumbs(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, thumbSrc: thumbs[r.id] ?? null }));
}

export function useVideoCategories() {
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void requireSupabase()
      .from('training_video_categories')
      .select('id, name, description, icon, colour, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        setCategories((data ?? []) as VideoCategory[]);
        setLoading(false);
      });
  }, []);
  return { categories, loading };
}

export function useVideoBundles() {
  const [bundles, setBundles] = useState<VideoBundle[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void requireSupabase()
      .from('video_bundles')
      .select('id, name, description, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        setBundles((data ?? []) as VideoBundle[]);
        setLoading(false);
      });
  }, []);
  return { bundles, loading };
}

export function useVideosByCategory(categoryId: string | undefined, includeInactive = false) {
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!categoryId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let q = requireSupabase()
        .from('training_videos')
        .select(
          `${VIDEO_SELECT}, category:training_video_categories(id, name, description, icon, colour, sort_order), bundle:video_bundles(id, name)`,
        )
        .eq('category_id', categoryId)
        .order('sort_order');
      if (!includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      setVideos(await withThumbs(sortVideos((data ?? []) as unknown as TrainingVideo[])));
    } catch (e) {
      console.error('[useVideosByCategory]', e);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId, includeInactive]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { videos, loading, refresh };
}

export function useVideoById(videoId: string | undefined) {
  const [video, setVideo] = useState<TrainingVideo | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!videoId) {
      setLoading(false);
      return;
    }
    void (async () => {
      const { data } = await requireSupabase()
        .from('training_videos')
        .select(
          `${VIDEO_SELECT}, category:training_video_categories(id, name, description, icon, colour, sort_order), bundle:video_bundles(id, name)`,
        )
        .eq('id', videoId)
        .maybeSingle();
      const row = (data as unknown as TrainingVideo | null) ?? null;
      setVideo(row);
      setPlaybackUrl(row ? await signTrainingPlayback(row.id) : null);
      setLoading(false);
    })();
  }, [videoId]);
  return { video, playbackUrl, loading };
}

export function useAllVideosAdmin() {
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await requireSupabase()
        .from('training_videos')
        .select(`${VIDEO_SELECT}, category:training_video_categories(name, colour)`)
        .order('sort_order');
      if (error) throw error;
      setVideos(sortVideos((data ?? []) as unknown as TrainingVideo[]));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { videos, loading, refresh };
}

export function useClientBundles() {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const [purchasedBundleIds, setPurchasedBundleIds] = useState<Set<string>>(new Set());
  const [ownsADog, setOwnsADog] = useState(false);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    if (!userId) return;
    const supabase = requireSupabase();
    setLoading(true);
    const [{ data }, owns] = await Promise.all([
      supabase.from('video_bundle_purchases').select('bundle_id').eq('client_id', userId),
      supabase.rpc('client_owns_a_dog'),
    ]);
    setPurchasedBundleIds(new Set((data ?? []).map((r) => r.bundle_id)));
    setOwnsADog(Boolean(owns.data));
    setLoading(false);
  }, [userId]);
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    void refetch();
  }, [userId, refetch]);
  return { purchasedBundleIds, ownsADog, loading, refetch };
}

export function clientCanWatch(
  video: TrainingVideo,
  purchasedBundleIds: Set<string>,
  ownsADog: boolean,
  isStaff: boolean,
): boolean {
  return canWatchVideo({
    accessTier: video.access_tier,
    bundleId: video.bundle_id,
    purchasedBundleIds,
    ownsADog,
    isStaff,
  });
}

export function useWatchProgress() {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const [progressMap, setProgressMap] = useState<Map<string, WatchProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const { data } = await requireSupabase()
      .from('video_watch_progress')
      .select('video_id, watched_seconds, completed')
      .eq('client_id', userId);
    const map = new Map<string, WatchProgress>();
    for (const row of data ?? []) map.set(row.video_id, row as WatchProgress);
    setProgressMap(map);
    setLoading(false);
  }, [userId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { progressMap, loading, refresh };
}

export async function saveWatchProgress(videoId: string, watchedSeconds: number, completed: boolean) {
  const userId = useAuthStore.getState().session?.user?.id;
  if (!userId) return;
  await requireSupabase().from('video_watch_progress').upsert(
    {
      client_id: userId,
      video_id: videoId,
      watched_seconds: watchedSeconds,
      completed,
      last_watched_at: new Date().toISOString(),
    },
    { onConflict: 'client_id,video_id' },
  );
}

export function useCategoryVideoCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    void requireSupabase()
      .from('training_videos')
      .select('category_id')
      .eq('is_active', true)
      .then(({ data }) => {
        const map: Record<string, number> = {};
        for (const row of data ?? []) map[row.category_id] = (map[row.category_id] ?? 0) + 1;
        setCounts(map);
      });
  }, []);
  return counts;
}

export {
  createVideo,
  logTierChange,
  updateVideoFields,
  type CreateVideoInput,
} from '@/lib/training/adminMutations';

