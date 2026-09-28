/**
 * On-screen expiry alerts. One resolver for the dashboard banner and the
 * header bell. Does not send email — the daily document check already does.
 *
 * Lead times are read from app_settings. Documents default to 30 days because
 * a kennel registration cannot be renewed in a week. Every other kind
 * defaults to the seeded value below, and to `withinDays` (7) when a kind
 * has neither a setting nor a seed.
 *
 * Todos and invoices are deliberately absent.
 *
 * The app repo keeps a copy of this file. Only ALERT_SURFACE and
 * openAlertClient differ.
 */

import { attentionHeadline, attentionText, duePhrase } from './phrases';
import {
  EXPIRING_KINDS,
  LEAD_SETTING_KEY,
  SEEDED_LEAD_DAYS,
  type ExpiringKind,
} from './leadDays';

export { attentionHeadline, attentionText, duePhrase };
export { EXPIRING_KINDS, LEAD_SETTING_KEY, SEEDED_LEAD_DAYS };
export type { ExpiringKind };

export type ExpiringItem = {
  kind: ExpiringKind;
  id: string;
  label: string;
  context: string | null;
  dueOn: string;
  daysLeft: number;
  href: string;
};

export type ExpiringCandidate = {
  kind: ExpiringKind;
  id: string;
  label: string;
  context: string | null;
  dueOn: string;
  href: string;
};

export type AlertDismissal = {
  itemKind: string;
  itemId: string;
  dismissedUntil: string;
};

export const DISMISS_FOR_DAYS = 7;

const OPEN_QUOTE_STATUSES = new Set(['draft', 'sent']);
const CLOSED_PAYABLE_STATUSES = new Set(['paid', 'void', 'cancelled']);

const ALERT_SURFACE: 'web' | 'app' = 'app';

type AlertFilter = PromiseLike<{
  data: Record<string, unknown>[] | null;
  error: { message: string } | null;
}> & {
  eq: (column: string, value: unknown) => AlertFilter;
  in: (column: string, values: readonly string[]) => AlertFilter;
  is: (column: string, value: null) => AlertFilter;
  not: (column: string, op: string, value: unknown) => AlertFilter;
  lte: (column: string, value: string) => AlertFilter;
  limit: (count: number) => AlertFilter;
};

type AlertClient = {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null } }>;
  };
  from: (table: string) => {
    select: (columns: string) => AlertFilter;
    upsert: (
      values: Record<string, unknown>,
      options: { onConflict: string },
    ) => Promise<{ error: { message: string } | null }>;
  };
};

async function openAlertClient(): Promise<AlertClient> {
  const { requireSupabase } = await import('@/lib/supabase');
  return requireSupabase() as unknown as AlertClient;
}

export function kennelToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function toKennelDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
  return kennelToday(parsed);
}

export function daysBetween(dueOn: string, today: string): number {
  const due = toKennelDate(dueOn);
  const now = today.slice(0, 10);
  const a = Date.UTC(+due.slice(0, 4), +due.slice(5, 7) - 1, +due.slice(8, 10));
  const b = Date.UTC(+now.slice(0, 4), +now.slice(5, 7) - 1, +now.slice(8, 10));
  return Math.round((a - b) / 86_400_000);
}

export function addCalendarDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function hasDueDate(value: string | null | undefined): value is string {
  return Boolean(value && value.trim());
}

export function resolveLeadDays(
  settings: Record<string, string | null | undefined>,
  withinDays = 7,
): Record<ExpiringKind, number> {
  const leads = {} as Record<ExpiringKind, number>;
  for (const kind of EXPIRING_KINDS) {
    const raw = settings[LEAD_SETTING_KEY[kind]];
    if (raw == null || String(raw).trim() === '') {
      leads[kind] = SEEDED_LEAD_DAYS[kind] ?? withinDays;
      continue;
    }
    const parsed = Number(String(raw).trim());
    leads[kind] = Number.isFinite(parsed) ? parsed : (SEEDED_LEAD_DAYS[kind] ?? withinDays);
  }
  return leads;
}

export function dismissalStillHides(dismissedUntil: string, today: string): boolean {
  return today.slice(0, 10) < dismissedUntil.slice(0, 10);
}

