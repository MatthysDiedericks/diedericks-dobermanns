/**
 * Profile photo for a dog card. Keep in lockstep with
 * diedericksdobermann-web/src/lib/dogs/profilePhoto.ts.
 *
 * 1. A photo Matt pinned (`is_primary`) wins.
 * 2. Otherwise the most recent by `uploaded_at`.
 * 3. Otherwise null — the caller shows a placeholder initial.
 *
 * `is_primary` is only ever written by a deliberate click, never on upload.
 * Embed PROFILE_PHOTO_EMBED on every dogs.dog_media select so step 2 can run.
 */

export const PROFILE_PHOTO_EMBED =
  'url, thumbnail_url, is_primary, uploaded_at';

export type ProfilePhotoInput = {
  url: string;
  thumbnail_url?: string | null;
  is_primary?: boolean | null;
  uploaded_at?: string | null;
  type?: string | null;
};

const BRED_PUPPY = new Set(['sold', 'in_training']);
const KENNEL_OWNED = new Set(['keep', 'stud', 'retired']);

export function isBredPuppyStatus(status: string | null | undefined): boolean {
  return BRED_PUPPY.has(status ?? '');
}

export function isKennelOwnedStatus(status: string | null | undefined): boolean {
  return KENNEL_OWNED.has(status ?? '');
}

function isPhoto(m: ProfilePhotoInput): boolean {
  return !m.type || m.type === 'photo';
}

function recency(m: ProfilePhotoInput): string {
  return m.uploaded_at ?? '';
}

/** The media row that should appear on the dog's card. */
export function pickProfilePhoto<T extends ProfilePhotoInput>(
  media: T[] | null | undefined,
): T | null {
  const photos = (media ?? []).filter(isPhoto);
  if (photos.length === 0) return null;
  const chosen = photos.find((m) => m.is_primary);
  if (chosen) return chosen;
  return [...photos].sort((a, b) => recency(b).localeCompare(recency(a)))[0] ?? null;
}

/** Thumbnail if present, else the full image URL. */
export function profilePhotoUrl(
  media: ProfilePhotoInput[] | null | undefined,
): string | null {
  const picked = pickProfilePhoto(media);
  if (!picked) return null;
  const thumb = picked.thumbnail_url?.trim();
  const url = picked.url?.trim();
  return thumb || url || null;
}

/** Copy shown above the photo picker so Matt can see which rule is in play. */
export function profileCoverHint(
  status: string | null | undefined,
  hasChosenCover: boolean,
): string {
  if (isBredPuppyStatus(status)) {
    return hasChosenCover
      ? 'A photo is pinned as the profile photo.'
      : 'Showing the most recent photo. Pin one to keep it as the profile photo.';
  }
  if (isKennelOwnedStatus(status)) {
    return "This dog's card uses the photo you mark as the profile photo.";
  }
  return hasChosenCover
    ? 'A photo is pinned as the profile photo.'
    : 'Showing the most recent photo. Pin one to keep it as the profile photo.';
}
