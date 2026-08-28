function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function u16(bytes: Uint8Array, i: number): number {
  return (bytes[i] << 8) | bytes[i + 1];
}

function isExifOrXmp(bytes: Uint8Array, start: number, len: number): boolean {
  const slice = bytes.subarray(start, start + Math.min(len, 29));
  const head = String.fromCharCode(...slice);
  return head.startsWith("Exif") || head.startsWith("http://ns.adobe.com/xap/");
}

/** Drop JPEG APP1 Exif/XMP segments (GPS lives here). */
export function stripJpegExif(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const chunks: Uint8Array[] = [bytes.subarray(0, 2)];
  let i = 2;
  while (i + 1 < bytes.length) {
    if (bytes[i] !== 0xff) {
      chunks.push(bytes.subarray(i));
      break;
    }
    const marker = bytes[i + 1];
    if (marker === 0xda || marker === 0xd9) {
      chunks.push(bytes.subarray(i));
      break;
    }
    if (marker === 0x00 || marker === 0xff) {
      chunks.push(bytes.subarray(i, i + 1));
      i += 1;
      continue;
    }
    if (i + 3 >= bytes.length) {
      chunks.push(bytes.subarray(i));
      break;
    }
    const len = u16(bytes, i + 2);
    const next = i + 2 + len;
    const drop = marker === 0xe1 && isExifOrXmp(bytes, i + 4, len - 2);
    if (!drop) chunks.push(bytes.subarray(i, next));
    i = next;
  }
  return concat(chunks);
}

const PNG_SKIP = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);

function pngType(bytes: Uint8Array, i: number): string {
  return String.fromCharCode(bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]);
}

function u32(bytes: Uint8Array, i: number): number {
  return (
    ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0
  );
}

/** Drop PNG metadata chunks that can carry GPS or location text. */
export function stripPngMetadata(bytes: Uint8Array): Uint8Array {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || !sig.every((b, i) => bytes[i] === b)) return bytes;
  const chunks: Uint8Array[] = [bytes.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= bytes.length) {
    const len = u32(bytes, i);
    const next = i + 12 + len;
    if (next > bytes.length) {
      chunks.push(bytes.subarray(i));
      break;
    }
    const type = pngType(bytes, i + 4);
    if (!PNG_SKIP.has(type)) chunks.push(bytes.subarray(i, next));
    i = next;
    if (type === "IEND") break;
  }
  return concat(chunks);
}

function fourcc(bytes: Uint8Array, i: number): string {
  return String.fromCharCode(bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]);
}

/** Drop WEBP EXIF / XMP chunks. */
export function stripWebpMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 12 || fourcc(bytes, 0) !== "RIFF" || fourcc(bytes, 8) !== "WEBP") {
    return bytes;
  }
  const kept: Uint8Array[] = [];
  let i = 12;
  while (i + 8 <= bytes.length) {
    const type = fourcc(bytes, i);
    let size = u32(bytes, i + 4);
    if (size > bytes.length - i - 8) break;
    const padded = size + (size % 2);
    if (type !== "EXIF" && type !== "XMP ") {
      kept.push(bytes.subarray(i, i + 8 + padded));
    }
    i += 8 + padded;
  }
  const payload = concat(kept);
  const out = new Uint8Array(12 + payload.length);
  out.set(bytes.subarray(0, 8), 0);
  out[4] = (payload.length + 4) & 0xff;
  out[5] = ((payload.length + 4) >>> 8) & 0xff;
  out[6] = ((payload.length + 4) >>> 16) & 0xff;
  out[7] = ((payload.length + 4) >>> 24) & 0xff;
  out.set(bytes.subarray(8, 12), 8);
  out.set(payload, 12);
  return out;
}

export function stripImageMetadata(kind: "jpg" | "png" | "webp", bytes: Uint8Array): Uint8Array {
  if (kind === "jpg") return stripJpegExif(bytes);
  if (kind === "png") return stripPngMetadata(bytes);
  if (kind === "webp") return stripWebpMetadata(bytes);
  return bytes;
}
