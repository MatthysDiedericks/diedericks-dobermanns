import { ERROR_CODES, type ErrorSeverity } from '@/lib/errors/codes';
import { logError } from '@/lib/errors/logError';

export const APPLY_WHATSAPP = '+27 78 215 0832';
export const APPLY_WHATSAPP_HREF = 'https://wa.me/27782150832';
export const APPLY_WHATSAPP_FALLBACK =
  `Fix it and try again, or WhatsApp us on ${APPLY_WHATSAPP} and we will take it down for you.`;

const SKIP = new Set(['company_url', 'form_opened_at', 'form_step', 'id_number']);

export function applyCouldNot(reason: string): string {
  const clause = reason.trim().replace(/\.+$/, '');
  return `We could not submit your application — ${clause}.\n${APPLY_WHATSAPP_FALLBACK}`;
}

export function redactedPayloadShape(body: unknown): Record<string, boolean> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
  const src = body as Record<string, unknown>;
  const out: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(src)) {
    if (SKIP.has(key)) continue;
    if (typeof value === 'boolean') {
      out[key] = value;
      continue;
    }
    if (value == null) {
      out[key] = false;
      continue;
    }
    if (typeof value === 'string') {
      out[key] = value.trim().length > 0;
      continue;
    }
    out[key] = true;
  }
  out.id_present = typeof src.id_number === 'string' && src.id_number.trim().length > 0;
  return out;
}

export function elapsedSecondsFromOpened(openedAtMs: number | null | undefined): number | null {
  if (openedAtMs == null || !Number.isFinite(openedAtMs)) return null;
  return Math.max(0, Math.round((Date.now() - openedAtMs) / 1000));
}

export function safeDbReason(error: { code?: string; message?: string } | null): string {
  const code = error?.code ?? '';
  if (code === 'P0001') return 'too many attempts were made from this connection';
  if (code === '23502') return 'a required field was missing';
  if (code === '23514') return 'one of the answers was not in the accepted list';
  if (code === '23503') return 'a selected dog or litter is no longer available';
  if (code === '23505') return 'this application looks like a duplicate';
  return 'the server could not save it';
}

export async function logApplyFailure(input: {
  code: string;
  message: string;
  body?: unknown;
  extra?: Record<string, unknown> | null;
  severity?: ErrorSeverity;
  route?: string;
  elapsedSeconds?: number | null;
}): Promise<void> {
  await logError({
    code: input.code,
    area: 'app',
    severity: input.severity ?? 'error',
    message: input.message.slice(0, 2000),
    detail: {
      elapsed_seconds: input.elapsedSeconds ?? null,
      populated: input.body != null ? redactedPayloadShape(input.body) : null,
      ...(input.extra ?? {}),
    },
    route: input.route ?? '/apply',
    surface: 'app',
    actorRole: 'anon',
    entityType: 'application',
  });
}

export function stackFrom(err: unknown): string {
  if (err instanceof Error) return (err.stack ?? err.message).slice(0, 1500);
  return String(err).slice(0, 1500);
}

export { ERROR_CODES };