export function dismissUntil(today: string): string {
  return addCalendarDays(today, DISMISS_FOR_DAYS);
}

/** Overdue items cannot be dismissed. That is the case where the nagging is the point. */
export function dismissBlockReason(daysLeft: number): string | null {
  if (daysLeft < 0) return 'An overdue item cannot be dismissed.';
  return null;
}

export function selectExpiring(
  candidates: ExpiringCandidate[],
  options: {
    today: string;
    settings?: Record<string, string | null | undefined>;
    leadDays?: Partial<Record<ExpiringKind, number>>;
    withinDays?: number;
    dismissals?: AlertDismissal[];
  },
): ExpiringItem[] {
  const leads = options.leadDays
    ? { ...resolveLeadDays(options.settings ?? {}, options.withinDays ?? 7), ...options.leadDays }
    : resolveLeadDays(options.settings ?? {}, options.withinDays ?? 7);
  const hidden = new Set(
    (options.dismissals ?? [])
      .filter((row) => dismissalStillHides(row.dismissedUntil, options.today))
      .map((row) => `${row.itemKind}:${row.itemId}`),
  );

  const items: ExpiringItem[] = [];
  for (const candidate of candidates) {
    if (!hasDueDate(candidate.dueOn)) continue;
    const daysLeft = daysBetween(candidate.dueOn, options.today);
    const lead = leads[candidate.kind] ?? options.withinDays ?? 7;
    if (daysLeft > lead) continue;
    const overdue = daysLeft < 0;
    if (!overdue && hidden.has(`${candidate.kind}:${candidate.id}`)) continue;
    items.push({
      kind: candidate.kind,
      id: candidate.id,
      label: candidate.label,
      context: candidate.context,
      dueOn: toKennelDate(candidate.dueOn),
      daysLeft,
      href: candidate.href,
    });
  }

  items.sort((a, b) => a.daysLeft - b.daysLeft || a.label.localeCompare(b.label));
  return items;
}

export function hrefFor(
  surface: 'web' | 'app',
  kind: ExpiringKind,
  ref: { id: string; entityType?: string | null; entityId?: string | null; dogId?: string | null },
): string {
  const web = surface === 'web';
  if (kind === 'document') {
    const entity = ref.entityType ?? '';
    const entityId = ref.entityId ?? '';
    if ((entity === 'dog' || entity === 'puppy') && entityId) {
      return web ? `/admin/dogs/${entityId}` : `/(admin)/dogs/${entityId}`;
    }
    if (entity === 'litter' && entityId) {
      return web ? `/admin/litters/${entityId}` : `/(admin)/litters/${entityId}`;
    }
    if (entity === 'employee' && entityId) {
      return web ? `/admin/finance/employees/${entityId}` : `/(admin)/finance/employees/${entityId}`;
    }
    if ((entity === 'client' || entity === 'contact') && entityId) {
      return web ? `/admin/contacts/${entityId}` : `/(admin)/contacts/${entityId}`;
    }
    return web ? `/admin/documents/${ref.id}/open` : `/(admin)/documents`;
  }
  if (kind === 'vaccination' || kind === 'deworming') {
    const dogId = ref.dogId ?? '';
    return web ? `/admin/dogs/${dogId}` : `/(admin)/dogs/${dogId}`;
  }
  if (kind === 'contract') return web ? `/admin/contracts/${ref.id}` : `/(admin)/contracts/${ref.id}`;
  if (kind === 'invite') return web ? '/admin/invite' : '/(admin)/invite';
  if (kind === 'quote') return web ? `/admin/quotes/${ref.id}` : `/(admin)/quotes/${ref.id}`;
  return web ? '/admin/finance/expenses' : '/(admin)/finance/expenses';
}

