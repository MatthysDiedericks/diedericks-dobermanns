import { useCallback, useEffect, useState } from 'react';

import {
  deleteStorageObjects,
  storagePathFromPublicUrl,
} from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { DogMedia } from '@/types/app.types';

const SELECT =
  'id, dog_id, url, thumbnail_url, type, is_primary, sort_order, caption, uploaded_at, is_public, uploaded_by, client_consent, approved_by, approved_at';

export type ManagedDogMedia = DogMedia & {
  is_public: boolean;
  client_consent: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
  uploader_is_client: boolean;
};

function pathsOf(item: ManagedDogMedia): string[] {
  return [item.url, item.thumbnail_url]
    .filter(Boolean)
    .map((url) => storagePathFromPublicUrl(url!))
    .filter((p): p is string => p != null);
}

export function useManagedDogMedia(dogId: string | null) {
  const profile = useAuthStore((s) => s.profile);
  const [media, setMedia] = useState<ManagedDogMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!supabase) {
      setMedia([]);
      setLoading(false);
      return;
    }
    let q = supabase.from('dog_media').select(SELECT).order('sort_order', { ascending: true });
    if (dogId) q = q.eq('dog_id', dogId);
    const { data, error: qErr } = await q;
    if (qErr) {
      setError(qErr.message);
      setMedia([]);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as Omit<ManagedDogMedia, 'uploader_is_client'>[];
    const uploaderIds = [...new Set(rows.map((r) => r.uploaded_by).filter(Boolean))] as string[];
    const clientIds = new Set<string>();
    if (uploaderIds.length > 0) {
      const { data: users } = await supabase.from('users').select('id, role').in('id', uploaderIds);
      for (const u of users ?? []) {
        if (u.role === 'client') clientIds.add(u.id);
      }
    }
    setMedia(
      rows.map((r) => ({
        ...r,
        uploader_is_client: !!r.uploaded_by && clientIds.has(r.uploaded_by),
      })),
    );
    setLoading(false);
  }, [dogId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setPublic = useCallback(
    async (id: string, isPublic: boolean, confirmNoConsent = false) => {
      if (!supabase) throw new Error('Unavailable.');
      const item = media.find((m) => m.id === id);
      if (isPublic && item?.uploader_is_client && item.client_consent === false && !confirmNoConsent) {
        throw new Error('consent_required');
      }
      const patch: Record<string, unknown> = { is_public: isPublic };
      if (isPublic && profile?.id) {
        patch.approved_by = profile.id;
        patch.approved_at = new Date().toISOString();
      }
      const { error: err } = await supabase.from('dog_media').update(patch).eq('id', id);
      if (err) throw new Error(err.message);
      await load();
    },
    [load, media, profile?.id],
  );

  const bulkSetPublic = useCallback(
    async (ids: string[], isPublic: boolean) => {
      if (!supabase) throw new Error('Unavailable.');
      if (isPublic && media.some((m) => ids.includes(m.id) && m.uploader_is_client && m.client_consent === false)) {
        throw new Error('One or more selected photos need owner consent. Show them one at a time.');
      }
      const patch: Record<string, unknown> = { is_public: isPublic };
      if (isPublic && profile?.id) {
        patch.approved_by = profile.id;
        patch.approved_at = new Date().toISOString();
      }
      const { error: err } = await supabase.from('dog_media').update(patch).in('id', ids);
      if (err) throw new Error(err.message);
      await load();
    },
    [load, media, profile?.id],
  );

  const setCover = useCallback(
    async (id: string, ownerDogId: string) => {
      if (!supabase) throw new Error('Unavailable.');
      await supabase.from('dog_media').update({ is_primary: false }).eq('dog_id', ownerDogId);
      const { error: err } = await supabase.from('dog_media').update({ is_primary: true }).eq('id', id);
      if (err) throw new Error(err.message);
      await load();
    },
    [load],
  );

  const updateCaption = useCallback(
    async (id: string, caption: string) => {
      if (!supabase) throw new Error('Unavailable.');
      const { error: err } = await supabase
        .from('dog_media')
        .update({ caption: caption.trim() || null })
        .eq('id', id);
      if (err) throw new Error(err.message);
      await load();
    },
    [load],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!supabase) throw new Error('Unavailable.');
      const item = media.find((m) => m.id === id);
      if (!item) return;
      const { error: storageErr } = await deleteStorageObjects('dog-media', pathsOf(item));
      if (storageErr) throw new Error(storageErr);
      const { error: dbErr } = await supabase.from('dog_media').delete().eq('id', id);
      if (dbErr) throw new Error(dbErr.message);
      await load();
    },
    [load, media],
  );

  const bulkRemove = useCallback(
    async (ids: string[]) => {
      for (const id of ids) await remove(id);
    },
    [remove],
  );

  const move = useCallback(
    async (id: string, direction: -1 | 1) => {
      if (!supabase) throw new Error('Unavailable.');
      const ordered = [...media].sort((a, b) => a.sort_order - b.sort_order);
      const index = ordered.findIndex((m) => m.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= ordered.length) return;
      const ids = ordered.map((m) => m.id);
      [ids[index], ids[target]] = [ids[target], ids[index]];
      for (const [i, rowId] of ids.entries()) {
        const { error: err } = await supabase.from('dog_media').update({ sort_order: i + 1000 }).eq('id', rowId);
        if (err) throw new Error(err.message);
      }
      for (const [i, rowId] of ids.entries()) {
        const { error: err } = await supabase.from('dog_media').update({ sort_order: i }).eq('id', rowId);
        if (err) throw new Error(err.message);
      }
      await load();
    },
    [load, media],
  );

  return {
    media,
    loading,
    error,
    refresh: load,
    setPublic,
    bulkSetPublic,
    setCover,
    updateCaption,
    remove,
    bulkRemove,
    move,
  };
}
