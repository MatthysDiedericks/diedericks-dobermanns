import { requireSupabase, supabase } from '@/lib/supabase';

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

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB per spec

export interface UploadOptions {
  bucket: StorageBucket;
  path: string;
  /** A fetch-able local URI (e.g. from expo-image-picker). */
  uri: string;
  contentType: string;
  sizeBytes?: number;
}

export interface UploadResult {
  path: string | null;
  error: string | null;
}

/** Generates a collision-resistant object key inside a bucket folder. */
export function buildObjectPath(folder: string, extension: string): string {
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  const ext = extension.replace(/^\./, '');
  return `${folder}/${stamp}-${rand}.${ext}`;
}

/** Validates size/type then uploads a local file to a Storage bucket. */
export async function uploadFile(opts: UploadOptions): Promise<UploadResult> {
  if (opts.sizeBytes != null && opts.sizeBytes > MAX_FILE_BYTES) {
    return { path: null, error: 'File exceeds the 5MB limit.' };
  }

  try {
    const supabase = requireSupabase();
    const response = await fetch(opts.uri);
    const blob = await response.arrayBuffer();
    const { error } = await supabase.storage
      .from(opts.bucket)
      .upload(opts.path, blob, { contentType: opts.contentType, upsert: false });
    if (error) return { path: null, error: error.message };
    return { path: opts.path, error: null };
  } catch (e) {
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
    const { error } = await uploadFile({
      bucket: 'dog-media',
      path,
      uri,
      contentType: 'image/jpeg',
    });
    if (!error) out.push(getPublicUrl('dog-media', path));
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