function str(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

async function readRows(supabase: AlertClient, table: string, columns: string, apply: (query: AlertFilter) => AlertFilter): Promise<Record<string, unknown>[]> {
  try {
    const { data, error } = await apply(supabase.from(table).select(columns));
    if (error) {
      console.error(`[alerts] ${table}: ${error.message}`);
      return [];
    }
    return data ?? [];
  } catch (error) {
    console.error(`[alerts] ${table}`, error);
    return [];
  }
}

async function namesById(
  supabase: AlertClient,
  table: string,
  ids: string[],
  labelOf: (row: Record<string, unknown>) => string | null,
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const rows = await readRows(supabase, table, '*', (query) => query.in('id', unique));
  for (const row of rows) {
    const id = str(row, 'id');
    const label = labelOf(row);
    if (id && label) map.set(id, label);
  }
  return map;
}

function dogLabel(row: Record<string, unknown>): string | null {
  return str(row, 'call_name') ?? str(row, 'registered_name');
}

function latestPerGroup(
  rows: Record<string, unknown>[],
  dateKey: string,
  groupKey: string,
): Record<string, unknown>[] {
  const best = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const dogId = str(row, 'dog_id');
    if (!dogId) continue;
    const group = (str(row, groupKey) ?? '').toLowerCase();
    const key = `${dogId}::${group}`;
    const prev = best.get(key);
    const date = str(row, dateKey) ?? '';
    const prevDate = prev ? (str(prev, dateKey) ?? '') : '';
    if (!prev || date > prevDate) best.set(key, row);
  }
  return [...best.values()];
}

