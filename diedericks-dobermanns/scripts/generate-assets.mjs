// Generates placeholder app assets from the brand monogram source.
// Run: node scripts/generate-assets.mjs
//
// Produces square, correctly-formatted PNGs:
//   icon.png                     1024² gold monogram on black (app/store icon)
//   splash-icon.png              1024² gold monogram on transparent
//   favicon.png                  48²   web favicon
//   android-icon-background.png  1024² solid brand black
//   android-icon-foreground.png  1024² gold monogram (transparent, safe zone)
//   android-icon-monochrome.png  1024² white monogram silhouette (transparent)

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const ASSETS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets');
const SRC = path.join(ASSETS, 'monogram-source.png');
const SIZE = 1024;
const BLACK = { r: 10, g: 10, b: 10 }; // #0A0A0A
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const out = (name) => path.join(ASSETS, name);

const rawOpts = { raw: { width: SIZE, height: SIZE, channels: 4 } };

/**
 * Builds an RGBA buffer from the gold-on-black base, deriving the alpha channel
 * from pixel luminance (black background -> transparent, gold monogram -> opaque
 * with soft edges). Optionally recolours opaque pixels to a flat colour.
 */
function maskToAlpha(rgb, recolour) {
  const px = SIZE * SIZE;
  const rgba = Buffer.alloc(px * 4);
  for (let i = 0; i < px; i++) {
    const r = rgb[i * 3];
    const g = rgb[i * 3 + 1];
    const b = rgb[i * 3 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // Soft ramp between 30 and 80 luminance for anti-aliased edges.
    const alpha = lum <= 30 ? 0 : lum >= 80 ? 255 : Math.round(((lum - 30) / 50) * 255);
    rgba[i * 4] = recolour ? recolour.r : r;
    rgba[i * 4 + 1] = recolour ? recolour.g : g;
    rgba[i * 4 + 2] = recolour ? recolour.b : b;
    rgba[i * 4 + 3] = alpha;
  }
  return rgba;
}

async function run() {
  // Square gold-on-black base — centre-crop the landscape source so the
  // monogram is large and the background is a uniform brand black (no bands).
  const base = await sharp(SRC)
    .resize(SIZE, SIZE, { fit: 'cover', position: 'center', background: BLACK })
    .flatten({ background: BLACK })
    .png()
    .toBuffer();

  // App + store icon (opaque, square).
  await sharp(base).toFile(out('icon.png'));

  // Web favicon.
  await sharp(base).resize(48, 48).toFile(out('favicon.png'));

  // Solid brand-black adaptive background.
  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { ...BLACK, alpha: 1 } },
  })
    .png()
    .toFile(out('android-icon-background.png'));

  // Raw RGB of the base for pixel-level masking.
  const { data: rgb } = await sharp(base)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const goldOnAlpha = await sharp(maskToAlpha(rgb), rawOpts).png().toBuffer();
  const whiteOnAlpha = await sharp(maskToAlpha(rgb, { r: 245, g: 245, b: 245 }), rawOpts)
    .png()
    .toBuffer();

  // Gold monogram on transparent (splash).
  await sharp(goldOnAlpha).toFile(out('splash-icon.png'));

  // Android status-bar notification icon: white silhouette on transparent.
  await sharp(whiteOnAlpha).resize(256, 256).toFile(out('notification-icon.png'));

  // Adaptive layers honour Android's ~66% safe zone (scale to 700px, pad to 1024).
  const PAD = (SIZE - 700) / 2;
  const safeZone = (buf) =>
    sharp(buf)
      .resize(700, 700, { fit: 'contain', background: TRANSPARENT })
      .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: TRANSPARENT })
      .png();

  await safeZone(goldOnAlpha).toFile(out('android-icon-foreground.png'));
  await safeZone(whiteOnAlpha).toFile(out('android-icon-monochrome.png'));

  console.log('Generated placeholder assets in', ASSETS);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
