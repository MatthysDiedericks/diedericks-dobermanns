import { deleteStorageObjects, storagePathFromPublicUrl } from '@/lib/storage';
import { getCachedUser } from '@/lib/auth/getCachedUser';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export type PendingMediaItem = {
  id: string;
  dog_id: string;
  dog_name: string;
  type: string;
  url: string;
  thumbnail_url: string | null;
  caption: string | null;
  uploaded_at: string;
  uploaded_by: string | null;
  uploader_name: string | null;
  uploader_is_client: boolean;
  client_consent: boolean;
};

const PENDING_FILTER = { is_public: false, approved_at: null } as const;

async function currentUserId(): Promise<string> {
  const user = await getCachedUser();
  const id = user?.id ?? useAuthStore.getState().profile?.id ?? null;
  if (!id) throw new Error('Not signed in.');
  return id;
}

export async function fetchPendingMedia(): Promise<PendingMediaItem[]> {
  const supabase = requireSupabase();
  const { data: media, error } = await supabase
    .from('dog_media')
    .select('id, dog_id, type, url, thumbnail_url, caption, uploaded_at, uploaded_by, client_consent')
    .eq('is_public', PENDING_FILTER.is_public)
    .is('approved_at', PENDING_FILTER.approved_at)
    .order('uploaded_at', { ascending: false });
  if (error) throw new Error(error.message);
  if (!media || media.length === 0) return [];

  const dogIds = [...new Set(media.map((m) => m.dog_id))];
  const uploaderIds = [
    ...new Set(media.map((m) => m.uploaded_by).filter((id): id is string => Boolean(id))),
  ];

  const [{ data: dogs }, { data: uploaders }] = await Promise.all([
    supabase.from('dogs').select('id, name').in('id', dogIds),
    uploaderIds.length > 0
      ? supabase.from('users').select('id, full_name, email, role').in('id', uploaderIds)
      : Promise.resolve({
          data: [] as { id: string; full_name: string | null; email: string | null; role: string }[],
        }),
  ]);

  const dogNameById = new Map((dogs ?? []).map((d) => [d.id, d.name]));
  const uploaderById = new Map((uploaders ?? []).map((u) => [u.id, u]));

  return media.map((m) => {
    const uploader = m.uploaded_by ? uploaderById.get(m.uploaded_by) : undefined;
    return {
      id: m.id,
      dog_id: m.dog_id,
      dog_name: dogNameById.get(m.dog_id) ?? 'Unknown dog',
      type: m.type,
      url: m.url,
      thumbnail_url: m.thumbnail_url,
      caption: m.caption,
      uploaded_at: m.uploaded_at,
      uploaded_by: m.uploaded_by,
      uploader_name: uploader?.full_name ?? uploader?.email ?? null,
      uploader_is_client: uploader?.role === 'client',
      client_consent: m.client_consent,
    };
  });
}

export async function countPendingMedia(): Promise<number> {
  const supabase = requireSupabase();
  const { count, error } = await supabase
    .from('dog_media')
    .select('id', { count: 'exact', head: true })
    .eq('is_public', PENDING_FILTER.is_public)
    .is('approved_at', PENDING_FILTER.approved_at);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function markReviewed(id: string, isPublic: boolean): Promise<{ error?: string }> {
  const supabase = requireSupabase();
  const userId = await currentUserId();
  const { error } = await supabase
    .from('dog_media')
    .update({
      is_public: isPublic,
      client_consent: isPublic,
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { error: error.message };
  return {};
}

export async function publishDogMedia(id: string): Promise<{ error?: string }> {
  return markReviewed(id, true);
}

export async function keepDogMediaPrivate(id: string): Promise<{ error?: string }> {
  return markReviewed(id, false);
}

export async function deletePendingDogMedia(
  id: string,
  url: string,
  thumbnailUrl: string | null,
): Promise<{ error?: string }> {
  const paths = [url, thumbnailUrl]
    .filter((u): u is string => Boolean(u))
    .map((u) => storagePathFromPublicUrl(u) ?? u.split('/dog-media/')[1] ?? null)
    .filter((p): p is string => Boolean(p));
  const storageErr = await deleteStorageObjects('dog-media', paths);
  if (storageErr.error) return { error: storageErr.error };
  const supabase = requireSupabase();
  const { error } = await supabase.from('dog_media').delete().eq('id', id);
  if (error) return { error: error.message };
  return {};
}
