import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

import { requireSupabase } from '@/lib/supabase';
import type { ExpenseCategory, ImportRow } from '@/types/finance';

const FALLBACK_NAMES = ['other', 'uncategorised', 'uncategorized'];

function cellStr(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function cellNum(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Parses YYYY-MM-DD or DD/MM/YYYY (and Excel serial dates). */
export function parseImportDate(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (!parsed) return null;
    const y = parsed.y;
    const m = String(parsed.m).padStart(2, '0');
    const d = String(parsed.d).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, dd, mm, yyyy] = slash;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) {
    return dt.toISOString().slice(0, 10);
  }
  return null;
}

export function matchCategory(raw: string, categories: ExpenseCategory[]): {
  categoryId: string;
  categoryName: string;
} {
  const q = raw.trim().toLowerCase();
  if (q) {
    const exact = categories.find((c) => c.name.toLowerCase() === q);
    if (exact) return { categoryId: exact.id, categoryName: exact.name };
    const partial = categories.find(
      (c) => c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase()),
    );
    if (partial) return { categoryId: partial.id, categoryName: partial.name };
  }
  const fallback =
    categories.find((c) => FALLBACK_NAMES.includes(c.name.toLowerCase())) ?? categories[0];
  return { categoryId: fallback?.id ?? '', categoryName: fallback?.name ?? 'Other' };
}

export function parseImportRows(rows: unknown[][], categories: ExpenseCategory[]): ImportRow[] {
  return rows
    .filter((row) => row.some((cell) => cell != null && String(cell).trim() !== ''))
    .map((row) => {
      const date = parseImportDate(row[0]);
      const description = cellStr(row[1]);
      const amount = cellNum(row[2]);
      const rawCategory = cellStr(row[3]);
      const supplier = cellStr(row[4]) || null;
      const notes = cellStr(row[5]) || null;
      const { categoryId, categoryName } = matchCategory(rawCategory, categories);

      let valid = true;
      let error: string | undefined;
      if (!date) {
        valid = false;
        error = 'Invalid date';
      } else if (amount == null || amount <= 0) {
        valid = false;
        error = amount != null && amount <= 0 ? 'Amount must be positive' : 'Invalid amount';
      } else if (!description) {
        valid = false;
        error = 'Description required';
      } else if (!categoryId) {
        valid = false;
        error = 'No category available';
      }

      return {
        date: date ?? '',
        description,
        amount: amount ?? 0,
        rawCategory,
        categoryId: valid ? categoryId : categoryId || null,
        categoryName,
        supplier,
        notes,
        valid,
        error,
        unmatchedCategory: Boolean(rawCategory && !categories.some((c) => c.name.toLowerCase() === rawCategory.toLowerCase())),
      };
    });
}

export async function parseExcelFile(uri: string): Promise<unknown[][]> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const wb = XLSX.read(base64, { type: 'base64' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][];
}

export async function downloadImportTemplate(): Promise<void> {
  const wb = XLSX.utils.book_new();
  const data = [
    ['Date', 'Description', 'Amount', 'Category', 'Supplier', 'Notes'],
    ['2026-01-05', 'Feed - Premium Puppy', 3200, 'Feed', 'Pet Supply Co', 'Monthly order'],
    ['2026-01-12', 'Vet consultation', 850, 'Veterinary', 'Dr Smith', ''],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Expenses');
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const fileUri = `${FileSystem.cacheDirectory}DD_Expense_Import_Template.xlsx`;
  await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: FileSystem.EncodingType.Base64 });
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Expense import template',
  });
}

export async function bulkImportExpenses(rows: ImportRow[], createdBy: string | null): Promise<number> {
  const valid = rows.filter((r) => r.valid && r.categoryId);
  if (valid.length === 0) return 0;
  const sb = requireSupabase();
  const payload = valid.map((r) => ({
    category_id: r.categoryId!,
    description: r.description,
    amount: r.amount,
    price_excl_vat: r.amount,
    vat_applicable: false,
    vat_rate: 0,
    vat_amount: 0,
    allocation_type: 'general' as const,
    expense_date: r.date,
    supplier_name: r.supplier,
    notes: r.notes,
    is_recurring: false,
    recorded_by: createdBy,
  }));
  const { error } = await sb.from('expenses').insert(payload);
  if (error) throw new Error(error.message);
  return valid.length;
}
