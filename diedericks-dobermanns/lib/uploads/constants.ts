export const UPLOAD_EXT_WHITELIST = ["pdf", "jpg", "jpeg", "png", "webp", "heic"] as const;
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
};

export function formatMbLimit(maxBytes = MAX_UPLOAD_BYTES): string {
  return `${Math.round(maxBytes / (1024 * 1024))} MB`;
}

export const TOO_LARGE_MESSAGE = `That file is over ${formatMbLimit()} — please send a smaller copy, or WhatsApp us.`;
export const BAD_TYPE_MESSAGE =
  "That file type is not accepted. Use a PDF, JPG, PNG, WEBP or HEIC.";
export const TOO_MANY_FILES_MESSAGE = `You can attach at most ${MAX_APPLICATION_FILES} files.`;
