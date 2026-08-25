import { detectUploadKind } from "./magic";
import { stripJpegExif } from "./exif";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function main() {
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]);
  assert(detectUploadKind(pdf) === "pdf", "pdf magic");

  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  assert(detectUploadKind(jpeg) === "jpg", "jpeg magic");

  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  assert(detectUploadKind(png) === "png", "png magic");

  const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
  assert(detectUploadKind(exe) === null, "exe renamed pdf must fail");

  const fakeMp4 = new Uint8Array(12);
  fakeMp4.set([0x4d, 0x5a], 0);
  assert(detectUploadKind(fakeMp4) === null, "exe renamed mp4 must fail");

  const mp4 = new Uint8Array(12);
  mp4.set([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
  assert(detectUploadKind(mp4) === "mp4", "mp4 ftyp isom");

  const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00, 0x00, 0x00]);
  assert(detectUploadKind(webm) === "webm", "webm ebml");

  const withExif = buildJpegWithExif();
  assert(indexOf(withExif, "Exif") >= 0, "fixture has Exif");
  const stripped = stripJpegExif(withExif);
  assert(indexOf(stripped, "Exif") < 0, "exif stripped");
  assert(stripped[0] === 0xff && stripped[1] === 0xd8, "still jpeg");

  console.log("uploads/magic.test.ts: ok");
}

function indexOf(bytes: Uint8Array, ascii: string): number {
  const needle = Array.from(ascii).map((c) => c.charCodeAt(0));
  outer: for (let i = 0; i <= bytes.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

/** Minimal SOI + APP1 Exif + SOS-less EOI so the stripper has something to drop. */
function buildJpegWithExif(): Uint8Array {
  const payload = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x47, 0x50, 0x53]; // Exif\0\0GPS
  const len = payload.length + 2;
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe1, (len >> 8) & 0xff, len & 0xff, ...payload,
    0xff, 0xd9,
  ]);
}

main();