async function queryExpiringItems(
  supabase: AlertClient,
  surface: 'web' | 'app',
  withinDays: number,
): Promise<ExpiringItem[]> {
  const today = kennelToday();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;

  const [settingRows, dismissalRows] = await Promise.all([
    readRows(supabase, 'app_settings', 'key, value', (query) =>
      query.in('key', EXPIRING_KINDS.map((kind) => LEAD_SETTING_KEY[kind])),
    ),
    userId
      ? readRows(supabase, 'alert_dismissals', 'item_kind, item_id, dismissed_until', (query) =>
          query.eq('user_id', userId),
        )
      : Promise.resolve([]),
  ]);

  const settings: Record<string, string | null> = {};
  for (const row of settingRows) {
    const key = str(row, 'key');
    if (key) settings[key] = str(row, 'value');
  }
  const leads = resolveLeadDays(settings, withinDays);
  const horizon = addCalendarDays(today, Math.max(...Object.values(leads), withinDays));
  const horizonStamp = `${horizon}T23:59:59.999+02:00`;

  const [documents, vaccinations, deworming, contracts, invites, quotes, expenses] = await Promise.all([
    readRows(
      supabase,
      'documents',
      'id, document_name, entity_type, entity_id, expiry_date',
      (query) => query.not('expiry_date', 'is', null).lte('expiry_date', horizon),
    ),
    readRows(
      supabase,
      'vaccinations',
      'id, dog_id, vaccine_name, date_administered, next_due_date',
      (query) => query.not('dog_id', 'is', null),
    ),
    readRows(
      supabase,
      'deworming_records',
      'id, dog_id, product_name, treatment_date, next_due_date',
      (query) => query.not('dog_id', 'is', null),
    ),
    readRows(
      supabase,
      'contracts',
      'id, contract_title, contract_number, dog_id, contact_id, esign_expires_at, signed_by_client, status',
      (query) => query.not('esign_expires_at', 'is', null).lte('esign_expires_at', horizonStamp),
    ),
    readRows(
      supabase,
      'portal_invites',
      'id, email, expires_at, code_redeemed_at, user_id',
      (query) => query.not('expires_at', 'is', null).lte('expires_at', horizonStamp),
    ),
    readRows(
      supabase,
      'quotes',
      'id, quote_number, status, valid_until, contact_id, historical_client_name',
      (query) => query.not('valid_until', 'is', null).lte('valid_until', horizon),
    ),
    readRows(
      supabase,
      'expenses',
      'id, description, creditor_name, supplier_name, dog_id, payable_due_date, payable_paid_date, is_payable, status',
      (query) => query.not('payable_due_date', 'is', null).lte('payable_due_date', horizon),
    ),
  ]);

  const dogIds = [
    ...vaccinations.map((row) => str(row, 'dog_id') ?? ''),
    ...deworming.map((row) => str(row, 'dog_id') ?? ''),
    ...contracts.map((row) => str(row, 'dog_id') ?? ''),
    ...expenses.map((row) => str(row, 'dog_id') ?? ''),
    ...documents
      .filter((row) => str(row, 'entity_type') === 'dog' || str(row, 'entity_type') === 'puppy')
      .map((row) => str(row, 'entity_id') ?? ''),
  ];
  const contactIds = [
    ...quotes.map((row) => str(row, 'contact_id') ?? ''),
    ...contracts.map((row) => str(row, 'contact_id') ?? ''),
    ...documents.filter((row) => str(row, 'entity_type') === 'client').map((row) => str(row, 'entity_id') ?? ''),
  ];
  const litterIds = documents
    .filter((row) => str(row, 'entity_type') === 'litter')
    .map((row) => str(row, 'entity_id') ?? '');
  const employeeIds = documents
    .filter((row) => str(row, 'entity_type') === 'employee')
    .map((row) => str(row, 'entity_id') ?? '');

  const [dogs, contacts, litters, employees] = await Promise.all([
    namesById(supabase, 'dogs', dogIds, dogLabel),
    namesById(supabase, 'contacts', contactIds, (row) => str(row, 'full_name')),
    namesById(supabase, 'litters', litterIds, (row) => str(row, 'name') ?? str(row, 'litter_letter')),
    namesById(supabase, 'employees', employeeIds, (row) => str(row, 'preferred_name') ?? str(row, 'full_name')),
  ]);

  const candidates: ExpiringCandidate[] = [];

  for (const row of documents) {
    const due = str(row, 'expiry_date');
    if (!hasDueDate(due)) continue;
    const id = str(row, 'id');
    if (!id) continue;
    const entityType = str(row, 'entity_type');
    const entityId = str(row, 'entity_id');
    let context: string | null = null;
    if (entityType === 'dog' || entityType === 'puppy') context = entityId ? (dogs.get(entityId) ?? null) : null;
    else if (entityType === 'litter') context = entityId ? (litters.get(entityId) ?? null) : null;
    else if (entityType === 'client') context = entityId ? (contacts.get(entityId) ?? null) : null;
    else if (entityType === 'employee') context = entityId ? (employees.get(entityId) ?? null) : null;
    else if (entityType === 'kennel') context = 'Kennel';
    candidates.push({
      kind: 'document',
      id,
      label: str(row, 'document_name') ?? 'Document',
      context,
      dueOn: due,
      href: hrefFor(surface, 'document', { id, entityType, entityId }),
    });
  }

  for (const row of latestPerGroup(vaccinations, 'date_administered', 'vaccine_name')) {
    const due = str(row, 'next_due_date');
    const id = str(row, 'id');
    const dogId = str(row, 'dog_id');
    if (!hasDueDate(due) || !id) continue;
    candidates.push({
      kind: 'vaccination',
      id,
      label: str(row, 'vaccine_name') ?? 'vaccination',
      context: dogId ? (dogs.get(dogId) ?? null) : null,
      dueOn: due,
      href: hrefFor(surface, 'vaccination', { id, dogId }),
    });
  }

  for (const row of latestPerGroup(deworming, 'treatment_date', 'product_name')) {
    const due = str(row, 'next_due_date');
    const id = str(row, 'id');
    const dogId = str(row, 'dog_id');
    if (!hasDueDate(due) || !id) continue;
    candidates.push({
      kind: 'deworming',
      id,
      label: str(row, 'product_name') ?? 'deworming',
      context: dogId ? (dogs.get(dogId) ?? null) : null,
      dueOn: due,
      href: hrefFor(surface, 'deworming', { id, dogId }),
    });
  }

  for (const row of contracts) {
    if (row.signed_by_client === true) continue;
    const status = (str(row, 'status') ?? '').toLowerCase();
    if (status === 'cancelled' || status === 'void' || status === 'signed') continue;
    const due = str(row, 'esign_expires_at');
    const id = str(row, 'id');
    if (!hasDueDate(due) || !id) continue;
    const dogId = str(row, 'dog_id');
    const contactId = str(row, 'contact_id');
    candidates.push({
      kind: 'contract',
      id,
      label: str(row, 'contract_title') ?? str(row, 'contract_number') ?? 'Contract signature',
      context: (dogId ? dogs.get(dogId) : null) ?? (contactId ? contacts.get(contactId) : null) ?? null,
      dueOn: due,
      href: hrefFor(surface, 'contract', { id }),
    });
  }

  for (const row of invites) {
    if (str(row, 'code_redeemed_at') || str(row, 'user_id')) continue;
    const due = str(row, 'expires_at');
    const id = str(row, 'id');
    if (!hasDueDate(due) || !id) continue;
    candidates.push({
      kind: 'invite',
      id,
      label: 'Portal invite',
      context: str(row, 'email'),
      dueOn: due,
      href: hrefFor(surface, 'invite', { id }),
    });
  }

  for (const row of quotes) {
    const status = (str(row, 'status') ?? '').toLowerCase();
    if (!OPEN_QUOTE_STATUSES.has(status)) continue;
    const due = str(row, 'valid_until');
    const id = str(row, 'id');
    if (!hasDueDate(due) || !id) continue;
    const contactId = str(row, 'contact_id');
    candidates.push({
      kind: 'quote',
      id,
      label: str(row, 'quote_number') ?? 'Quote',
      context: (contactId ? contacts.get(contactId) : null) ?? str(row, 'historical_client_name'),
      dueOn: due,
      href: hrefFor(surface, 'quote', { id }),
    });
  }

  for (const row of expenses) {
    if (row.is_payable === false) continue;
    if (str(row, 'payable_paid_date')) continue;
    const status = (str(row, 'status') ?? '').toLowerCase();
    if (CLOSED_PAYABLE_STATUSES.has(status)) continue;
    const due = str(row, 'payable_due_date');
    const id = str(row, 'id');
    if (!hasDueDate(due) || !id) continue;
    const dogId = str(row, 'dog_id');
    candidates.push({
      kind: 'payable',
      id,
      label: str(row, 'description') ?? str(row, 'creditor_name') ?? 'Payable',
      context: str(row, 'creditor_name') ?? str(row, 'supplier_name') ?? (dogId ? dogs.get(dogId) ?? null : null),
      dueOn: due,
      href: hrefFor(surface, 'payable', { id }),
    });
  }

  return selectExpiring(candidates, {
    today,
    leadDays: leads,
    withinDays,
    dismissals: dismissalRows.map((row) => ({
      itemKind: str(row, 'item_kind') ?? '',
      itemId: str(row, 'item_id') ?? '',
      dismissedUntil: str(row, 'dismissed_until') ?? '',
    })),
  });
}

