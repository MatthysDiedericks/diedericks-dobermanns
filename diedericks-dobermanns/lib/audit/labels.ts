export const AUDIT_TABLES = [
  'quotes',
  'quote_items',
  'invoices',
  'invoice_items',
  'payments',
  'expenses',
  'pricing_tiers',
  'dogs',
  'litters',
  'reservations',
  'users',
  'contacts',
  'client_groups',
  'client_group_members',
  'applications',
  'waiting_list',
  'contracts',
  'contract_templates',
  'contract_clauses',
  'documents',
  'app_settings',
] as const;

export const AUDIT_ACTIONS = ['insert', 'update', 'delete'] as const;

export const EMPHASIZED_TABLES = new Set([
  'payments',
  'invoices',
  'quotes',
  'pricing_tiers',
  'contracts',
  'app_settings',
]);

export function humanize(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function actorLabel(
  actorId: string | null,
  actorEmail: string | null,
  actorRole: string | null,
  actorName?: string | null,
): { label: string; isSystem: boolean } {
  if (!actorId) {
    const origin =
      actorRole === 'service_role' ? 'service role' : 'migration or script';
    return { label: `System (${origin})`, isSystem: true };
  }
  if (actorName?.trim()) return { label: actorName.trim(), isSystem: false };
  if (actorEmail?.trim()) return { label: actorEmail.trim(), isSystem: false };
  return { label: 'Signed-in user', isSystem: false };
}

export function actionVerb(action: string): string {
  if (action === 'insert') return 'created';
  if (action === 'delete') return 'deleted';
  if (action === 'update') return 'changed';
  return action;
}

export function summarizeEntry(opts: {
  actor: string;
  action: string;
  fields: string[] | null;
  recordLabel: string;
}): string {
  const verb = actionVerb(opts.action);
  if (opts.action === 'insert') return `${opts.actor} ${verb} ${opts.recordLabel}`;
  if (opts.action === 'delete') return `${opts.actor} ${verb} ${opts.recordLabel}`;
  const fieldPart =
    opts.fields?.length === 1
      ? humanize(opts.fields[0]!)
      : opts.fields && opts.fields.length > 1
        ? `${opts.fields.length} fields`
        : 'record';
  return `${opts.actor} ${verb} ${fieldPart} on ${opts.recordLabel}`;
}
