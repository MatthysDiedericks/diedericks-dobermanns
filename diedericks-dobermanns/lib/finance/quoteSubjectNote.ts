import { inferTierKeyFromDescription, type QuoteSubjectKind } from '@/lib/finance/quoteSubject';

/** Plain-language statement of what the buyer is paying for, from a saved line. */
export function noteForSavedQuoteLine(it: {
  item_type?: string;
  subject_kind?: string | null;
  dog_id?: string | null;
  litter_id?: string | null;
  description: string;
}): string | null {
  if (it.item_type && it.item_type !== 'dog') return null;
  const kind: QuoteSubjectKind =
    (it.subject_kind as QuoteSubjectKind | null) ??
    (it.dog_id ? 'dog' : it.litter_id ? 'litter' : 'unallocated');

  if (kind === 'dog') {
    return `This reserves ${it.description}. Once the deposit is paid, this puppy comes off the available list.`;
  }
  if (kind === 'litter') {
    const from = it.description.match(/from\s+(.+)$/i);
    const rest = from?.[1]?.replace(/\s*\(.*\)\s*$/, '').trim();
    if (rest) {
      const [pair, due] = rest.split(/,\s*expected\s+/i);
      const when = due ? `, expected ${due}` : '';
      return `This reserves a place in the ${pair} litter${when}. Your specific puppy is chosen once the litter is born and assessed.`;
    }
    return 'This reserves a place in that litter. Your specific puppy is chosen once the litter is born and assessed.';
  }

  const stripped = it.description.replace(/\s*[—-]\s*litter to be confirmed.*$/i, '').trim();
  const tier =
    stripped ||
    (inferTierKeyFromDescription(it.description) === 'elite_developed'
      ? 'Elite Developed Puppy'
      : 'Dobermann');
  return `This reserves a place on the waiting list for a ${tier}. Your litter is confirmed later.`;
}
