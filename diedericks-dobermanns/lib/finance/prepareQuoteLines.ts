/** Default description when the admin picks a type and amount but leaves the text blank. */
import { subjectSaveError } from '@/lib/finance/quoteSubjectSave';
import type { QuoteSubjectKind } from '@/lib/finance/quoteSubject';
import { DELIVERY_LINE_NO_AMOUNT_MESSAGE } from '@/lib/finance/catalogue';

export const DEFAULT_LINE_DESCRIPTIONS: Record<string, string> = {
  dog: 'Dog',
  delivery: 'Delivery / travel',
  transport: 'Transport',
  board_train: 'Board & train',
  training: 'Training',
  accessory: 'Accessory',
  other: 'Additional item',
};

export function defaultDescriptionForType(itemType: string): string {
  return DEFAULT_LINE_DESCRIPTIONS[itemType] ?? 'Additional item';
}

export type DraftishLine = {
  description: string;
  quantity: number;
  unit_price: number;
  dog_id?: string | null;
  litter_id?: string | null;
  subject_kind?: QuoteSubjectKind | null;
  programme_tier?: string | null;
  item_type: string;
  allowZeroPrice?: boolean;
};

function isMeaningful(it: DraftishLine): boolean {
  return (
    Boolean(it.description.trim()) ||
    it.unit_price > 0 ||
    Boolean(it.allowZeroPrice && it.unit_price === 0) ||
    Boolean(it.dog_id) ||
    Boolean(it.litter_id) ||
    Boolean(it.programme_tier) ||
    (it.item_type === 'dog' && Boolean(it.subject_kind) && it.subject_kind !== 'unallocated')
  );
}

/**
 * Prepare quote lines for save:
 * - drop genuinely empty lines
 * - default description from item type when a priced/subject line lacks one
 * - block when a dog line has no tier or an inconsistent subject
 * - allow R0 when allowZeroPrice (included delivery)
 */
export function prepareQuoteLinesForSave<T extends DraftishLine>(
  items: T[],
): { ok: true; lines: T[] } | { ok: false; error: string } {
  const kept: T[] = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i]!;
    const desc = it.description.trim();
    const hasDog = Boolean(it.dog_id);
    const hasLitter = Boolean(it.litter_id);
    const hasTier = Boolean(it.programme_tier);
    const hasPrice = it.unit_price > 0;
    const allowZero = Boolean(it.allowZeroPrice) && it.unit_price === 0;
    const lineNo = i + 1;
    const hasSubject = hasDog || hasLitter || hasTier;

    if (!isMeaningful(it)) continue;

    const subjectErr = subjectSaveError(it);
    if (subjectErr) {
      return { ok: false, error: `Line ${lineNo}: ${subjectErr}` };
    }

    if (!desc && (hasPrice || hasSubject || allowZero)) {
      kept.push({
        ...it,
        description: defaultDescriptionForType(it.item_type),
      });
      continue;
    }

    if (desc && !hasPrice && !hasSubject && !allowZero) {
      return {
        ok: false,
        error:
          it.item_type === 'delivery'
            ? `Line ${lineNo}: ${DELIVERY_LINE_NO_AMOUNT_MESSAGE}`
            : `Line ${lineNo} has a description but no price. Add an amount, or remove the line.`,
      };
    }

    if (!desc) {
      return {
        ok: false,
        error: `Line ${lineNo} has an amount but no description. Add one, or remove the line.`,
      };
    }

    kept.push({ ...it, description: desc });
  }

  if (kept.length === 0) {
    return { ok: false, error: 'Add at least one line item.' };
  }

  return { ok: true, lines: kept };
}
