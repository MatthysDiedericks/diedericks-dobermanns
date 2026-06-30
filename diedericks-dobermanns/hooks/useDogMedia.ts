import type { ImagePickerAsset } from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';

import { compressDogPhoto, createDogThumbnail } from '@/lib/media';
import {
  deleteStorageObjects,
  getPublicUrl,
  storagePathFromPublicUrl,
  uploadFile,
} from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import type { DogMedia } from '@/types/app.types';
import type { TablesInsert } from '@/types/database.types';

const MEDIA_SELECT =
  'id, dog_id, url, thumbnail_url, type, is_primary, sort_order, caption, uploaded_at';

function newPhotoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useDogMedia(dogId: string) {
  const [media, setMedia] = useState<DogMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!dogId) return;
    setLoading(true);
    setError(null);
    if (!supabase) {
      setMedia([]);
      setLoading(false);
      return;
    }
    const { data, error: qErr } = await supabase
      .from('dog_media')
      .select(MEDIA_SELECT)
      .eq('dog_id', dogId)
      .eq('type', 'photo')
      .order('sort_order', { ascending: true });
    if (qErr) setError(qErr.message);
    else setMedia((data ?? []) as DogMedia[]);
    setLoading(false);
  }, [dogId]);

  useEffect(() => {
    void load();
  }, [load]);

  const uploadPhotos = useCallback(
    async (assets: ImagePickerAsset[], onProgress?: (pct: number) => void) => {
      if (!supabase || !dogId) throw new Error('Upload unavailable.');
      const maxOrder = media.reduce((m, row) => Math.max(m, row.sort_order), -1);
      let order = maxOrder + 1;

      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        const fileId = newPhotoId();
        const mainPath = `dogs/${dogId}/${fileId}.jpg`;
        const thumbPath = `dogs/${dogId}/thumbs/${fileId}.jpg`;

        const compressed = await compressDogPhoto(asset.uri);
        const thumbUri = await createDogThumbnail(compressed);

        const mainUpload = await uploadFile({
          bucket: 'dog-media',
          path: mainPath,
          uri: compressed,
          contentType: 'image/jpeg',
          sizeBytes: asset.fileSize,
        });
        if (mainUpload.error || !mainUpload.path) {
          throw new Error(mainUpload.error ?? 'Main image upload failed.');
        }

        const thumbUpload = await uploadFile({
          bucket: 'dog-media',
          path: thumbPath,
          uri: thumbUri,
          contentType: 'image/jpeg',
        });
        if (thumbUpload.error) {
          await deleteStorageObjects('dog-media', [mainPath]);
          throw new Error(thumbUpload.error);
        }

        const row: TablesInsert<'dog_media'> = {
          dog_id: dogId,
          type: 'photo',
          url: getPublicUrl('dog-media', mainPath),
          thumbnail_url: getPublicUrl('dog-media', thumbPath),
          is_primary: false,
          sort_order: order,
        };
        order += 1;

        const { error: insertErr } = await supabase.from('dog_media').insert(row);
        if (insertErr) {
          await deleteStorageObjects('dog-media', [mainPath, thumbPath]);
          throw new Error(insertErr.message);
        }

        onProgress?.(Math.round(((i + 1) / assets.length) * 100));
      }

      await load();
    },
    [dogId, load, media],
  );

  const deletePhoto = useCallback(
    async (mediaId: string) => {
      if (!supabase) throw new Error('Delete unavailable.');
      const item = media.find((m) => m.id === mediaId);
      if (!item) return;

      const paths = [item.url, item.thumbnail_url]
        .filter(Boolean)
        .map((url) => storagePathFromPublicUrl(url!))
        .filter((p): p is string => p != null);

      const { error: storageErr } = await deleteStorageObjects('dog-media', paths);
      if (storageErr) throw new Error(storageErr);

      const { error: dbErr } = await supabase.from('dog_media').delete().eq('id', mediaId);
      if (dbErr) throw new Error(dbErr.message);

      await load();
    },
    [load, media],
  );

  const setPrimary = useCallback(
    async (mediaId: string) => {
      if (!supabase) throw new Error('Update unavailable.');
      await supabase.from('dog_media').update({ is_primary: false }).eq('dog_id', dogId);
      const { error: err } = await supabase
        .from('dog_media')
        .update({ is_primary: true })
        .eq('id', mediaId);
      if (err) throw new Error(err.message);
      await load();
    },
    [dogId, load],
  );

  const updateCaption = useCallback(
    async (mediaId: string, caption: string) => {
      if (!supabase) throw new Error('Update unavailable.');
      const { error: err } = await supabase
        .from('dog_media')
        .update({ caption: caption.trim() || null })
        .eq('id', mediaId);
      if (err) throw new Error(err.message);
      await load();
    },
    [load],
  );

  const reorderPhotos = useCallback(
    async (orderedIds: string[]) => {
      if (!supabase) throw new Error('Update unavailable.');
      await Promise.all(
        orderedIds.map((id, index) =>
          supabase!.from('dog_media').update({ sort_order: index }).eq('id', id),
        ),
      );
      await load();
    },
    [load],
  );

  return {
    media,
    loading,
    error,
    refresh: load,
    uploadPhotos,
    deletePhoto,
    setPrimary,
    updateCaption,
    reorderPhotos,
  };
}
