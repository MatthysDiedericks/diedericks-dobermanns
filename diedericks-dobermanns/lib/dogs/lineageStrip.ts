import { resolveDogParents, fetchProgenyGroups } from '@/lib/breeding/relatives';
import { PROFILE_PHOTO_EMBED, profilePhotoUrl } from '@/lib/dogs/profilePhoto';
import { requireSupabase } from '@/lib/supabase';

export type LineageParent = {
  id: string | null;
  name: string;
  callName: string | null;
  photoUrl: string | null;
  linked: boolean;
};

export type LineageLittermate = {
  id: string;
  name: string;
  sex: string | null;
  status: string | null;
  collar_colour: string | null;
  birth_order: number | null;
  deceased_at: string | null;
  isCurrent: boolean;
};

export type LineageProgenyLitter = {
  litterId: string | null;
  otherParentName: string;
  date: string | null;
  puppyCount: number;
  href: string | null;
};

export type LineageLitterInfo = {
  id: string;
  name: string | null;
  letter: string | null;
  date: string | null;
  damName: string;
  sireName: string;
};

export type LineageStripData = {
  dogId: string;
  sire: LineageParent;
  dam: LineageParent;
  litter: LineageLitterInfo | null;
  littermates: LineageLittermate[];
  progeny: LineageProgenyLitter[];
};

type MediaRow = {
  url: string;
  thumbnail_url?: string | null;
  is_primary?: boolean | null;
  uploaded_at?: string | null;
  type?: string | null;
};

function chartParentName(pedigree: unknown, key: 'sire' | 'dam'): string | null {
  if (!pedigree || typeof pedigree !== 'object') return null;
  const node = (pedigree as Record<string, { name?: string }>)[key];
  return node?.name?.trim() || null;
}

function unknownParent(role: 'sire' | 'dam'): LineageParent {
  return {
    id: null,
    name: role === 'sire' ? 'Unknown sire' : 'Unknown dam',
    callName: null,
    photoUrl: null,
    linked: false,
  };
}

async function loadDogCard(id: string | null): Promise<LineageParent | null> {
  if (!id) return null;
  const { data } = await requireSupabase()
    .from('dogs')
    .select(`id, name, call_name, dog_media!dog_media_dog_id_fkey(${PROFILE_PHOTO_EMBED})`)
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  const media = ((data.dog_media as unknown) as MediaRow[] | null) ?? [];
  return {
    id: data.id,
    name: data.call_name?.trim() || data.name,
    callName: data.call_name ?? null,
    photoUrl: profilePhotoUrl(media),
    linked: true,
  };
}

