import { ERROR_CODES } from '@/lib/errors/codes';
import { logError } from '@/lib/errors/logError';

const EPS = 0.009;

export type QuoteAssertLine = {
  description: string;
  quantity: number;
  unit_price: number;
};

export async function assertQuoteTotalsMatch(opts: {
  displayedTotal: number;
  lines: QuoteAssertLine[];
  discount: number;
  quoteId?: string | null;
}): Promise<string | null> {
  const subtotal = opts.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const computed = Math.max(subtotal - (opts.discount || 0), 0);
  if (Math.abs(computed - opts.displayedTotal) <= EPS) return null;

  await logError({
    code: ERROR_CODES.QUOTE_TOTAL_MISMATCH,
    area: 'quote',
    severity: 'critical',
    message: 'Displayed quote total does not match total being saved',
    detail: {
      displayed_total: opts.displayedTotal,
      computed_total: computed,
      line_count: opts.lines.length,
    },
    entityType: 'quote',
    entityId: opts.quoteId ?? null,
    surface: 'app',
    actorRole: 'admin',
  });
  return 'Quote total does not match the line items. Refresh and try again — nothing was saved.';
}

export async function assertQuoteLineCount(opts: {
  intendedCount: number;
  writtenCount: number;
  droppedDescriptions?: string[];
  quoteId?: string | null;
}): Promise<string | null> {
  if (opts.intendedCount === opts.writtenCount) return null;

  const dropped =
    opts.droppedDescriptions?.filter(Boolean).slice(0, 5).join('; ') ||
    `${opts.intendedCount - opts.writtenCount} line(s)`;

  await logError({
    code: ERROR_CODES.QUOTE_LINE_DROPPED,
    area: 'quote',
    severity: 'critical',
    message: `Quote line(s) dropped on save: ${dropped}`,
    detail: {
      intended_count: opts.intendedCount,
      written_count: opts.writtenCount,
      dropped: opts.droppedDescriptions?.slice(0, 10) ?? [],
    },
    entityType: 'quote',
    entityId: opts.quoteId ?? null,
    surface: 'app',
    actorRole: 'admin',
  });
  return `A quote line was lost before save (${dropped}). Fix the line and try again — nothing incomplete was kept.`;
}
