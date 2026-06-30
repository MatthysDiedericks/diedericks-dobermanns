import type { AncestorEntry } from '@/lib/breeding/coi';
import { requireSupabase } from '@/lib/supabase';

export type PedigreeNode = {
  id: string;
  father_id: string | null;
  mother_id: string | null;
};

export function getAncestorsFromPedigree(
  dogId: string,
  pedigree: Map<string, PedigreeNode>,
  maxDepth = 4,
): AncestorEntry[] {
  const out: AncestorEntry[] = [];

  function expand(currentId: string, depth: number, pathPrefix: string) {
    if (depth > maxDepth) return;
    const node = pedigree.get(currentId);
    if (!node) return;

    if (node.father_id) {
      const path = pathPrefix ? `${pathPrefix}>sire` : 'sire';
      out.push({ ancestor_id: node.father_id, depth, path });
      expand(node.father_id, depth + 1, path);
    }
    if (node.mother_id) {
      const path = pathPrefix ? `${pathPrefix}>dam` : 'dam';
      out.push({ ancestor_id: node.mother_id, depth, path });
      expand(node.mother_id, depth + 1, path);
    }
  }

  expand(dogId, 1, '');
  return out;
}

export async function fetchAncestorsRpc(
  dogId: string,
  depth = 4,
): Promise<AncestorEntry[] | null> {
  try {
    const { data, error } = await requireSupabase().rpc('get_ancestors', {
      p_dog_id: dogId,
      p_depth: depth,
    });
    if (error) return null;
    return (data ?? []).map((row: { ancestor_id: string; depth: number; path: string }) => ({
      ancestor_id: String(row.ancestor_id),
      depth: Number(row.depth),
      path: String(row.path),
    }));
  } catch {
    return null;
  }
}

export async function fetchPedigreeMap(): Promise<Map<string, PedigreeNode>> {
  const { data } = await requireSupabase()
    .from('dogs')
    .select('id, father_id, mother_id');
  const map = new Map<string, PedigreeNode>();
  for (const row of data ?? []) {
    map.set(String(row.id), {
      id: String(row.id),
      father_id: row.father_id,
      mother_id: row.mother_id,
    });
  }
  return map;
}

export async function resolveAncestors(
  dogId: string,
  pedigree: Map<string, PedigreeNode>,
  depth = 4,
): Promise<AncestorEntry[]> {
  const rpc = await fetchAncestorsRpc(dogId, depth);
  if (rpc?.length) return rpc;
  return getAncestorsFromPedigree(dogId, pedigree, depth);
}
