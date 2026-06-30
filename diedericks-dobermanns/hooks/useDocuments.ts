import { addDays, differenceInDays, format, parseISO } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DOCUMENT_SELECT,
  type DocumentEntityType,
  fileTypeFromName,
  MAX_DOCUMENT_BYTES,
} from '@/lib/documents/constants';
import { PORTAL_CATEGORY_GROUPS, buildCategoryGroupMap } from '@/lib/documents/portalCategories';
import type { DocumentRecord, DocumentUploadMetadata, PickedDocumentFile } from '@/lib/documents/types';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { TablesInsert, TablesUpdate } from '@/types/database.types';

const BUCKET = 'documents';

async function currentUserId(): Promise<string | null> {
  const supabase = requireSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? useAuthStore.getState().profile?.id ?? null;
}

async function logAccess(documentId: string, action: 'view' | 'download' | 'export') {
  const supabase = requireSupabase();
  const uid = await currentUserId();
  if (!uid) return;
  await supabase.from('document_access_log').insert({
    document_id: documentId,
    accessed_by: uid,
    action,
  });
}

function mapRow(row: Record<string, unknown>): DocumentRecord {
  return row as unknown as DocumentRecord;
}

export function useDocumentsForEntity(entityType: DocumentEntityType, entityId: string) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!entityId) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data, error: err } = await supabase
        .from('documents')
        .select(DOCUMENT_SELECT)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('uploaded_at', { ascending: false });
      if (err) throw new Error(err.message);
      setDocuments((data ?? []).map((r) => mapRow(r as Record<string, unknown>)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load documents');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { documents, loading, error, refresh };
}

export function useDocument(id: string) {
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setDocument(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data, error: err } = await supabase
        .from('documents')
        .select(DOCUMENT_SELECT)
        .eq('id', id)
        .maybeSingle();
      if (err) throw new Error(err.message);
      setDocument(data ? mapRow(data as Record<string, unknown>) : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load document');
      setDocument(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { document, loading, error, refresh };
}

export function useUploadDocument(entityType: DocumentEntityType, entityId: string) {
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(
    async (file: PickedDocumentFile, metadata: Omit<DocumentUploadMetadata, 'entityType' | 'entityId'>) => {
      if (file.size > MAX_DOCUMENT_BYTES) {
        throw new Error('File exceeds 20MB limit');
      }
      setUploading(true);
      try {
        const supabase = requireSupabase();
        const uid = await currentUserId();
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${entityType}/${entityId}/${timestamp}_${safeName}`;

        const response = await fetch(file.uri);
        const arrayBuffer = await response.arrayBuffer();

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, arrayBuffer, {
            contentType: file.mimeType,
            upsert: false,
          });
        if (uploadError) throw new Error(uploadError.message);

        const payload: TablesInsert<'documents'> = {
          entity_type: entityType,
          entity_id: entityId,
          document_name: metadata.name,
          original_filename: file.name,
          storage_path: storagePath,
          file_type: fileTypeFromName(file.name),
          file_size_bytes: file.size,
          mime_type: file.mimeType,
          category: metadata.category,
          date_of_document: metadata.dateOfDocument ?? null,
          expiry_date: metadata.expiryDate ?? null,
          document_number: metadata.documentNumber ?? null,
          issued_by: metadata.issuedBy ?? null,
          description: metadata.description ?? null,
          client_visible: metadata.clientVisible ?? false,
          is_public: metadata.isPublic ?? false,
          allowed_user_ids: metadata.allowedUserIds ?? null,
          uploaded_by: uid,
        };

        const { data, error } = await supabase.from('documents').insert(payload).select(DOCUMENT_SELECT).single();
        if (error) throw new Error(error.message);
        return mapRow(data as Record<string, unknown>);
      } finally {
        setUploading(false);
      }
    },
    [entityType, entityId],
  );

  return { upload, uploading };
}

export function useDeleteDocument() {
  const [deleting, setDeleting] = useState(false);

  const remove = useCallback(async (doc: DocumentRecord) => {
    setDeleting(true);
    try {
      const supabase = requireSupabase();
      if (doc.storage_path) {
        await supabase.storage.from(BUCKET).remove([doc.storage_path]);
      }
      const { error } = await supabase.from('documents').delete().eq('id', doc.id);
      if (error) throw new Error(error.message);
    } finally {
      setDeleting(false);
    }
  }, []);

  return { remove, deleting };
}

export function useUpdateDocument() {
  const [updating, setUpdating] = useState(false);

  const update = useCallback(async (id: string, patch: TablesUpdate<'documents'>) => {
    setUpdating(true);
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from('documents')
        .update(patch)
        .eq('id', id)
        .select(DOCUMENT_SELECT)
        .single();
      if (error) throw new Error(error.message);
      return mapRow(data as Record<string, unknown>);
    } finally {
      setUpdating(false);
    }
  }, []);

  return { update, updating };
}

export function useGetSignedUrl() {
  const getSignedUrl = useCallback(
    async (doc: DocumentRecord, action: 'view' | 'download' | 'export' = 'view') => {
      const supabase = requireSupabase();
      await logAccess(doc.id, action);
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.storage_path, 3600);
      if (error) throw new Error(error.message);
      return data.signedUrl;
    },
    [],
  );

  return { getSignedUrl };
}

export function useShareDocument() {
  const { update, updating } = useUpdateDocument();

  const share = useCallback(
    async (documentId: string, userIds: string[]) => {
      return update(documentId, { allowed_user_ids: userIds });
    },
    [update],
  );

  return { share, updating };
}

export interface AllDocumentsFilters {
  entityType?: DocumentEntityType | 'all';
  category?: string;
  search?: string;
  sort?: 'uploaded_desc' | 'uploaded_asc' | 'name_asc' | 'expiry_asc';
}

export function useAllDocuments(filters: AllDocumentsFilters = {}) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      let q = supabase.from('documents').select(DOCUMENT_SELECT);

      if (filters.entityType && filters.entityType !== 'all') {
        q = q.eq('entity_type', filters.entityType);
      }
      if (filters.category && filters.category !== 'all') {
        q = q.eq('category', filters.category);
      }

      const sort = filters.sort ?? 'uploaded_desc';
      if (sort === 'uploaded_asc') q = q.order('uploaded_at', { ascending: true });
      else if (sort === 'name_asc') q = q.order('document_name', { ascending: true });
      else if (sort === 'expiry_asc') q = q.order('expiry_date', { ascending: true, nullsFirst: false });
      else q = q.order('uploaded_at', { ascending: false });

      const { data, error: err } = await q;
      if (err) throw new Error(err.message);

      let list = (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
      const s = filters.search?.trim().toLowerCase();
      if (s) {
        list = list.filter(
          (d) =>
            d.document_name.toLowerCase().includes(s) ||
            d.original_filename.toLowerCase().includes(s) ||
            d.category.toLowerCase().includes(s),
        );
      }
      setDocuments(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load documents');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [filters.entityType, filters.category, filters.search, filters.sort]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { documents, loading, error, refresh };
}

export function useExpiringDocuments(withinDays = 60, limit = 5) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const today = format(new Date(), 'yyyy-MM-dd');
      const end = format(addDays(new Date(), withinDays), 'yyyy-MM-dd');
      const { data, error: queryError } = await supabase
        .from('documents')
        .select(DOCUMENT_SELECT)
        .not('expiry_date', 'is', null)
        .gte('expiry_date', today)
        .lte('expiry_date', end)
        .order('expiry_date', { ascending: true })
        .limit(limit);
      if (queryError) throw new Error(queryError.message);
      setDocuments((data ?? []).map((r) => mapRow(r as Record<string, unknown>)));
    } catch (e) {
      setDocuments([]);
      setError(e instanceof Error ? e.message : 'Failed to load expiring documents');
    } finally {
      setLoading(false);
    }
  }, [withinDays, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { documents, loading, error, refresh };
}

export interface ExpiringDogDocument {
  documentId: string;
  documentName: string;
  category: string;
  expiryDate: string;
  daysRemaining: number;
  dogId: string;
  dogName: string;
  isOverdue: boolean;
}

export function useExpiringDogDocuments(withinDays = 90) {
  const [items, setItems] = useState<ExpiringDogDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = requireSupabase();
      const future = format(addDays(new Date(), withinDays), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('documents')
        .select('id, document_name, category, expiry_date, entity_id')
        .eq('entity_type', 'dog')
        .not('expiry_date', 'is', null)
        .lte('expiry_date', future)
        .order('expiry_date', { ascending: true })
        .limit(20);

      if (error) throw error;

      const rows = data ?? [];
      const dogIds = [...new Set(rows.map((r) => r.entity_id))];
      const dogNameById = new Map<string, string>();

      if (dogIds.length > 0) {
        const { data: dogs, error: dogErr } = await supabase
          .from('dogs')
          .select('id, name')
          .in('id', dogIds);
        if (dogErr) throw dogErr;
        (dogs ?? []).forEach((d) => dogNameById.set(d.id, d.name));
      }

      const todayDate = new Date();
      const mapped: ExpiringDogDocument[] = rows.map((r) => {
        const expiry = parseISO(r.expiry_date!);
        const days = differenceInDays(expiry, todayDate);
        return {
          documentId: r.id,
          documentName: r.document_name,
          category: r.category,
          expiryDate: r.expiry_date!,
          daysRemaining: days,
          dogId: r.entity_id,
          dogName: dogNameById.get(r.entity_id) ?? 'Unknown dog',
          isOverdue: days < 0,
        };
      });

      setItems(mapped);
    } catch (e) {
      console.error('[useExpiringDogDocuments]', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [withinDays]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, refresh };
}

export function useClientPortalDocuments() {
  const profile = useAuthStore((s) => s.profile);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profile?.id) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data, error: err } = await supabase
        .from('documents')
        .select(DOCUMENT_SELECT)
        .or(`client_visible.eq.true,allowed_user_ids.cs.{${profile.id}}`)
        .order('uploaded_at', { ascending: false });
      if (err) throw new Error(err.message);
      setDocuments((data ?? []).map((r) => mapRow(r as Record<string, unknown>)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load documents');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { documents, loading, error, refresh };
}

export interface GroupedDocuments {
  groupId: string;
  label: string;
  icon: string;
  description: string;
  documents: DocumentRecord[];
  count: number;
}

export function useClientPortalDocumentsByCategory() {
  const { documents, loading, error, refresh } = useClientPortalDocuments();

  const grouped = useMemo(() => {
    if (documents.length === 0) return [];

    const categoryGroupMap = buildCategoryGroupMap();
    const groupMap = new Map<string, DocumentRecord[]>();

    for (const doc of documents) {
      const groupId = categoryGroupMap[doc.category] ?? 'other';
      if (!groupMap.has(groupId)) groupMap.set(groupId, []);
      groupMap.get(groupId)!.push(doc);
    }

    const result: GroupedDocuments[] = [];

    for (const group of PORTAL_CATEGORY_GROUPS) {
      const docs = groupMap.get(group.id) ?? [];
      if (docs.length > 0) {
        result.push({
          groupId: group.id,
          label: group.label,
          icon: group.icon,
          description: group.description,
          documents: docs.sort(
            (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
          ),
          count: docs.length,
        });
      }
    }

    const other = groupMap.get('other') ?? [];
    if (other.length > 0) {
      result.push({
        groupId: 'other',
        label: 'Other',
        icon: 'folder-outline',
        description: 'Additional documents',
        documents: other.sort(
          (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
        ),
        count: other.length,
      });
    }

    return result;
  }, [documents]);

  const totalCount = documents.length;

  return { grouped, totalCount, loading, error, refresh };
}

/** @deprecated Use useAllDocuments with entity_type filter */
export function useKennelDocuments() {
  return useAllDocuments({ entityType: 'kennel' });
}

/** @deprecated Use useAllDocuments */
export function useDocuments(category = 'all', search = '') {
  return useAllDocuments({
    category: category === 'all' ? undefined : category,
    search,
  });
}
