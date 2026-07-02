import type { WaitingListEntry } from '@/types/app.types';

export function entryDisplayName(entry: WaitingListEntry): string {
  return entry.client?.full_name ?? entry.enquirer_name ?? 'Unknown';
}

export function entryEmail(entry: WaitingListEntry): string | null {
  return entry.client?.email ?? entry.enquirer_email ?? null;
}

export function entryPhone(entry: WaitingListEntry): string | null {
  return entry.client?.phone ?? entry.enquirer_phone ?? null;
}

export function effectiveStage(entry: WaitingListEntry): string {
  return entry.pipeline_stage ?? 'enquiry';
}

export function isDoNotSell(entry: WaitingListEntry): boolean {
  return effectiveStage(entry) === 'do_not_sell';
}

export function isActiveMatchStage(entry: WaitingListEntry): boolean {
  const stage = effectiveStage(entry);
  return ['deposit_paid', 'matched', 'reserved'].includes(stage) && !isDoNotSell(entry);
}

export const CATEGORY_LABELS: Record<string, string> = {
  any: 'Any',
  standard: 'Standard',
  elite: 'Elite',
  protection: 'Protection',
  puppy: 'Standard',
  elite_developed: 'Elite',
  protection_dog: 'Protection',
};

export function categoryFromDogInterest(interest: string | null | undefined): string {
  if (interest === 'elite_developed') return 'elite';
  if (interest === 'protection_dog') return 'protection';
  if (interest === 'puppy') return 'standard';
  return 'any';
}

export const INTERNAL_FLAGS = [
  'VIP',
  'International',
  'Referral',
  'Referred By Us',
  'Difficult',
  'First-time Owner',
] as const;

export const SOURCE_LABELS: Record<string, string> = {
  app: 'App',
  website: 'Website',
  instagram: 'Instagram',
  referral: 'Referral',
  phone: 'Phone',
  manual: 'Manual',
};
