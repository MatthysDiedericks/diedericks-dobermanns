import type { ImagePickerAsset } from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';

import { Config } from '@/constants/config';
import { requireSupabase } from '@/lib/supabase';
import { MAX_TRAINING_VIDEO_BYTES } from '@/lib/uploads/constants';
import { detectUploadKind, isVideoKind, mimeForKind, storedExt } from '@/lib/uploads/magic';
import { libraryThumbPath, libraryVideoPath, TRAINING_VIDEO_BUCKET } from '@/lib/training/paths';

async function readMagic(uri: string): Promise<Uint8Array> {
  const res = await fetch(uri);
  const blob = await res.blob();
  const slice = blob.slice(0, 32);
  return new Uint8Array(await slice.arrayBuffer());
}

function uploadWithProgress(
  url: string,
  headers: Record<string, string>,
  body: FormData,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else reject(new Error(xhr.responseText || `Upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error('Upload failed. Check the kennel connection and try again.'));
    xhr.open('POST', url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.send(body);
  });
}

export async function uploadTrainingFootageFromPhone(input: {
  videoId: string;
  asset: ImagePickerAsset;
  onProgress: (pct: number) => void;
}): Promise<{ videoPath: string; thumbPath: string | null; durationSeconds: number | null }> {
  if (input.asset.fileSize != null && input.asset.fileSize > MAX_TRAINING_VIDEO_BYTES) {
    throw new Error('That video is over 512 MB.');
  }
  const magic = await readMagic(input.asset.uri);
  const kind = detectUploadKind(magic);
  if (!isVideoKind(kind)) {
    throw new Error('That file is not a real video (mp4, mov, m4v, webm).');
  }

  const supabase = requireSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sign in again to upload.');

  const videoPath = libraryVideoPath(input.videoId, storedExt(kind));
  const form = new FormData();
  form.append('cacheControl', '3600');
  form.append('file', {
    uri: input.asset.uri,
    name: `footage.${storedExt(kind)}`,
    type: mimeForKind(kind),
  } as unknown as Blob);

  await uploadWithProgress(
    `${Config.supabase.url}/storage/v1/object/${TRAINING_VIDEO_BUCKET}/${videoPath}`,
    {
      Authorization: `Bearer ${session.access_token}`,
      apikey: Config.supabase.anonKey,
    },
    form,
    input.onProgress,
  );

  let thumbPath: string | null = null;
  try {
    const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(input.asset.uri, { time: 1000 });
    thumbPath = libraryThumbPath(input.videoId);
    const thumbForm = new FormData();
    thumbForm.append('file', {
      uri: thumbUri,
      name: 'thumb.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
    await uploadWithProgress(
      `${Config.supabase.url}/storage/v1/object/${TRAINING_VIDEO_BUCKET}/${thumbPath}`,
      {
        Authorization: `Bearer ${session.access_token}`,
        apikey: Config.supabase.anonKey,
      },
      thumbForm,
      () => undefined,
    );
  } catch {
    thumbPath = null;
  }

  const durationSeconds =
    input.asset.duration != null ? Math.round(input.asset.duration > 1000 ? input.asset.duration / 1000 : input.asset.duration) : null;

  return { videoPath, thumbPath, durationSeconds };
}
