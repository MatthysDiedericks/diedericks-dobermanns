import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import {
  buildObjectPath,
  getPublicUrl,
  uploadFile,
  type StorageBucket,
} from '@/lib/storage';
import { supabase } from '@/lib/supabase';

export type MediaKind = 'image' | 'video' | 'document';

export interface PickedMedia {
  uri: string;
  kind: MediaKind;
  name?: string;
  mimeType?: string;
  sizeBytes?: number;
}

const MAX_IMAGE_WIDTH = 1200;
const IMAGE_QUALITY = 0.8;
const DOG_PHOTO_MAX_WIDTH = 1600;
const DOG_PHOTO_QUALITY = 0.88;
const DOG_THUMB_SIZE = 480;
const DOG_THUMB_QUALITY = 0.8;

/**
 * Resizes an image to a max width and re-encodes it as JPEG to save storage and
 * bandwidth. Handles both the legacy `manipulateAsync` API and the SDK 52+
 * context API, and falls back to the original URI if manipulation isn't
 * available (e.g. some web contexts).
 */
interface ManipulateContext {
  resize: (size: { width: number; height?: number }) => ManipulateContext;
  renderAsync: () => Promise<{ saveAsync: (opts: unknown) => Promise<{ uri: string }> }>;
}

interface ManipulatorModule {
  SaveFormat: { JPEG: unknown };
  manipulateAsync?: (
    uri: string,
    actions: { resize: { width: number } }[],
    opts: { compress: number; format: unknown },
  ) => Promise<{ uri: string }>;
  ImageManipulator?: { manipulate: (uri: string) => ManipulateContext };
}

export async function compressImage(uri: string): Promise<string> {
  const mod = ImageManipulator as unknown as ManipulatorModule;
  try {
    // Legacy API (still exported in some versions).
    if (typeof mod.manipulateAsync === 'function') {
      const result = await mod.manipulateAsync(
        uri,
        [{ resize: { width: MAX_IMAGE_WIDTH } }],
        { compress: IMAGE_QUALITY, format: mod.SaveFormat.JPEG },
      );
      return result.uri;
    }

    // New context API (SDK 52+).
    if (mod.ImageManipulator?.manipulate) {
      const ctx = mod.ImageManipulator.manipulate(uri).resize({ width: MAX_IMAGE_WIDTH });
      const rendered = await ctx.renderAsync();
      const saved = await rendered.saveAsync({
        compress: IMAGE_QUALITY,
        format: mod.SaveFormat.JPEG,
      });
      return saved.uri;
    }
  } catch {
    // Fall through to the original URI.
  }
  return uri;
}

async function manipulateJpeg(
  uri: string,
  width: number,
  height?: number,
  compress = IMAGE_QUALITY,
): Promise<string> {
  const mod = ImageManipulator as unknown as ManipulatorModule;
  const resizeAction = height
    ? [{ resize: { width, height } }]
    : [{ resize: { width } }];
  try {
    if (typeof mod.manipulateAsync === 'function') {
      const result = await mod.manipulateAsync(uri, resizeAction, {
        compress,
        format: mod.SaveFormat.JPEG,
      });
      return result.uri;
    }
    if (mod.ImageManipulator?.manipulate) {
      let ctx = mod.ImageManipulator.manipulate(uri);
      ctx = ctx.resize({ width, height });
      const rendered = await ctx.renderAsync();
      const saved = await rendered.saveAsync({
        compress,
        format: mod.SaveFormat.JPEG,
      });
      return saved.uri;
    }
  } catch {
    // Fall through.
  }
  return uri;
}

/** Compresses a dog photo to max 1600px wide before upload. */
export async function compressDogPhoto(uri: string): Promise<string> {
  return manipulateJpeg(uri, DOG_PHOTO_MAX_WIDTH, undefined, DOG_PHOTO_QUALITY);
}

