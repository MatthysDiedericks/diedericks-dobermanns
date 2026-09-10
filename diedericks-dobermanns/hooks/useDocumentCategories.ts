import { useEffect, useState } from 'react';

import {
  categoriesForEntity,
  fetchDocumentCategories,
  labelForCategory,
  type DocumentCategoryOption,
  type DocumentCategoryRow,
} from '@/lib/documents/categories';
import type { DocumentEntityType } from '@/lib/documents/constants';

export function useDocumentCategories(entityType?: DocumentEntityType | string) {
  const [rows, setRows] = useState<DocumentCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDocumentCategories()
      .then((data) => {
        if (!cancelled) {
          setRows(data);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setRows([]);
          setError(e instanceof Error ? e.message : 'Could not load document categories.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories: DocumentCategoryOption[] = entityType
    ? categoriesForEntity(entityType, rows)
    : rows.filter((r) => r.is_active).map((r) => ({ key: r.key, label: r.label }));

  return { categories, rows, loading, error };
}

export function useCategoryLabel(key: string): string {
  const { rows } = useDocumentCategories();
  return labelForCategory(key, rows);
}
