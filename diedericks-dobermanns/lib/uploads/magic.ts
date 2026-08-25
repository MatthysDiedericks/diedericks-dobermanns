import type { UploadExt, VideoUploadExt } from "./constants";

export type DetectedKind = UploadExt | VideoUploadExt;

function hasPrefix(bytes: Uint8Array, prefix: number[], offset = 0): boolean {
  if (bytes.length < offset + prefix.length) return false;
  return prefix.every((b, i) => bytes[offset + i] === b);
}

function ascii(bytes: Uint8Array, start: number, len: number): string {
  return String.fromCharCode(...bytes.slice(start, start + len));
}

const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "mif1", "msf1"]);
const M4V_BRANDS = new Set(["m4v ", "m4v", "M4V ", "M4V"]);
const MOV_BRANDS = new Set(["qt  ", "qt"]);

/** Identify a file from magic bytes. Extension is ignored. */
export function detectUploadKind(bytes: Uint8Array): DetectedKind | null {
  if (bytes.length >= 4 && hasPrefix(bytes, [0x25, 0x50, 0x44, 0x46])) return "pdf"; // %PDF
  if (bytes.length >= 3 && hasPrefix(bytes, [0xff, 0xd8, 0xff])) return "jpg";
  if (bytes.length >= 8 && hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "png";
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "webp";
  }
  if (bytes.length >= 4 && hasPrefix(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return "webm";
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);
    const brandKey = brand.toLowerCase();
    if (HEIC_BRANDS.has(brandKey)) return "heic";
    if (MOV_BRANDS.has(brand) || brandKey.startsWith("qt")) return "mov";
    if (M4V_BRANDS.has(brand) || brandKey.startsWith("m4v")) return "m4v";
    return "mp4";
  }
  return null;
}

export function isVideoKind(kind: DetectedKind | null): kind is VideoUploadExt {
  return kind === "mp4" || kind === "mov" || kind === "m4v" || kind === "webm";
}

export function mimeForKind(kind: DetectedKind): string {
  if (kind === "jpg" || kind === "jpeg") return "image/jpeg";
  if (kind === "png") return "image/png";
  if (kind === "webp") return "image/webp";
  if (kind === "heic") return "image/heic";
  if (kind === "mp4") return "video/mp4";
  if (kind === "m4v") return "video/x-m4v";
  if (kind === "mov") return "video/quicktime";
  if (kind === "webm") return "video/webm";
  return "application/pdf";
}

export function storedExt(kind: DetectedKind): string {
  if (kind === "jpeg") return "jpg";
  return kind;
}
