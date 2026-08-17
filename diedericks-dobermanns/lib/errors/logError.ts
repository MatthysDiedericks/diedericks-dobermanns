import {
  type ErrorArea,
  type ErrorCode,
  type ErrorSeverity,
  type ErrorSurface,
} from '@/lib/errors/codes';
import { drainErrorEventQueue, enqueueErrorEvent, type QueuedErrorRow } from '@/lib/errors/offlineQueue';
import { emailDomainOnly, sanitizeDetail } from '@/lib/errors/sanitize';
import { appErrorMeta } from '@/lib/errors/appMeta';
import { getErrorSessionRef } from '@/lib/errors/sessionRef';
import { requireSupabase, supabase } from '@/lib/supabase';

export type LogErrorInput = {
  code: ErrorCode | string;
  area: ErrorArea;
  severity?: ErrorSeverity;
  message?: string | null;
  detail?: Record<string, unknown> | null;
  entityType?: string | null;
  entityId?: string | null;
  route?: string | null;
  surface?: ErrorSurface;
  actorRole?: 'anon' | 'client' | 'admin' | 'system' | null;
  actorId?: string | null;
  email?: string | null;
  emailDomain?: string | null;
  sessionRef?: string | null;
};

function buildRow(input: LogErrorInput, actorRole: string, actorId: string | null): QueuedErrorRow {
  const meta = appErrorMeta(input.route);
  const detail = sanitizeDetail({
    ...(input.detail ?? {}),
    screen: meta.screen,
    app_version: meta.app_version,
    build: meta.build,
  });
  return {
    code: String(input.code).slice(0, 120),
    area: input.area,
    severity: input.severity ?? 'error',
    message: input.message?.slice(0, 2000) ?? null,
    detail,
    surface: input.surface ?? 'app',
    route: input.route?.slice(0, 500) ?? meta.screen,
    actor_role: actorRole,
    actor_id: actorId,
    email_domain:
      input.emailDomain?.slice(0, 120) ??
      emailDomainOnly(input.email)?.slice(0, 120) ??
      null,
    session_ref: (input.sessionRef ?? getErrorSessionRef()).slice(0, 120),
    entity_type: input.entityType?.slice(0, 80) ?? null,
    entity_id: input.entityId?.slice(0, 120) ?? null,
    queued_at: new Date().toISOString(),
  };
}

async function insertRow(row: QueuedErrorRow): Promise<boolean> {
  if (!supabase) return false;
  const { queued_at: _q, ...payload } = row;
  const { error } = await supabase.from('error_events' as never).insert(payload as never);
  if (error) {
    console.error('[logError]', error.message);
    return false;
  }
  return true;
}

/**
 * Fire-and-forget insert into error_events. Never throws.
 * Queues locally when offline / insert fails; flushErrorEventQueue on reconnect.
 */
export async function logError(input: LogErrorInput): Promise<void> {
  try {
    let actorId = input.actorId ?? null;
    let actorRole = input.actorRole ?? null;
    if (!actorRole) {
      try {
        const client = requireSupabase();
        const { data } = await client.auth.getSession();
        const uid = data.session?.user?.id ?? null;
        if (uid) {
          actorId = actorId ?? uid;
          actorRole = 'client';
        } else {
          actorRole = 'anon';
        }
      } catch {
        actorRole = 'anon';
      }
    }

    const row = buildRow(input, actorRole, actorId);
    if (!supabase) {
      await enqueueErrorEvent(row);
      return;
    }

    const ok = await insertRow(row);
    if (!ok) await enqueueErrorEvent(row);
  } catch (err) {
    console.error('[logError]', err);
    try {
      await enqueueErrorEvent(
        buildRow(input, input.actorRole ?? 'anon', input.actorId ?? null),
      );
    } catch {
      /* ignore */
    }
  }
}

/** Flush queued errors after reconnect / app foreground. Safe to call often. */
export async function flushErrorEventQueue(): Promise<number> {
  try {
    return await drainErrorEventQueue(insertRow);
  } catch (err) {
    console.error('[flushErrorEventQueue]', err);
    return 0;
  }
}
