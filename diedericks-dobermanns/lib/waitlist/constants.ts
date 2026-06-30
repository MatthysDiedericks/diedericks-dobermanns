export const PIPELINE_STAGES = [
  'enquiry',
  'application',
  'approved',
  'quote_sent',
  'deposit_paid',
  'matched',
  'reserved',
  'handover_complete',
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const TERMINAL_STAGES = ['on_hold', 'do_not_sell', 'withdrawn'] as const;

export type TerminalStage = (typeof TERMINAL_STAGES)[number];

export const KANBAN_STAGES: PipelineStage[] = [
  'enquiry',
  'application',
  'approved',
  'quote_sent',
  'deposit_paid',
  'matched',
  'reserved',
];

export const STAGE_LABELS: Record<string, string> = {
  enquiry: 'Enquiry',
  application: 'Application',
  approved: 'Approved',
  quote_sent: 'Quote Sent',
  deposit_paid: 'Deposit Paid',
  matched: 'Matched',
  reserved: 'Reserved',
  handover_complete: 'Handover',
  on_hold: 'On Hold',
  do_not_sell: 'Do Not Sell',
  withdrawn: 'Withdrawn',
};

export function stageLabel(stage: string | null | undefined): string {
  if (!stage) return 'Enquiry';
  return STAGE_LABELS[stage] ?? stage.replace(/_/g, ' ');
}

export function daysWaiting(createdAt: string): number {
  const start = new Date(createdAt).getTime();
  return Math.max(0, Math.floor((Date.now() - start) / 86_400_000));
}

export function isFollowUpOverdue(followUpDate: string | null | undefined): boolean {
  if (!followUpDate) return false;
  const d = new Date(followUpDate);
  d.setHours(23, 59, 59, 999);
  return d.getTime() < Date.now();
}
