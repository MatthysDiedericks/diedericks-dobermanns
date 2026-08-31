import { useCallback, useEffect, useState } from 'react';

import type { AncestorPhotoRow, OwnDogPhotoSource } from '@/lib/pedigree/resolveAncestorPhoto';
import { requireSupabase, supabase } from '@/lib/supabase';

export function usePedigreePhotoMaps(ownAncestorIds: string[]) {
  const [ownDogs, setOwnDogs] = useState<Map<string, OwnDogPhotoSource>>(new Map());
  const [ancestorPhotos, setAncestorPhotos] = useState<Map<string, AncestorPhotoRow>>(
    new Map(),
  );

  const load = useCallback(async () => {
    if (!supabase) return;
    const client = requireSupabase();
    const unique = [...new Set(ownAncestorIds.filter(Boolean))];
    const [photosRes, dogsRes] = await Promise.all([
      client
        .from('ancestor_photos')
        .select('name_key, url, thumbnail_url, is_public, credit'),
      unique.length
        ? client
            .from('dogs')
            .select(
              'id, pedigree_photo_media_id, registration_number, dog_media!dog_media_dog_id_fkey(id, url, thumbnail_url, is_primary, uploaded_at, type)',
            )
            .in('id', unique)
        : Promise.resolve({ data: [] as never[], error: null }),
    ]);

    const photoMap = new Map<string, AncestorPhotoRow>();
    for (const row of (photosRes.data ?? []) as AncestorPhotoRow[]) {
      photoMap.set(row.name_key, row);
    }
    setAncestorPhotos(photoMap);

    const dogMap = new Map<string, OwnDogPhotoSource>();
    for (const row of (dogsRes.data ?? []) as unknown as Array<{
      id: string;
      pedigree_photo_media_id: string | null;
      registration_number: string | null;
      dog_media: OwnDogPhotoSource['media'] | null;
    }>) {
      dogMap.set(row.id, {
        pedigreePhotoMediaId: row.pedigree_photo_media_id,
        registrationNumber: row.registration_number,
        media: row.dog_media ?? [],
      });
    }
    setOwnDogs(dogMap);
  }, [ownAncestorIds.join('|')]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ownDogs, ancestorPhotos, refresh: load };
}
