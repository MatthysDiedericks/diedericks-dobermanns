import {
  consistentSubject,
  idsForSubject,
  inferTierKeyFromDescription,
  TIER_REQUIRED_MESSAGE,
  type QuoteSubjectKind,
} from '@/lib/finance/quoteSubject';

export function resolvedProgrammeTier(line: {
  programme_tier?: string | null;
  description?: string;
}): string | null {
  return line.programme_tier ?? inferTierKeyFromDescription(line.description ?? '') ?? null;
}

/** Send checklist only — saved lines with a real description can still go out. */
export function lineNeedsTier(line: {
  item_type?: string;
  programme_tier?: string | null;
  description?: string;
}): boolean {
  if ((line.item_type ?? '') !== 'dog') return false;
  if (resolvedProgrammeTier(line)) return false;
  const desc = (line.description ?? '').trim();
  return !desc || desc === 'Dog';
}

export function subjectColumnsForSave(line: {
  item_type: string;
  dog_id?: string | null;
  litter_id?: string | null;
  subject_kind?: QuoteSubjectKind | null;
}): { dog_id: string | null; litter_id: string | null; subject_kind: QuoteSubjectKind } {
  if (line.item_type !== 'dog') {
    return { dog_id: null, litter_id: null, subject_kind: 'unallocated' };
  }
  const kind: QuoteSubjectKind =
    line.subject_kind ?? (line.dog_id ? 'dog' : line.litter_id ? 'litter' : 'unallocated');
  return { subject_kind: kind, ...idsForSubject(kind, line.dog_id ?? null, line.litter_id ?? null) };
}

export function subjectSaveError(line: {
  item_type: string;
  subject_kind?: QuoteSubjectKind | null;
  dog_id?: string | null;
  litter_id?: string | null;
  programme_tier?: string | null;
  description?: string;
}): string | null {
  if (line.item_type !== 'dog') return null;
  const kind: QuoteSubjectKind =
    line.subject_kind ?? (line.dog_id ? 'dog' : line.litter_id ? 'litter' : 'unallocated');
  if (!resolvedProgrammeTier(line)) return TIER_REQUIRED_MESSAGE;
  if (kind === 'dog' && !line.dog_id) return 'Pick the puppy this line is for.';
  if (kind === 'litter' && !line.litter_id) return 'Pick the litter this place is for.';
  if (!consistentSubject(kind, line.dog_id ?? null, line.litter_id ?? null)) {
    return 'This line’s subject does not match the puppy or litter attached to it.';
  }
  return null;
}