export async function fetchExpiringItems(withinDays = 7): Promise<ExpiringItem[]> {
  const supabase = await openAlertClient();
  return queryExpiringItems(supabase, ALERT_SURFACE, withinDays);
}

const DUE_SOURCE: Record<ExpiringKind, { table: string; column: string }> = {
  document: { table: 'documents', column: 'expiry_date' },
  vaccination: { table: 'vaccinations', column: 'next_due_date' },
  deworming: { table: 'deworming_records', column: 'next_due_date' },
  contract: { table: 'contracts', column: 'esign_expires_at' },
  invite: { table: 'portal_invites', column: 'expires_at' },
  quote: { table: 'quotes', column: 'valid_until' },
  payable: { table: 'expenses', column: 'payable_due_date' },
};

export async function dismissExpiringItem(
  kind: ExpiringKind,
  id: string,
): Promise<{ error?: string }> {
  if (!EXPIRING_KINDS.includes(kind)) return { error: 'Unknown alert.' };
  const supabase = await openAlertClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { error: 'Sign in again to dismiss this.' };

  const source = DUE_SOURCE[kind];
  const { data, error } = await supabase
    .from(source.table)
    .select(`id, ${source.column}`)
    .eq('id', id)
    .limit(1);
  if (error) return { error: error.message };
  const due = data?.[0] ? str(data[0], source.column) : null;
  if (!hasDueDate(due)) return { error: 'This item has no due date.' };

  const daysLeft = daysBetween(due, kennelToday());
  const blocked = dismissBlockReason(daysLeft);
  if (blocked) return { error: blocked };

  const { error: writeError } = await supabase.from('alert_dismissals').upsert(
    {
      user_id: userId,
      item_kind: kind,
      item_id: id,
      dismissed_until: dismissUntil(kennelToday()),
    },
    { onConflict: 'user_id,item_kind,item_id' },
  );
  if (writeError) return { error: writeError.message };
  return {};
}
