const MONEY_FIELDS = new Set([
  'price',
  'amount',
  'total',
  'subtotal',
  'tax',
  'vat',
  'deposit',
  'balance',
  'unit_price',
  'line_total',
  'paid_amount',
  'discount',
  'fee',
]);

function isMoneyField(field: string): boolean {
  if (MONEY_FIELDS.has(field)) return true;
  return /(_price|_amount|_total|price|amount|total)$/i.test(field);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 2,
  }).format(value);
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function formatAuditValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') {
    return isMoneyField(field) ? formatMoney(value) : String(value);
  }
  if (typeof value === 'string') {
    if (value === '') return '(empty)';
    if (isMoneyField(field) && /^-?\d+(\.\d+)?$/.test(value)) {
      return formatMoney(Number(value));
    }
    return value.length > 80 ? `${value.slice(0, 77)}…` : value;
  }
  try {
    const s = JSON.stringify(value);
    return s.length > 80 ? `${s.slice(0, 77)}…` : s;
  } catch {
    return String(value);
  }
}

export function fieldDiff(
  field: string,
  oldValues: unknown,
  newValues: unknown,
): { from: string; to: string } {
  const oldObj = asObject(oldValues);
  const newObj = asObject(newValues);
  return {
    from: formatAuditValue(field, oldObj?.[field] ?? null),
    to: formatAuditValue(field, newObj?.[field] ?? null),
  };
}
