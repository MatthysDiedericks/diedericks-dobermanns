import { useCallback, useEffect, useState } from 'react';

import { pickProfilePhoto, profilePhotoUrl } from '@/lib/dogs/profilePhoto';
import { fetchMyClientIds } from '@/lib/portal/memberScope';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export type LineageHealthTest = {
  testName: string;
  result: string | null;
  testedDate: string | null;
  lab: string | null;
};

export type LineageParent = {
  id: string;
  name: string;
  callName: string | null;
  registeredName: string | null;
  role: 'sire' | 'dam';
  photoUrl: string | null;
  photoUrls: string[];
  hipScore: string | null;
  elbowScore: string | null;
  dcmStatus: string | null;
  healthTests: LineageHealthTest[];
  pedigreeRecorded: boolean;
};

export type AssignedLitter = {
  litterId: string;
  expectedDate: string | null;
  actualDate: string | null;
  goHomeDate: string | null;
  goHomeEarliest: string | null;
  goHomeLatest: string | null;
  goHomeWeeks: number | null;
};

type ParentLink = { parent_id: string; role: string };

async function hydrateParents(links: ParentLink[]): Promise<LineageParent[]> {
  if (links.length === 0) return [];
  const supabase = requireSupabase();
  const parents = await Promise.all(
    links.map(async ({ parent_id, role }): Promise<LineageParent | null> => {
      const [{ data: dog }, { data: media }, { data: tests }, { count }] = await Promise.all([
        supabase
          .from('dogs')
          .select('id, name, call_name, registered_name, hip_score, elbow_score, dcm_status')
          .eq('id', parent_id)
          .maybeSingle(),
        supabase
          .from('dog_media')
          .select('url, thumbnail_url, is_primary, uploaded_at')
          .eq('dog_id', parent_id)
          .eq('type', 'photo')
          .eq('is_public', true),
        supabase
          .from('health_tests')
          .select('test_name, result, tested_date, lab')
          .eq('dog_id', parent_id)
          .order('tested_date', { ascending: false }),
        supabase
          .from('pedigree_ancestors')
          .select('id', { count: 'exact', head: true })
          .eq('dog_id', parent_id),
      ]);
      if (!dog) return null;
      const photos = media ?? [];
      const cover = pickProfilePhoto(photos);
      return {
        id: dog.id,
        name: dog.name,
        callName: dog.call_name,
        registeredName: dog.registered_name,
        role: role === 'sire' ? 'sire' : 'dam',
        photoUrl: profilePhotoUrl(photos),
        photoUrls: [
          cover?.thumbnail_url || cover?.url,
          ...photos.filter((p) => p !== cover).map((p) => p.thumbnail_url || p.url),
        ].filter((u): u is string => Boolean(u)),
        hipScore: dog.hip_score,
        elbowScore: dog.elbow_score,
        dcmStatus: dog.dcm_status,
        healthTests: (tests ?? []).map((t) => ({
          testName: t.test_name,
          result: t.result,
          testedDate: t.tested_date,
          lab: t.lab,
        })),
        pedigreeRecorded: (count ?? 0) > 0,
      };
    }),
  );
  return parents.filter((p): p is LineageParent => p !== null);
}

export function useCommittedBreeding(forUserId?: string) {
  const sessionId = useAuthStore((s) => s.session?.user.id);
  const userId = forUserId ?? sessionId;
  const [parents, setParents] = useState<LineageParent[]>([]);
  const [litter, setLitter] = useState<AssignedLitter | null>(null);
  const [hasPuppy, setHasPuppy] = useState(false);
  const [onWaitlist, setOnWaitlist] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setParents([]);
      setLitter(null);
      setHasPuppy(false);
      setOnWaitlist(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = requireSupabase();
      const scopeIds =
        forUserId && sessionId && forUserId !== sessionId ? [forUserId] : await fetchMyClientIds();
      const packs = await Promise.all(
        scopeIds.map(async (id) => {
          const [linksRes, litterRes, dogsRes, waitRes] = await Promise.all([
            supabase.rpc('parent_links_for', { p_user_id: id }),
            supabase.rpc('assigned_litter_for', { p_user_id: id }),
            supabase.rpc('dog_ids_for', { p_user_id: id }),
            supabase
              .from('waiting_list')
              .select('id')
              .eq('client_id', id)
              .eq('status', 'active')
              .neq('pipeline_stage', 'withdrawn')
              .limit(1),
          ]);
          return {
            links: linksRes.data,
            litterRows: litterRes.data,
            dogIds: dogsRes.data,
            waitRows: waitRes.data,
          };
        }),
      );
      const links = packs.flatMap((p) => p.links ?? []);
      const litterRows = packs.flatMap((p) => p.litterRows ?? []);
      const dogIds = packs.flatMap((p) => p.dogIds ?? []);
      const waitRows = packs.flatMap((p) => p.waitRows ?? []);
      const unique = new Map<string, ParentLink>();
      for (const link of (links ?? []) as ParentLink[]) {
        if (!unique.has(link.parent_id)) unique.set(link.parent_id, link);
      }
      const hydrated = await hydrateParents([...unique.values()]);
      const row = (litterRows ?? [])[0] as
        | {
            litter_id: string;
            expected_date: string | null;
            actual_date: string | null;
            go_home_date: string | null;
            go_home_earliest: string | null;
            go_home_latest: string | null;
            go_home_weeks: number | null;
          }
        | undefined;
      setParents(hydrated);
      setLitter(
        row
          ? {
              litterId: row.litter_id,
              expectedDate: row.expected_date,
              actualDate: row.actual_date,
              goHomeDate: row.go_home_date,
              goHomeEarliest: row.go_home_earliest,
              goHomeLatest: row.go_home_latest,
              goHomeWeeks: row.go_home_weeks,
            }
          : null,
      );
      setHasPuppy(((dogIds ?? []) as string[]).length > 0);
      setOnWaitlist((waitRows ?? []).length > 0);
    } catch (e) {
      console.error('[useCommittedBreeding]', e);
      setParents([]);
      setLitter(null);
    } finally {
      setLoading(false);
    }
  }, [userId, forUserId, sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { parents, litter, hasPuppy, onWaitlist, loading, refresh };
}