/** Creates a square thumbnail for dog gallery grids. */
export async function createDogThumbnail(uri: string): Promise<string> {
  return manipulateJpeg(uri, DOG_THUMB_SIZE, DOG_THUMB_SIZE, DOG_THUMB_QUALITY);
}

function imagePickerMediaTypes(allowed: ('image' | 'video')[]): ImagePicker.MediaType[] {
  const types: ImagePicker.MediaType[] = [];
  if (allowed.includes('image')) types.push('images');
  if (allowed.includes('video')) types.push('videos');
  return types;
}

interface PickOptions {
  allowed: ('image' | 'video')[];
  multiple?: boolean;
  limit?: number;
}

/** Opens the photo library. Returns selected items (empty if cancelled/denied). */
export async function pickFromLibrary(opts: PickOptions): Promise<PickedMedia[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== 'granted') return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: imagePickerMediaTypes(opts.allowed),
    allowsMultipleSelection: !!opts.multiple,
    selectionLimit: opts.limit,
    quality: IMAGE_QUALITY,
  });
  if (result.canceled) return [];
  return result.assets.map((a) => ({
    uri: a.uri,
    kind: a.type === 'video' ? 'video' : 'image',
    mimeType: a.mimeType,
    sizeBytes: a.fileSize,
  }));
}

/** Opens the camera to capture a single photo or video. */
export async function captureWithCamera(opts: PickOptions): Promise<PickedMedia[]> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (perm.status !== 'granted') return [];
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: imagePickerMediaTypes(opts.allowed),
    quality: IMAGE_QUALITY,
  });
  if (result.canceled) return [];
  return result.assets.map((a) => ({
    uri: a.uri,
    kind: a.type === 'video' ? 'video' : 'image',
    mimeType: a.mimeType,
    sizeBytes: a.fileSize,
  }));
}

/** Opens the document picker (PDF + images by default). */
export async function pickDocument(
  types: string[] = ['application/pdf', 'image/*'],
): Promise<PickedMedia[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: types,
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  return result.assets.map((a) => ({
    uri: a.uri,
    kind: 'document',
    name: a.name,
    mimeType: a.mimeType,
    sizeBytes: a.size ?? undefined,
  }));
}

function extensionFor(item: PickedMedia): string {
  const fromName = item.name?.split('.').pop();
  if (fromName && fromName.length <= 5) return fromName;
  if (item.kind === 'image') return 'jpg';
  if (item.kind === 'video') return 'mp4';
  if (item.mimeType?.includes('pdf')) return 'pdf';
  return 'bin';
}

function contentTypeFor(item: PickedMedia): string {
  if (item.mimeType) return item.mimeType;
  if (item.kind === 'image') return 'image/jpeg';
  if (item.kind === 'video') return 'video/mp4';
  return 'application/octet-stream';
}

export interface UploadOutcome {
  url: string | null;
  error: string | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Uploads a single picked item to a Storage bucket with automatic retries
 * (exponential backoff). Images are compressed first. In demo mode (no backend)
 * the local URI is returned so previews keep working for the session.
 */
export async function uploadMedia(
  item: PickedMedia,
  bucket: StorageBucket,
  folder: string,
  attempts = 3,
): Promise<UploadOutcome> {
  if (!supabase) return { url: item.uri, error: null };

  const uri = item.kind === 'image' ? await compressImage(item.uri) : item.uri;
  const path = buildObjectPath(folder, extensionFor(item));
  const contentType = contentTypeFor(item);

  let lastError: string | null = null;
  for (let i = 0; i < attempts; i++) {
    const { error } = await uploadFile({ bucket, path, uri, contentType, sizeBytes: item.sizeBytes });
    if (!error) return { url: getPublicUrl(bucket, path), error: null };
    lastError = error;
    if (i < attempts - 1) await sleep(500 * 2 ** i); // 0.5s, 1s backoff
  }
  return { url: null, error: lastError };
}
