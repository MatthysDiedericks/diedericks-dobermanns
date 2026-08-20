import { redactedPayloadShape, stackFrom } from '@/lib/applications/applyErrors';
import { ERROR_CODES, type ErrorSeverity } from '@/lib/errors/codes';
import { logError } from '@/lib/errors/logError';

export { redactedPayloadShape, stackFrom };

export type QuoteErrorCtx = {
  step: string;
  lineCount?: number | null;
  quoteNumber?: string | null;
  quoteId?: string | null;
  contactAttached?: boolean | null;
  field?: string | null;
  lineIndex?: number | null;
  sqlstate?: string | null;
  reason?: string | null;
  populated?: unknown;
  extra?: Record<string, unknown> | null;
  actorId?: string | null;
  surface?: 'website' | 'app' | 'server';
  route?: string;
};

function parseLineIndex(message: string): number | null {
  const m = message.match(/Line\s+(\d+)/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export async function logQuoteFailure(
  code: string,
  message: string,
  ctx: QuoteErrorCtx,
  severity?: ErrorSeverity,
): Promise<void> {
  await logError({
    code,
    area: 'quote',
    severity: severity ?? (code === ERROR_CODES.QUOTE_VALIDATION_FAILED ? 'warning' : 'error'),
    message: message.slice(0, 2000),
    detail: {
      step: ctx.step,
      line_count: ctx.lineCount ?? null,
      quote_number: ctx.quoteNumber ?? null,
      contact_attached: ctx.contactAttached ?? null,
      field: ctx.field ?? null,
      line_index: ctx.lineIndex ?? parseLineIndex(message),
      sqlstate: ctx.sqlstate ?? null,
      reason: ctx.reason ?? null,
      populated: ctx.populated != null ? redactedPayloadShape(ctx.populated) : null,
      ...(ctx.extra ?? {}),
    },
    entityType: 'quote',
    entityId: ctx.quoteId ?? null,
    route: ctx.route ?? '/quotes',
    surface: ctx.surface ?? 'app',
    actorRole: 'admin',
    actorId: ctx.actorId ?? null,
  });
}

export class QuoteDbError extends Error {
  readonly sqlstate: string | null;
  readonly step: string;
  constructor(message: string, opts: { sqlstate?: string | null; step: string }) {
    super(message);
    this.name = 'QuoteDbError';
    this.sqlstate = opts.sqlstate ?? null;
    this.step = opts.step;
  }
}

export function throwQuoteDb(
  step: string,
  err: { code?: string; message?: string } | null,
): never {
  throw new QuoteDbError(err?.message ?? 'Quote save failed', {
    sqlstate: err?.code ?? null,
    step,
  });
}

export async function quoteSendFail(error: string, ctx: QuoteErrorCtx): Promise<void> {
  await logQuoteFailure(ERROR_CODES.QUOTE_SEND_FAILED, error, ctx);
}

export async function quoteUnhandled(err: unknown, ctx: QuoteErrorCtx): Promise<void> {
  await logQuoteFailure(
    ERROR_CODES.QUOTE_UNHANDLED,
    'Quote path threw',
    { ...ctx, extra: { ...(ctx.extra ?? {}), stack: stackFrom(err) } },
    'error',
  );
}

export { ERROR_CODES };
