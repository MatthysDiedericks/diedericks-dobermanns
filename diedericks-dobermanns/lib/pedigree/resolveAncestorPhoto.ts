import { pickPedigreePhoto, type ProfilePhotoInput } from '@/lib/dogs/profilePhoto';
import { ancestorNameKey } from '@/lib/pedigree/nameKey';

export type AncestorPhotoRow = {
  name_key: string;
  url: string;
  thumbnail_url: string | null;
  is_public: boolean;
  credit: string | null;
};

export type OwnDogPhotoSource = {
  pedigreePhotoMediaId: string | null;
  registrationNumber: string | null;
  media: (ProfilePhotoInput & { id: string })[];
};

export type ResolveAncestorPhotoInput = {
  registeredName: string | null | undefined;
  ownAncestorId: string | null | undefined;
  ownDogs: ReadonlyMap<string, OwnDogPhotoSource>;
  ancestorPhotos: ReadonlyMap<string, AncestorPhotoRow>;
  publicOnly: boolean;
};

function photoUrl(url: string, thumbnail: string | null | undefined): string {
  const thumb = thumbnail?.trim();
  return thumb || url;
}

/**
 * Photo for any pedigree cell that is not the subject.
 * 1. own_ancestor_id set → that dog's pickPedigreePhoto.
 * 2. Otherwise ancestor_photos matched on lower(btrim(registered_name)).
 * 3. Otherwise null — text-only cell, no reserved gap, no broken frame.
 */
export function resolveAncestorPhoto(input: ResolveAncestorPhotoInput): string | null {
  const ownId = input.ownAncestorId?.trim();
  if (ownId) {
    const own = input.ownDogs.get(ownId);
    if (own) {
      const picked = pickPedigreePhoto(own.media, own.pedigreePhotoMediaId);
      if (picked) {
        const url = photoUrl(picked.url, picked.thumbnail_url);
        if (url) return url;
      }
    }
  }

  const key = ancestorNameKey(input.registeredName);
  if (!key) return null;
  const row = input.ancestorPhotos.get(key);
  if (!row) return null;
  if (input.publicOnly && !row.is_public) return null;
  const url = photoUrl(row.url, row.thumbnail_url);
  return url || null;
}
