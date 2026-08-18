import { requireSupabase, supabase } from '@/lib/supabase';
import { MAX_UPLOAD_BYTES, STAFF_MEDIA_MAX_BYTES } from '@/lib/uploads/constants';
import { storagePathFor } from '@/lib/uploads/path';
import { prepareUpload, UploadValidationError } from '@/lib/uploads/prepare';

/**
 * Supabase Storage helpers. Buckets are defined in migration 0004.
 */
export type StorageBucket =
  | 'dog-media'
  | 'gallery'
  | 'documents'
  | 'avatars'
  | 'testimonials'
  | 'receipts'
  | 'litter-media';

export interface UploadOptions {
  bucket: StorageBucket;
  path: string;
  /** A fetch-able local URI (e.g. from expo-image-picker). */
  uri: string;
  contentType: string;
  sizeBytes?: number;
  /** Overrides the default 10MB cap when provided (e.g. for video uploads). */
  maxBytes?: number;
}

export interface UploadResult {
  path: string | null;
  error: string | null;
}

function folderOf(path: string): string {
  const idx = path.replace(/\\/g, '/').lastIndexOf('/');
  return idx === -1 ? path : path.slice(0, idx);
}

/** Generates a collision-resistant object key inside a bucket folder. */
export function buildObjectPath(folder: string, extension: string): string {
  return storagePathFor(folder, extension);
}

/** Validates size/type then uploads a local file to a Storage bucket. */
export async function uploadFile(opts: UploadOptions): Promise<UploadResult> {
  const isVideo = opts.contentType.startsWith('video/');
  const maxBytes = opts.maxBytes ?? (isVideo ? STAFF_MEDIA_MAX_BYTES : MAX_UPLOAD_BYTES);

  if (opts.sizeBytes != null && opts.sizeBytes > maxBytes) {
    return {
      path: null,
      error: `That file is over ${Math.round(maxBytes / (1024 * 1024))} MB — please send a smaller copy, or WhatsApp us.`,
    };
  }

  try {
    const supabase = requireSupabase();
    if (opts.bucket === 'documents') {
      const { RateLimitError, assertRateLimit, blockedMessage } = await import(
        '@/lib/security/rateLimit'
      );
      try {
        await assertRateLimit('document_upload', 20, 3600);
      } catch (e) {
        return {
          path: null,
          error: e instanceof RateLimitError ? e.message : await blockedMessage(),
        };
      }
    }
    const response = await fetch(opts.uri);
    const raw = new Uint8Array(await response.arrayBuffer());
    if (raw.byteLength > maxBytes) {
      return {
        path: null,
        error: `That file is over ${Math.round(maxBytes / (1024 * 1024))} MB — please send a smaller copy, or WhatsApp us.`,
      };
    }

    const scope = folderOf(opts.path);
    let path = opts.path;
    let bytes: Uint8Array = raw;
    let contentType = opts.contentType;

    if (isVideo) {
      path = storagePathFor(scope, 'mp4');
      contentType = 'video/mp4';
    } else {
      const prepared = prepareUpload(raw, scope, maxBytes);
      path = prepared.path;
      bytes = prepared.bytes;
      contentType = prepared.mime;
    }

    const { error } = await supabase.storage
      .from(opts.bucket)
      .upload(path, bytes, { contentType, upsert: false });
    if (error) return { path: null, error: error.message };
    return { path, error: null };
  } catch (e) {
    if (e instanceof UploadValidationError) return { path: null, error: e.message };
    return { path: null, error: e instanceof Error ? e.message : 'Upload failed.' };
  }
}

/**
 * Resolves a set of locally-picked image URIs into hosted URLs. When Supabase
 * is connected each new local file is uploaded to the dog-media bucket and its
 * public URL returned; already-remote URLs pass straight through. In demo mode
 * the local URIs are returned as-is so previews still render for the session.
 */
export async function resolvePhotoUrls(
  uris: string[],
  folder = 'timeline',
): Promise<string[]> {
  if (!supabase) return uris;
  const out: string[] = [];
  for (const uri of uris) {
    const isRemote = /^https?:\/\//.test(uri) && !uri.startsWith('blob:');
    if (isRemote) {
      out.push(uri);
      continue;
    }
    const path = buildObjectPath(folder, 'jpg');
    const { error, path: stored } = await uploadFile({
      bucket: 'dog-media',
      path,
      uri,
      contentType: 'image/jpeg',
    });
    if (!error && stored) out.push(getPublicUrl('dog-media', stored));
  }
  return out;
}

/** Returns a public URL for objects in public buckets. */
export function getPublicUrl(bucket: StorageBucket, path: string): string {
  const supabase = requireSupabase();
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Extracts the storage object path from a public dog-media URL. */
export function storagePathFromPublicUrl(url: string, bucket: StorageBucket = 'dog-media'): string | null {
  const marker = `/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

/** Deletes one or more objects from a Storage bucket. */
export async function deleteStorageObjects(
  bucket: StorageBucket,
  paths: string[],
): Promise<{ error: string | null }> {
  if (!paths.length) return { error: null };
  try {
    const supabase = requireSupabase();
    const { error } = await supabase.storage.from(bucket).remove(paths);
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Delete failed.' };
  }
}

/** Returns a time-limited signed URL for objects in private buckets. */
export async function getSignedUrl(
  bucket: StorageBucket,
  path: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}
