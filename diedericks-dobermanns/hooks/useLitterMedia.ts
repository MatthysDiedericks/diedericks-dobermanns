import { useCallback, useEffect, useMemo, useState } from 'react';

import { buildObjectPath, getSignedUrl, uploadFile } from '@/lib/storage';
import { requireSupabase, supabase } from '@/lib/supabase';
import * as ImageManipulator from 'expo-image-manipulator';

export interface LitterMediaRow {
  id: string;
  litter_id: string | null;
  dog_id: string | null;
  media_type: string;
  storage_path: string;
  public_url: string;
  caption: string | null;
  sort_order: number | null;
  created_at: string;
}

export function useLitterMedia(litterId: string) {
  const [items, setItems] = useState<LitterMediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!litterId || !supabase) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: err } = await requireSupabase()
        .from('litter_media')
        .select('*')
        .eq('litter_id', litterId)
        .order('sort_order');
      if (err) throw new Error(err.message);
      const rows = (data ?? []) as LitterMediaRow[];
      const withUrls = await Promise.all(
        rows.map(async (r) => ({
          ...r,
          public_url: (await getSignedUrl('litter-media', r.storage_path)) ?? r.public_url,
        })),
      );
      setItems(withUrls);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [litterId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const litterPhotos = useMemo(() => items.filter((i) => !i.dog_id), [items]);
  const puppyPhotos = useMemo(() => {
    const map = new Map<string, LitterMediaRow[]>();
    for (const i of items) {
      if (!i.dog_id) continue;
      const arr = map.get(i.dog_id) ?? [];
      arr.push(i);
      map.set(i.dog_id, arr);
    }
    return map;
  }, [items]);

  const uploadPhoto = useCallback(
    async (dogId: string | null, uri: string) => {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );
      const folder = dogId
        ? `litters/${litterId}/puppies/${dogId}`
        : `litters/${litterId}/litter`;
      const path = buildObjectPath(folder, 'jpg');
      const { error: upErr } = await uploadFile({
        bucket: 'litter-media',
        path,
        uri: manipulated.uri,
        contentType: 'image/jpeg',
      });
      if (upErr) throw new Error(upErr);
      const signed = (await getSignedUrl('litter-media', path)) ?? '';
      const { error: err } = await requireSupabase().from('litter_media').insert({
        litter_id: litterId,
        dog_id: dogId,
        media_type: 'photo',
        storage_path: path,
        public_url: signed,
      });
      if (err) throw new Error(err.message);
      await refresh();
    },
    [litterId, refresh],
  );

  const deleteMedia = useCallback(
    async (id: string, storagePath: string) => {
      await requireSupabase().storage.from('litter-media').remove([storagePath]);
      const { error: err } = await requireSupabase().from('litter_media').delete().eq('id', id);
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh],
  );

  return { items, litterPhotos, puppyPhotos, loading, error, refresh, uploadPhoto, deleteMedia };
}
