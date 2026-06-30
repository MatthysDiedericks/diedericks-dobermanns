import { useCallback, useEffect, useState } from 'react';

import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

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
  price: number;
  currency: string;
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
  access_tier: 'free' | 'bundle' | 'admin';
  sort_order: number;
  week_label: string | null;
  tags: string[] | null;
  is_active: boolean;
  category?: VideoCategory;
  bundle?: VideoBundle | null;
}

export interface WatchProgress {
  video_id: string;
  watched_seconds: number;
  completed: boolean;
}

const VIDEO_SELECT =
  'id, category_id, bundle_id, title, description, video_url, thumbnail_url, duration_seconds, access_tier, sort_order, week_label, tags, is_active';

export function useVideoCategories() {
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = requireSupabase();
    void supabase
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
    const supabase = requireSupabase();
    void supabase
      .from('video_bundles')
      .select('id, name, description, price, currency, sort_order')
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
      const supabase = requireSupabase();
      let q = supabase
        .from('training_videos')
        .select(`${VIDEO_SELECT}, category:training_video_categories(id, name, description, icon, colour, sort_order), bundle:video_bundles(id, name, description, price, currency, sort_order)`)
        .eq('category_id', categoryId)
        .order('sort_order');
      if (!includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      setVideos((data ?? []) as unknown as TrainingVideo[]);
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!videoId) {
      setLoading(false);
      return;
    }
    const supabase = requireSupabase();
    void supabase
      .from('training_videos')
      .select(`${VIDEO_SELECT}, category:training_video_categories(id, name, description, icon, colour, sort_order), bundle:video_bundles(id, name, description, price, currency, sort_order)`)
      .eq('id', videoId)
      .maybeSingle()
      .then(({ data }) => {
        setVideo((data as unknown as TrainingVideo | null) ?? null);
        setLoading(false);
      });
  }, [videoId]);

  return { video, loading };
}

export function useAllVideosAdmin() {
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from('training_videos')
        .select(`${VIDEO_SELECT}, category:training_video_categories(name, colour)`)
        .order('sort_order');
      if (error) throw error;
      setVideos((data ?? []) as unknown as TrainingVideo[]);
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
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) return;
    const supabase = requireSupabase();
    setLoading(true);
    const { data } = await supabase
      .from('video_bundle_purchases')
      .select('bundle_id')
      .eq('client_id', userId);
    setPurchasedBundleIds(new Set((data ?? []).map((r) => r.bundle_id)));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    void refetch();
  }, [userId, refetch]);

  return { purchasedBundleIds, loading, refetch };
}

export function canWatchVideo(
  video: TrainingVideo,
  purchasedBundleIds: Set<string>,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  if (video.access_tier === 'free') return true;
  if (video.access_tier === 'bundle' && video.bundle_id) {
    return purchasedBundleIds.has(video.bundle_id);
  }
  return false;
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
    const supabase = requireSupabase();
    const { data } = await supabase
      .from('video_watch_progress')
      .select('video_id, watched_seconds, completed')
      .eq('client_id', userId);
    const map = new Map<string, WatchProgress>();
    for (const row of data ?? []) {
      map.set(row.video_id, row as WatchProgress);
    }
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
  const supabase = requireSupabase();
  await supabase.from('video_watch_progress').upsert(
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

export async function updateVideoFields(
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    week_label?: string | null;
    is_active?: boolean;
    video_url?: string | null;
    sort_order?: number;
  },
) {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('training_videos')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export interface CreateVideoInput {
  category_id: string;
  title: string;
  description?: string | null;
  access_tier: 'free' | 'bundle' | 'admin';
  bundle_id?: string | null;
  video_url?: string | null;
  week_label?: string | null;
  sort_order?: number;
}

export async function createVideo(input: CreateVideoInput) {
  const supabase = requireSupabase();
  const { error } = await supabase.from('training_videos').insert({
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

export function useCategoryVideoCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const supabase = requireSupabase();
    void supabase
      .from('training_videos')
      .select('category_id')
      .eq('is_active', true)
      .then(({ data }) => {
        const map: Record<string, number> = {};
        for (const row of data ?? []) {
          map[row.category_id] = (map[row.category_id] ?? 0) + 1;
        }
        setCounts(map);
      });
  }, []);

  return counts;
}
