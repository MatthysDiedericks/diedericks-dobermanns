/** Default description when the admin picks a type and amount but leaves the text blank. */
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
  item_type: string;
};

/**
 * Prepare quote lines for save:
 * - drop genuinely empty lines (no description, no price, no dog)
 * - default description from item type when a priced/dog line lacks one
 * - block with a named error when a line still cannot be saved
 */
export function prepareQuoteLinesForSave<T extends DraftishLine>(
  items: T[],
): { ok: true; lines: T[] } | { ok: false; error: string } {
  const kept: T[] = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i]!;
    const desc = it.description.trim();
    const hasDog = Boolean(it.dog_id);
    const hasPrice = it.unit_price > 0;
    const lineNo = i + 1;

    if (!desc && !hasPrice && !hasDog) continue;

    if (!desc && (hasPrice || hasDog)) {
      kept.push({
        ...it,
        description: defaultDescriptionForType(it.item_type),
      });
      continue;
    }

    if (desc && !hasPrice && !hasDog) {
      return {
        ok: false,
        error: `Line ${lineNo} has a description but no price. Add an amount, or remove the line.`,
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