export async function fetchLineageStrip(dogId: string): Promise<LineageStripData> {
  const supabase = requireSupabase();
  const { data: dog } = await supabase
    .from('dogs')
    .select('id, name, call_name, litter_id, father_id, mother_id, pedigree, sex')
    .eq('id', dogId)
    .maybeSingle();

  const parents = await resolveDogParents(dogId);
  const [sireDog, damDog] = await Promise.all([
    loadDogCard(parents.fatherId),
    loadDogCard(parents.motherId),
  ]);

  const { data: ancestorRows } = await supabase
    .from('pedigree_ancestors')
    .select('position, generation, registered_name')
    .eq('dog_id', dogId)
    .eq('generation', 1);

  const ancestors = ancestorRows ?? [];
  let sire = sireDog;
  let dam = damDog;
  if (!sire) {
    const name =
      ancestors.find((a) => a.generation === 1 && a.position === 'S')?.registered_name?.trim() ||
      chartParentName(dog?.pedigree, 'sire');
    sire = name
      ? { id: null, name, callName: null, photoUrl: null, linked: false }
      : unknownParent('sire');
  }
  if (!dam) {
    const name =
      ancestors.find((a) => a.generation === 1 && a.position === 'D')?.registered_name?.trim() ||
      chartParentName(dog?.pedigree, 'dam');
    dam = name
      ? { id: null, name, callName: null, photoUrl: null, linked: false }
      : unknownParent('dam');
  }

  let litter: LineageLitterInfo | null = null;
  if (dog?.litter_id) {
    const { data: litterRow } = await supabase
      .from('litters')
      .select(
        'id, name, litter_letter, actual_date, mother:mother_id(id, name, call_name), father:father_id(id, name, call_name)',
      )
      .eq('id', dog.litter_id)
      .maybeSingle();
    const row = litterRow as unknown as {
      id: string;
      name: string | null;
      litter_letter: string | null;
      actual_date: string | null;
      mother: { name: string; call_name: string | null } | null;
      father: { name: string; call_name: string | null } | null;
    } | null;
    litter = row
      ? {
          id: row.id,
          name: row.name,
          letter: row.litter_letter,
          date: row.actual_date,
          damName: row.mother?.call_name?.trim() || row.mother?.name || dam.name,
          sireName: row.father?.call_name?.trim() || row.father?.name || sire.name,
        }
      : {
          id: dog.litter_id,
          name: null,
          letter: null,
          date: null,
          damName: dam.name,
          sireName: sire.name,
        };
  }

  let littermates: LineageLittermate[] = [];
  if (dog?.litter_id) {
    const { data: pups } = await supabase
      .from('dogs')
      .select('id, name, call_name, sex, status, collar_colour, birth_order, deceased_at')
      .eq('litter_id', dog.litter_id)
      .order('birth_order', { ascending: true, nullsFirst: false });
    littermates = (pups ?? []).map((p) => ({
      id: p.id,
      name: p.call_name?.trim() || p.name,
      sex: p.sex,
      status: p.status,
      collar_colour: p.collar_colour,
      birth_order: p.birth_order,
      deceased_at: p.deceased_at,
      isCurrent: p.id === dogId,
    }));
  } else {
    littermates = [
      {
        id: dogId,
        name: dog?.call_name?.trim() || dog?.name || 'This dog',
        sex: dog?.sex ?? null,
        status: null,
        collar_colour: null,
        birth_order: 1,
        deceased_at: null,
        isCurrent: true,
      },
    ];
  }

  const { data: progenyLitters } = await supabase
    .from('litters')
    .select(
      'id, actual_date, mother_id, father_id, mother:mother_id(name, call_name), father:father_id(name, call_name), puppies:dogs!dogs_litter_id_fkey(id)',
    )
    .or(`mother_id.eq.${dogId},father_id.eq.${dogId}`)
    .order('actual_date', { ascending: false, nullsFirst: false });

  const progeny: LineageProgenyLitter[] = (progenyLitters ?? []).map((row) => {
    const litterRow = row as unknown as {
      id: string;
      actual_date: string | null;
      mother_id: string | null;
      father_id: string | null;
      mother: { name: string; call_name: string | null } | null;
      father: { name: string; call_name: string | null } | null;
      puppies: { id: string }[] | null;
    };
    const isDam = litterRow.mother_id === dogId;
    const mate = isDam ? litterRow.father : litterRow.mother;
    const otherParentName =
      mate?.call_name?.trim() || mate?.name || (isDam ? 'Unknown sire' : 'Unknown dam');
    return {
      litterId: litterRow.id,
      otherParentName,
      date: litterRow.actual_date,
      puppyCount: (litterRow.puppies ?? []).filter((p) => p.id !== dogId).length,
      href: `/(admin)/litters/${litterRow.id}`,
    };
  });

  const groupedIds = new Set(progeny.map((p) => p.litterId).filter(Boolean));
  const ungrouped = (await fetchProgenyGroups(dogId)).filter(
    (g) => !g.litterId || !groupedIds.has(g.litterId),
  );
  for (const g of ungrouped) {
    progeny.push({
      litterId: g.litterId,
      otherParentName: g.litterLabel ?? 'Ungrouped',
      date: g.actualDate,
      puppyCount: g.dogs.length,
      href: g.litterId ? `/(admin)/litters/${g.litterId}` : null,
    });
  }

  return { dogId, sire, dam, litter, littermates, progeny };
}
