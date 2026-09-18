/**
 * Profile photo for a dog card. Keep in lockstep with
 * diedericksdobermann-web/src/lib/dogs/profilePhoto.ts.
 *
 * 1. A photo Matt pinned (`is_primary`) wins. It never rotates.
 * 2. Otherwise a different photo each Africa/Johannesburg calendar day, seeded
 *    so every visitor sees the same choice that day.
 * 3. Otherwise null — the caller shows a placeholder initial.
 *
 * `is_primary` is only ever written by a deliberate click, never on upload.
 * Embed PROFILE_PHOTO_EMBED on every dogs.dog_media select so step 2 can run.
 * After dogs.pedigree_photo_media_id, the embed must be hinted:
 * `dog_media!dog_media_dog_id_fkey(...)` — otherwise PostgREST cannot tell
 * the gallery from the pedigree-photo FK.
 */

import { calendarDateKey, seedIndex } from './dailyOrder';

export const PROFILE_PHOTO_EMBED =
  'id, url, thumbnail_url, is_primary, uploaded_at';

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

function pickPinnedOrNewest<T extends ProfilePhotoInput>(photos: T[]): T | null {
  if (photos.length === 0) return null;
  const pinned = photos.find((m) => m.is_primary);
  if (pinned) return pinned;
  return [...photos].sort((a, b) => recency(b).localeCompare(recency(a)))[0] ?? null;
}

/**
 * The media row that should appear on the dog's card.
 * Seed on `dogId` when the caller has it; otherwise the newest photo's id
 * (stable until a newer photo is uploaded). Never seed on the chosen photo.
 */
export function pickProfilePhoto<T extends ProfilePhotoInput & { id?: string }>(
  media: T[] | null | undefined,
  now: Date = new Date(),
  dogId?: string,
): T | null {
  const photos = (media ?? []).filter(isPhoto);
  if (photos.length === 0) return null;

  // A pinned cover is a deliberate choice. It never rotates.
  const pinned = photos.find((m) => m.is_primary);
  if (pinned) return pinned;

  // No pin: show a different one each calendar day, stable for all visitors.
  // Sorting by recency first keeps the order deterministic when uploaded_at ties.
  const stable = [...photos].sort((a, b) => recency(b).localeCompare(recency(a)));
  const dateKey = calendarDateKey(now);
  const index = seedIndex(dateKey + (dogId || stable[0]?.id || ''), stable.length);
  return stable[index] ?? null;
}

/** Thumbnail if present, else the full image URL. */
export function profilePhotoUrl(
  media: ProfilePhotoInput[] | null | undefined,
  now: Date = new Date(),
  dogId?: string,
): string | null {
  const picked = pickProfilePhoto(media, now, dogId);
  if (!picked) return null;
  const thumb = picked.thumbnail_url?.trim();
  const url = picked.url?.trim();
  return thumb || url || null;
}

/**
 * Photo for the pedigree certificate.
 * 1. The photo chosen in `dogs.pedigree_photo_media_id`.
 * 2. Otherwise the pinned cover, else the newest — never the daily rotation.
 * 3. Otherwise null — render the crest monogram, never a broken image frame.
 */
export function pickPedigreePhoto<T extends ProfilePhotoInput & { id: string }>(
  media: T[] | null | undefined,
  pedigreePhotoMediaId: string | null | undefined,
): T | null {
  const photos = (media ?? []).filter(isPhoto);
  if (pedigreePhotoMediaId) {
    const chosen = photos.find((m) => m.id === pedigreePhotoMediaId);
    if (chosen) return chosen;
  }
  return pickPinnedOrNewest(photos);
}

/** Thumbnail if present, else the full image URL, for a pedigree cell. */
export function pedigreePhotoUrl(
  media: (ProfilePhotoInput & { id: string })[] | null | undefined,
  pedigreePhotoMediaId: string | null | undefined,
): string | null {
  const picked = pickPedigreePhoto(media, pedigreePhotoMediaId);
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
      ? 'A photo is pinned as the card photo.'
      : 'Showing a different photo each day. Pin one to keep it as the card photo.';
  }
  if (isKennelOwnedStatus(status)) {
    return "This dog's card uses the photo you mark as the card photo.";
  }
  return hasChosenCover
    ? 'A photo is pinned as the card photo.'
    : 'Showing a different photo each day. Pin one to keep it as the card photo.';
}

/** Copy shown beside the card-photo hint: conformation shot vs head shot. */
export function pedigreePhotoHint(hasChosenPedigreePhoto: boolean): string {
  return hasChosenPedigreePhoto
    ? 'A conformation shot is pinned for the pedigree certificate. The card photo is separate.'
    : 'The pedigree uses the card photo until you pick a conformation shot.';
}
