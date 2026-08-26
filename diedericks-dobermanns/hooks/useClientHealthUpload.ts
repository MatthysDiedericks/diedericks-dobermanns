import { useCallback, useEffect, useState } from 'react';

import { fileTypeFromName, MAX_DOCUMENT_BYTES } from '@/lib/documents/constants';
import { clientUploadStatusLine } from '@/lib/portal/healthUploads';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export type ClientHealthUpload = {
  id: string;
  entity_id: string;
  document_name: string;
  category: string;
  review_status: string | null;
  review_note: string | null;
  uploaded_at: string;
};

export { clientUploadStatusLine };

/** This client's own vet paperwork, scoped by uploaded_by. */
export function useClientHealthUploads() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [uploads, setUploads] = useState<ClientHealthUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setUploads([]);
      return;
    }
    const client = requireSupabase();
    const { data, error: err } = await client
      .from('documents')
      .select('id, entity_id, document_name, category, review_status, review_note, uploaded_at')
      .eq('entity_type', 'health')
      .eq('provided_by', 'client')
      .eq('uploaded_by', userId)
      .order('uploaded_at', { ascending: false });
    if (err) {
      setError(err.message);
      setUploads([]);
      return;
    }
    setUploads((data ?? []) as ClientHealthUpload[]);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upload = useCallback(
    async (input: {
      dogId: string;
      category: string;
      uri: string;
      name: string;
      mimeType: string;
    }) => {
      if (!userId) return { error: 'Not signed in.' };
      setUploading(true);
      setError(null);
      try {
        const client = requireSupabase();
        const response = await fetch(input.uri);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
          return { error: 'That photo is over 10 MB — please take a closer crop.' };
        }
        const { prepareUpload } = await import('@/lib/uploads/prepare');
        const prepared = prepareUpload(bytes, `${userId}/health/${input.dogId}`);
        const { error: upErr } = await client.storage.from('documents').upload(prepared.path, prepared.bytes, {
          contentType: prepared.mime,
          upsert: false,
        });
        if (upErr) return { error: upErr.message };
        const { error: insErr } = await client.from('documents').insert({
          entity_type: 'health',
          entity_id: input.dogId,
          document_name: input.name.replace(/\.[^.]+$/, '') || 'Vet paperwork',
          original_filename: prepared.path.split('/').pop() ?? 'vet-paper',
          storage_path: prepared.path,
          file_type: fileTypeFromName(prepared.path),
          file_size_bytes: prepared.bytes.byteLength,
          mime_type: prepared.mime,
          category: input.category,
          client_visible: true,
          is_public: false,
          uploaded_by: userId,
          review_status: 'pending',
          provided_by: 'client',
        } as never);
        if (insErr) return { error: insErr.message };
        await refresh();
        return {};
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Upload failed';
        setError(message);
        return { error: message };
      } finally {
        setUploading(false);
      }
    },
    [userId, refresh],
  );

  return { uploads, uploading, error, refresh, upload };
}
