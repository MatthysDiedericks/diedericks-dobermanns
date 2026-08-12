/**
 * Pipeline stage advancement for waiting_list.
 * Never moves a stage backwards automatically. Terminal stages are manual only.
 */

import {
  PIPELINE_STAGES,
  stageLabel,
  type PipelineStage,
} from '@/lib/waitlist/constants';

export const BREADCRUMB_STAGES: PipelineStage[] = [
  'application',
  'approved',
  'quote_sent',
  'deposit_paid',
  'matched',
  'reserved',
  'handover_complete',
];

export const NEXT_STEP_COPY: Record<string, string> = {
  enquiry: 'Submit an application so we can review your home and preferences.',
  application: 'We are reviewing your application. You will hear from us shortly.',
  approved: 'Your application is approved. A quote is next.',
  quote_sent: 'Review and accept your quote, then arrange the deposit.',
  deposit_paid: 'You are on the waiting list. We will match a puppy when the litter is ready.',
  matched: 'A puppy has been matched. Reservation and contract come next.',
  reserved: 'Your puppy is reserved. Handover planning is next.',
  handover_complete: 'Welcome to the Diedericks family — enjoy your Dobermann.',
  on_hold: 'Your place is on hold. We will resume when you are ready.',
  do_not_sell: 'This enquiry is closed.',
  withdrawn: 'You have left the waiting list.',
};

const STAGE_ORDER = new Map<string, number>(
  PIPELINE_STAGES.map((s, i) => [s, i]),
);

export function stageRank(stage: string | null | undefined): number {
  if (!stage) return -1;
  return STAGE_ORDER.get(stage) ?? -1;
}

/** True if `next` is strictly ahead of `current` on the happy path. */
export function isForwardStage(
  current: string | null | undefined,
  next: string,
): boolean {
  const a = stageRank(current);
  const b = stageRank(next);
  if (b < 0) return false;
  if (a < 0) return true;
  return b > a;
}

export function nextStepCopy(stage: string | null | undefined): string {
  if (!stage) return NEXT_STEP_COPY.enquiry;
  return NEXT_STEP_COPY[stage] ?? `Current stage: ${stageLabel(stage)}.`;
}

export type PipelineAdvancePatch = {
  pipeline_stage: string;
  stage_updated_at: string;
  stage_updated_by?: string | null;
  quote_id?: string | null;
  quote_sent_date?: string | null;
  quote_expires_date?: string | null;
  quoted_price?: number | null;
  deposit_invoice_id?: string | null;
  deposit_paid_date?: string | null;
  deposit_amount?: number | null;
  payment_status?: string;
  assigned_dog_id?: string | null;
  assigned_litter_id?: string | null;
  status?: string;
  stage_change_note?: string | null;
  internal_flags?: string[];
  admin_notes?: string | null;
  hold_reason?: string | null;
};

/**
 * Build an advance patch only when the new stage is forward.
 * Returns null when the entry is already at or past the target (no reverse).
 */
export function buildForwardStagePatch(
  currentStage: string | null | undefined,
  nextStage: string,
  actorId: string | null | undefined,
  extra: Omit<PipelineAdvancePatch, 'pipeline_stage' | 'stage_updated_at' | 'stage_updated_by'> = {},
): PipelineAdvancePatch | null {
  if (!isForwardStage(currentStage, nextStage)) return null;
  return {
    pipeline_stage: nextStage,
    stage_updated_at: new Date().toISOString(),
    stage_updated_by: actorId ?? null,
    ...extra,
  };
}

/** Flag a cancelled quote on the waitlist without reversing the stage. */
export function buildQuoteCancelledFlag(
  existingFlags: string[] | null | undefined,
  existingNotes: string | null | undefined,
  quoteId: string,
): Pick<PipelineAdvancePatch, 'internal_flags' | 'admin_notes'> {
  const flags = new Set(existingFlags ?? []);
  flags.add('quote_cancelled');
  const stamp = `[${new Date().toISOString().slice(0, 16).replace('T', ' ')}] Quote ${quoteId} cancelled — stage left unchanged; follow up with buyer.`;
  const admin_notes = existingNotes?.trim() ? `${existingNotes.trim()}\n\n${stamp}` : stamp;
  return { internal_flags: Array.from(flags), admin_notes };
}
