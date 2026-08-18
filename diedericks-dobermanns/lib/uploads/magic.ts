import type { UploadExt } from "./constants";

function hasPrefix(bytes: Uint8Array, prefix: number[], offset = 0): boolean {
  if (bytes.length < offset + prefix.length) return false;
  return prefix.every((b, i) => bytes[offset + i] === b);
}

function ascii(bytes: Uint8Array, start: number, len: number): string {
  return String.fromCharCode(...bytes.slice(start, start + len));
}

const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "mif1", "msf1"]);

/** Identify a file from magic bytes. Extension is ignored. */
export function detectUploadKind(bytes: Uint8Array): UploadExt | null {
  if (bytes.length >= 4 && hasPrefix(bytes, [0x25, 0x50, 0x44, 0x46])) return "pdf"; // %PDF
  if (bytes.length >= 3 && hasPrefix(bytes, [0xff, 0xd8, 0xff])) return "jpg";
  if (bytes.length >= 8 && hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "png";
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "webp";
  }
  if (
    bytes.length >= 12 &&
    ascii(bytes, 4, 4) === "ftyp" &&
    HEIC_BRANDS.has(ascii(bytes, 8, 4).toLowerCase())
  ) {
    return "heic";
  }
  return null;
}

export function mimeForKind(kind: UploadExt): string {
  if (kind === "jpg" || kind === "jpeg") return "image/jpeg";
  if (kind === "png") return "image/png";
  if (kind === "webp") return "image/webp";
  if (kind === "heic") return "image/heic";
  return "application/pdf";
}

export function storedExt(kind: UploadExt): "pdf" | "jpg" | "png" | "webp" | "heic" {
  if (kind === "jpeg") return "jpg";
  return kind;
}
