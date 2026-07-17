import type { ImagePickerAsset } from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useCallback, useEffect, useState } from 'react';

import { compressDogPhoto } from '@/lib/media';
import {
  deleteStorageObjects,
  getPublicUrl,
  storagePathFromPublicUrl,
  uploadFile,
} from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import type { DogMedia } from '@/types/app.types';
import type { TablesInsert } from '@/types/database.types';

const VIDEO_MEDIA_SELECT =
  'id, dog_id, url, thumbnail_url, type, is_primary, sort_order, caption, uploaded_at';

const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

function newFileId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function videoExtension(asset: ImagePickerAsset): string {
  const mime = asset.mimeType?.toLowerCase() ?? '';
  if (mime.includes('quicktime')) return 'mov';
  if (mime.includes('webm')) return 'webm';
  return 'mp4';
}

export type VideoUploadStatus = 'idle' | 'uploading' | 'done';

export function useDogVideos(dogId: string) {
  const [videos, setVideos] = useState<DogMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!dogId) return;
    setLoading(true);
    setError(null);
    if (!supabase) {
      setVideos([]);
      setLoading(false);
      return;
    }
    const { data, error: qErr } = await supabase
      .from('dog_media')
      .select(VIDEO_MEDIA_SELECT)
      .eq('dog_id', dogId)
      .eq('type', 'video')
      .order('uploaded_at', { ascending: false });
    if (qErr) setError(qErr.message);
    else setVideos((data ?? []) as DogMedia[]);
    setLoading(false);
  }, [dogId]);

  useEffect(() => {
    void load();
  }, [load]);

  const uploadVideo = useCallback(
    async (asset: ImagePickerAsset, onStatusChange?: (status: VideoUploadStatus) => void) => {
      if (!supabase || !dogId) throw new Error('Upload unavailable.');
      if (asset.fileSize != null && asset.fileSize > MAX_VIDEO_BYTES) {
        throw new Error('Video exceeds the 200MB limit.');
      }

      onStatusChange?.('uploading');
      const fileId = newFileId();
      const ext = videoExtension(asset);
      const videoPath = `dogs/${dogId}/videos/${fileId}.${ext}`;
      const thumbPath = `dogs/${dogId}/videos/thumbs/${fileId}.jpg`;

      const videoUpload = await uploadFile({
        bucket: 'dog-media',
        path: videoPath,
        uri: asset.uri,
        contentType: asset.mimeType ?? `video/${ext === 'mov' ? 'quicktime' : ext}`,
        sizeBytes: asset.fileSize,
        maxBytes: MAX_VIDEO_BYTES,
      });
      if (videoUpload.error || !videoUpload.path) {
        onStatusChange?.('idle');
        throw new Error(videoUpload.error ?? 'Video upload failed.');
      }

      const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(asset.uri, { time: 0 });
      const compressedThumb = await compressDogPhoto(thumbUri);

      const thumbUpload = await uploadFile({
        bucket: 'dog-media',
        path: thumbPath,
        uri: compressedThumb,
        contentType: 'image/jpeg',
      });
      if (thumbUpload.error) {
        await deleteStorageObjects('dog-media', [videoPath]);
        onStatusChange?.('idle');
        throw new Error(thumbUpload.error);
      }

      const row: TablesInsert<'dog_media'> = {
        dog_id: dogId,
        type: 'video',
        url: getPublicUrl('dog-media', videoPath),
        thumbnail_url: getPublicUrl('dog-media', thumbPath),
        is_primary: false,
        sort_order: 0,
        caption: null,
      };

      const { error: insertErr } = await supabase.from('dog_media').insert(row);
      if (insertErr) {
        await deleteStorageObjects('dog-media', [videoPath, thumbPath]);
        onStatusChange?.('idle');
        throw new Error(insertErr.message);
      }

      onStatusChange?.('done');
      await load();
    },
    [dogId, load],
  );

  const deleteVideo = useCallback(
    async (mediaId: string) => {
      if (!supabase) throw new Error('Delete unavailable.');
      const item = videos.find((v) => v.id === mediaId);
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
    [load, videos],
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

  return {
    videos,
    loading,
    error,
    refresh: load,
    uploadVideo,
    deleteVideo,
    updateCaption,
  };
}
