export const UPLOAD_EXT_WHITELIST = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
] as const;
export type UploadExt = (typeof UPLOAD_EXT_WHITELIST)[number];

export const VIDEO_UPLOAD_EXT_WHITELIST = ["mp4", "mov", "m4v", "webm"] as const;
export type VideoUploadExt = (typeof VIDEO_UPLOAD_EXT_WHITELIST)[number];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const STAFF_MEDIA_MAX_BYTES = 50 * 1024 * 1024;
export const MAX_TRAINING_VIDEO_BYTES = 512 * 1024 * 1024;
export const MAX_APPLICATION_FILES = 5;
export const TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60;

export const UPLOAD_MIME: Record<Exclude<UploadExt, "jpeg">, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

/** Shared MIME list for every document picker (proofs, receipts, vet slips, apply). */
export const ACCEPT_DOCUMENT_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export function formatMbLimit(maxBytes = MAX_UPLOAD_BYTES): string {
  return `${Math.round(maxBytes / (1024 * 1024))} MB`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function tooLargeMessage(fileBytes: number, maxBytes = MAX_UPLOAD_BYTES): string {
  return `That file is ${formatBytes(fileBytes)} — over the ${formatBytes(maxBytes)} limit. Please send a smaller copy, or WhatsApp us.`;
}

export const TOO_LARGE_MESSAGE = `That file is over ${formatMbLimit()} — please send a smaller copy, or WhatsApp us.`;
export const BAD_TYPE_MESSAGE =
  "That file type is not accepted. Use a PDF, JPG, PNG, WEBP, HEIC or HEIF.";
export const HEIC_CONVERT_FAILED_MESSAGE =
  "iPhone photo format could not be read, please try again.";
export const TOO_MANY_FILES_MESSAGE = `You can attach at most ${MAX_APPLICATION_FILES} files.`;
