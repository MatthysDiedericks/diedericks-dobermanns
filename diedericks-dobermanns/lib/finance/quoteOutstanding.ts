/** What still has to be filled in before a quote can be sent — not saved. */

import { TIER_REQUIRED_MESSAGE } from '@/lib/finance/quoteSubject';
import { lineNeedsTier } from '@/lib/finance/quoteSubjectSave';

export type QuoteOutstandingTarget = 'description' | 'price' | 'delivery' | 'tier';

export type QuoteOutstandingLine = {
  key?: string;
  description: string;
  unit_price: number | null | undefined;
  allowZeroPrice?: boolean;
  item_type?: string;
  programme_tier?: string | null;
};

export type QuoteOutstandingItem = {
  id: string;
  phrase: string;
  hint: string;
  target: QuoteOutstandingTarget;
  lineKey?: string;
  lineIndex: number;
};

export const HINT_ADD_DESCRIPTION = 'Add a description';
export const HINT_SET_PRICE = 'Set a price';
export const HINT_SET_TIER = TIER_REQUIRED_MESSAGE;
export const HINT_DELIVERY = 'Undecided — required before send';

export function quoteFieldId(
  target: QuoteOutstandingTarget,
  lineKey?: string,
): string {
  if (target === 'delivery') return 'quote-delivery-decision';
  return `quote-line-${lineKey ?? 'unknown'}-${target}`;
}

export function lineNeedsDescription(line: QuoteOutstandingLine): boolean {
  return !line.description.trim();
}

export function lineNeedsPrice(line: QuoteOutstandingLine): boolean {
  if (line.allowZeroPrice) return false;
  return line.unit_price == null || line.unit_price <= 0;
}

export function collectQuoteOutstanding(
  lines: QuoteOutstandingLine[],
  deliveryDecision: string | null | undefined,
): QuoteOutstandingItem[] {
  const out: QuoteOutstandingItem[] = [];
  lines.forEach((line, i) => {
    const lineNo = i + 1;
    const key = line.key ?? `idx-${i}`;
    if (lineNeedsDescription(line)) {
      out.push({
        id: `${key}-description`,
        phrase: `a description on line ${lineNo}`,
        hint: HINT_ADD_DESCRIPTION,
        target: 'description',
        lineKey: line.key,
        lineIndex: i,
      });
    }
    if (lineNeedsPrice(line)) {
      out.push({
        id: `${key}-price`,
        phrase: `a price on line ${lineNo}`,
        hint: HINT_SET_PRICE,
        target: 'price',
        lineKey: line.key,
        lineIndex: i,
      });
    }
    if (lineNeedsTier(line)) {
      out.push({
        id: `${key}-tier`,
        phrase: `a tier on line ${lineNo}`,
        hint: HINT_SET_TIER,
        target: 'tier',
        lineKey: line.key,
        lineIndex: i,
      });
    }
  });
  if (!deliveryDecision) {
    out.push({
      id: 'delivery',
      phrase: 'the delivery decision',
      hint: HINT_DELIVERY,
      target: 'delivery',
      lineIndex: -1,
    });
  }
  return out;
}

function joinPhrases(phrases: string[]): string {
  if (phrases.length === 1) return phrases[0]!;
  if (phrases.length === 2) return `${phrases[0]}, and ${phrases[1]}`;
  return `${phrases.slice(0, -1).join(', ')}, and ${phrases[phrases.length - 1]}`;
}

export function formatOutstandingSummary(items: QuoteOutstandingItem[]): string {
  if (!items.length) return '';
  const n = items.length;
  const things = n === 1 ? '1 thing' : `${n} things`;
  return `${things} to complete before this quote can be sent: ${joinPhrases(items.map((it) => it.phrase))}.`;
}

export function sendBlockedReason(items: QuoteOutstandingItem[]): string | null {
  if (!items.length) return null;
  if (items.length === 1) {
    return `Send is blocked until you complete ${items[0]!.phrase}.`;
  }
  return `Send is blocked until you complete the ${items.length} items listed above.`;
}

export function outstandingForSavedQuote(quote: {
  items?: {
    id: string;
    description: string;
    unit_price: number;
    item_type: string;
  }[];
  delivery_decision?: string | null;
}): QuoteOutstandingItem[] {
  return collectQuoteOutstanding(
    (quote.items ?? []).map((it) => ({
      key: it.id,
      description: it.description,
      unit_price: it.unit_price,
      item_type: it.item_type,
      allowZeroPrice:
        it.item_type === 'delivery' &&
        Number(it.unit_price) === 0 &&
        quote.delivery_decision === 'included',
    })),
    quote.delivery_decision,
  );
}
