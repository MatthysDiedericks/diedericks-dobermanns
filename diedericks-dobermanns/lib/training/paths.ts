const BUCKET = "training-videos";

const PUBLIC_MARK = `/object/public/${BUCKET}/`;
const SIGN_MARK = `/object/sign/${BUCKET}/`;
const AUTH_MARK = `/object/authenticated/${BUCKET}/`;

export function trainingObjectPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;
  if (!v.startsWith("http")) return v;
  for (const mark of [PUBLIC_MARK, SIGN_MARK, AUTH_MARK]) {
    const idx = v.indexOf(mark);
    if (idx >= 0) {
      const rest = v.slice(idx + mark.length);
      return rest.split("?")[0] || null;
    }
  }
  return v;
}

export const TRAINING_VIDEO_BUCKET = BUCKET;
export const PLAYBACK_TTL_SECONDS = 2 * 60 * 60;
export const THUMB_TTL_SECONDS = 60 * 60;

export function libraryVideoPath(videoId: string, ext: string): string {
  const clean = ext.replace(/^\./, "").toLowerCase();
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}`;
  return `library/${videoId}/${id}.${clean}`;
}

export function libraryThumbPath(videoId: string): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}`;
  return `library/${videoId}/thumbs/${id}.jpg`;
}
