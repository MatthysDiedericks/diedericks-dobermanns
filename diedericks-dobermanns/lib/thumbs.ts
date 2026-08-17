/** Tile requests this many images at a time. */
export const GRID_PAGE_SIZE = 24;

/**
 * 2× (retina) widths. Tune here only — components pick a key, never a number.
 * Keep in lockstep with diedericksdobermann-web/src/lib/thumbs.ts.
 */
export const IMAGE_SIZES = {
  grid: { width: 900, quality: 82 },
  hero: { width: 1600, quality: 85 },
  avatar: { width: 200, quality: 80 },
} as const;

export type ImageSizeKey = keyof typeof IMAGE_SIZES;

const OBJECT_PUBLIC = '/storage/v1/object/public/';
const OBJECT_SIGN = '/storage/v1/object/sign/';
const RENDER_PUBLIC = '/storage/v1/render/image/public/';
const RENDER_SIGN = '/storage/v1/render/image/sign/';

function applyTransform(url: string, width: number, quality: number): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('.supabase.co')) return url;
    if (parsed.pathname.includes(OBJECT_PUBLIC)) {
      parsed.pathname = parsed.pathname.replace(OBJECT_PUBLIC, RENDER_PUBLIC);
    } else if (parsed.pathname.includes(OBJECT_SIGN)) {
      parsed.pathname = parsed.pathname.replace(OBJECT_SIGN, RENDER_SIGN);
    }
    parsed.searchParams.set('width', String(width));
    parsed.searchParams.set('quality', String(quality));
    return parsed.toString();
  } catch {
    return url;
  }
}

function specFor(size: ImageSizeKey, density: 1 | 2) {
  const spec = IMAGE_SIZES[size];
  return {
    width: density === 2 ? spec.width : Math.round(spec.width / 2),
    quality: spec.quality,
  };
}

/** Rewrites a Supabase object URL to the image-transformation render endpoint. */
export function supabaseThumbUrl(
  url: string | null | undefined,
  size: ImageSizeKey = 'grid',
  density: 1 | 2 = 2,
): string | null {
  if (!url) return null;
  const { width, quality } = specFor(size, density);
  return applyTransform(url, width, quality);
}
