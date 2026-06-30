import type { ImagePickerAsset } from 'expo-image-picker';

import { compressDogPhoto, createDogThumbnail } from '@/lib/media';
import {
  deleteStorageObjects,
  getPublicUrl,
  uploadFile,
} from '@/lib/storage';
import { requireSupabase } from '@/lib/supabase';
import type { TablesInsert } from '@/types/database.types';

function newPhotoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Upload a session photo tagged with caption `session-{bookingId}`. */
export async function uploadSessionPhoto(
  dogId: string,
  bookingId: string,
  asset: ImagePickerAsset,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const supabase = requireSupabase();
  const fileId = newPhotoId();
  const mainPath = `dogs/${dogId}/sessions/${bookingId}/${fileId}.jpg`;
  const thumbPath = `dogs/${dogId}/sessions/${bookingId}/thumbs/${fileId}.jpg`;

  onProgress?.(10);
  const compressed = await compressDogPhoto(asset.uri);
  onProgress?.(40);
  const thumbUri = await createDogThumbnail(compressed);

  const mainUpload = await uploadFile({
    bucket: 'dog-media',
    path: mainPath,
    uri: compressed,
    contentType: 'image/jpeg',
    sizeBytes: asset.fileSize,
  });
  if (mainUpload.error || !mainUpload.path) {
    throw new Error(mainUpload.error ?? 'Upload failed');
  }

  onProgress?.(70);
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
    sort_order: 0,
    caption: `session-${bookingId}`,
  };

  onProgress?.(90);
  const { error: insertErr } = await supabase.from('dog_media').insert(row);
  if (insertErr) {
    await deleteStorageObjects('dog-media', [mainPath, thumbPath]);
    throw new Error(insertErr.message);
  }
  onProgress?.(100);
}
