import type { DocumentEntityType } from '@/lib/documents/constants';
import { requireSupabase } from '@/lib/supabase';

/** Stored on `documents.category`. Never a display label. */
export const DOCUMENT_CATEGORY_KEYS = {
  applicationSupportingDoc: 'application_supporting_doc',
  proofOfPayment: 'proof_of_payment',
  microchip: 'microchip',
  other: 'other',
  healthCertificate: 'health_certificate',
  vaccinationRecord: 'vaccination_record',
} as const;

export type DocumentCategoryRow = {
  key: string;
  label: string;
  entity_types: string[];
  sort_order: number;
  is_active: boolean;
};

export type DocumentCategoryOption = {
  key: string;
  label: string;
};

let cache: DocumentCategoryRow[] | null = null;
let inflight: Promise<DocumentCategoryRow[]> | null = null;

export async function fetchDocumentCategories(): Promise<DocumentCategoryRow[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('document_categories')
      .select('key, label, entity_types, sort_order, is_active')
      .order('sort_order', { ascending: true });
    if (error) throw new Error(error.message);
    cache = (data ?? []) as DocumentCategoryRow[];
    return cache;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function categoriesForEntity(
  entityType: DocumentEntityType | string,
  rows: DocumentCategoryRow[],
): DocumentCategoryOption[] {
  return rows
    .filter((r) => r.is_active && r.entity_types.includes(entityType))
    .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label))
    .map((r) => ({ key: r.key, label: r.label }));
}

export function labelForCategory(key: string, rows: DocumentCategoryRow[] | null): string {
  return rows?.find((r) => r.key === key)?.label ?? key;
}

export async function categoriesForEntityFromDb(
  entityType: DocumentEntityType | string,
): Promise<DocumentCategoryOption[]> {
  const rows = await fetchDocumentCategories();
  return categoriesForEntity(entityType, rows);
}
