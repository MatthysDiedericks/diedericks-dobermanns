import { FREE_FIELDS, LOCKED_FIELDS, REAPPROVAL_FIELDS } from '@/lib/applications/fieldTiers';

export const APPLY_AGAIN_STATUSES = new Set([
  'submitted',
  'under_review',
  'info_requested',
  'approved',
  'changes_pending',
  'waitlisted',
]);

const SKIP = new Set([
  'id',
  'created_at',
  'updated_at',
  'status',
  'admin_notes',
  'reviewed_at',
  'reviewed_by',
  'archived_at',
  'archived_by',
  'archived_reason',
  'previous_application_id',
  'reference_code',
  'reminder_count',
  'last_reminder_sent_at',
  'approved_version_number',
  'id_check_status',
  'id_check_note',
  'user_id',
  ...REAPPROVAL_FIELDS,
]);

export const COPY_FIELDS = [...FREE_FIELDS, ...LOCKED_FIELDS].filter((k) => !SKIP.has(k));

export function copyApplicationFields(source: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of COPY_FIELDS) {
    if (key in source) out[key] = source[key];
  }
  return out;
}

export function canApplyAgain(status: string | null | undefined): boolean {
  return Boolean(status && APPLY_AGAIN_STATUSES.has(status));
}
