import { compareQueueOrder } from "./queue";

/**
 * A waiting-list hold (waiting_list.hold_until / hold_reason).
 * This is not a quote lapse hold. An expired date is not a hold.
 */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export type WaitlistHoldFields = {
  hold_reason?: string | null;
  hold_until?: string | null;
};

export type QueueStanding = {
  id: string;
  pipeline_stage?: string | null;
  queue_anchor_at?: string | null;
  date_added?: string | null;
  created_at: string;
  request_index?: number | null;
};

export const HOLD_REASON_TOO_SHORT =
  "A reason is required to hold a waiting-list place. It has to outlive the person who set it.";

function todayIso(today: Date): string {
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** True while hold_until is today or later. A missing date is not a hold. */
export function isWaitlistOnHold(
  holdUntil: string | null | undefined,
  today = new Date(),
): boolean {
  if (!holdUntil) return false;
  return holdUntil.slice(0, 10) >= todayIso(today);
}

/** A date was set and it has passed. The entry ranks normally again. */
export function isWaitlistHoldExpired(
  holdUntil: string | null | undefined,
  today = new Date(),
): boolean {
  if (!holdUntil) return false;
  return !isWaitlistOnHold(holdUntil, today);
}

/** "2026-12-29" → "29 Dec" or "29 Dec 2026". */
export function formatHoldDate(iso: string, withYear: boolean): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return iso;
  const label = `${day} ${MONTHS[month - 1] ?? iso}`;
  return withYear ? `${label} ${year}` : label;
}

export function waitlistHoldChipLabel(holdUntil: string): string {
  return `On hold until ${formatHoldDate(holdUntil, true)}`;
}

export function waitlistHoldExpiredChipLabel(holdUntil: string): string {
  return `Hold expired ${formatHoldDate(holdUntil, false)}`;
}

export function holdReasonError(reason: string): string | null {
  if (reason.trim().length < 3) return HOLD_REASON_TOO_SHORT;
  return null;
}

export type WaitlistHoldWrite = {
  hold_reason: string;
  hold_until: string;
  hold_set_by: string;
  hold_set_at: string;
};

/** Blank or two-character reasons are rejected. The stage is not touched. */
export function buildWaitlistHoldWrite(input: {
  reason: string;
  holdUntil: string;
  actorId: string;
  now?: string;
}): { error: string } | { patch: WaitlistHoldWrite } {
  const reasonError = holdReasonError(input.reason);
  if (reasonError) return { error: reasonError };
  const day = input.holdUntil.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return { error: "Choose the date the hold runs until." };
  }
  return {
    patch: {
      hold_reason: input.reason.trim(),
      hold_until: day,
      hold_set_by: input.actorId,
      hold_set_at: input.now ?? new Date().toISOString(),
    },
  };
}

/** Clearing nulls the note, the date, and who set it, together. */
export function clearedWaitlistHold(): {
  hold_reason: null;
  hold_until: null;
  hold_set_by: null;
  hold_set_at: null;
} {
  return {
    hold_reason: null,
    hold_until: null,
    hold_set_by: null,
    hold_set_at: null,
  };
}

/**
 * Same pipeline stage: a live hold sorts after an unheld peer.
 * Different stages, or an expired hold, leave the existing order alone.
 * Returns 0 when hold should not decide.
 */
export function holdRanksAfterPeer(
  a: { pipeline_stage?: string | null; hold_until?: string | null },
  b: { pipeline_stage?: string | null; hold_until?: string | null },
  today = new Date(),
): number {
  if ((a.pipeline_stage ?? "") !== (b.pipeline_stage ?? "")) return 0;
  const aHeld = isWaitlistOnHold(a.hold_until, today);
  const bHeld = isWaitlistOnHold(b.hold_until, today);
  if (aHeld === bHeld) return 0;
  return aHeld ? 1 : -1;
}

/**
 * 1-based place in line among the same stage, by queue anchor.
 * A hold does not change this number.
 */
export function queuePositionInStage<T extends QueueStanding>(
  entry: T,
  cohort: T[],
): number {
  const stage = entry.pipeline_stage ?? "";
  const peers = cohort.filter((row) => (row.pipeline_stage ?? "") === stage);
  const ordered = [...peers].sort(compareQueueOrder);
  const index = ordered.findIndex((row) => row.id === entry.id);
  return index < 0 ? ordered.length : index + 1;
}

export function queuePositionLabel(position: number): string {
  return `Queue position ${position}`;
}

/**
 * Copy for the override step. Null when the entry is not on a live hold,
 * so allocation is not blocked and an expired hold does not ask again.
 */
export function holdOverridePrompt(
  entry: WaitlistHoldFields & { hold_until?: string | null },
  today = new Date(),
): string | null {
  if (!isWaitlistOnHold(entry.hold_until, today) || !entry.hold_until) return null;
  const reason = entry.hold_reason?.trim() || "No reason recorded.";
  return `${waitlistHoldChipLabel(entry.hold_until)}. ${reason} Allocate this puppy anyway?`;
}
