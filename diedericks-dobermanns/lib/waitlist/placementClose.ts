/**
 * Who leaves the waiting list, and how the "how long" number is counted.
 * Matching uses linked ids only. A shared name is never a link.
 */

import { isWaitingListQueueStage, stageLabel } from './constants';

/** Not waiting. Hidden until someone asks to see past placements. */
export const CLOSED_WAITING_STAGES = ['handover_complete', 'withdrawn', 'do_not_sell'] as const;

/**
 * Bulk import on 21 Jul 2026 wrote this day onto stage_updated_at for old rows.
 * It is not a real stage change.
 */
export const BULK_IMPORT_STAGE_DAY = '2026-07-21';

export const RESERVED_WITHOUT_DOG_DAYS = 30;

export type PlacementLink = {
  /** This request line, even when the client has other open lines. */
  entryId?: string | null;
  dogId?: string | null;
  clientId?: string | null;
  applicationId?: string | null;
  quoteId?: string | null;
};

export type CloseCandidate = {
  id: string;
  pipeline_stage: string | null;
  assigned_dog_id: string | null;
  client_id: string | null;
  application_id: string | null;
  quote_id: string | null;
  /** Present on rows. Never used to decide a match. */
  enquirer_name?: string | null;
};

export type StageAge = {
  days: number;
  source: 'stage_updated_at' | 'date_added';
  importFallback: boolean;
  totalDays: number;
};

function present(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function isClosedWaitingStage(stage: string | null | undefined): boolean {
  return (CLOSED_WAITING_STAGES as readonly string[]).includes(stage ?? '');
}

/** Paid queue, and never a closed placement. */
export function shownOnDefaultWaitingList(stage: string | null | undefined): boolean {
  if (isClosedWaitingStage(stage)) return false;
  return isWaitingListQueueStage(stage);
}

export function waitingListCounts(stages: (string | null | undefined)[]): {
  waiting: number;
  closed: number;
} {
  let waiting = 0;
  let closed = 0;
  for (const stage of stages) {
    if (isClosedWaitingStage(stage)) closed += 1;
    else if (shownOnDefaultWaitingList(stage)) waiting += 1;
  }
  return { waiting, closed };
}

export function waitingClosedLine(waiting: number, closed: number): string {
  return `${waiting} waiting · ${closed} closed`;
}

export function calendarDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const day = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

export function daysSince(iso: string | null | undefined, now = new Date()): number {
  const day = calendarDay(iso);
  if (!day) return 0;
  const start = new Date(`${day}T00:00:00`);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / 86400000));
}

/**
 * Headline age is how long they have been in the current stage.
 * A null stage date, or the 21 Jul 2026 import stamp, falls back to date_added.
 */
export function stageAge(
  entry: {
    stage_updated_at?: string | null;
    date_added?: string | null;
    created_at?: string | null;
  },
  now = new Date(),
): StageAge {
  const stageDay = calendarDay(entry.stage_updated_at);
  const importFallback = !stageDay || stageDay === BULK_IMPORT_STAGE_DAY;
  const added = entry.date_added ?? entry.created_at ?? null;
  const basis = importFallback ? added : entry.stage_updated_at;
  return {
    days: daysSince(basis, now),
    source: importFallback ? 'date_added' : 'stage_updated_at',
    importFallback,
    totalDays: daysSince(added, now),
  };
}

export function stageAgeHeadline(stage: string | null | undefined, age: StageAge): string {
  const label = stageLabel(stage);
  if (age.importFallback) return `${label} · ${age.days} days since they joined`;
  return `${label} · ${age.days} days ago`;
}

export function stageAgeNote(age: StageAge): string | null {
  if (!age.importFallback) return null;
  return 'Counted from the date they were added. The stage date is the 21 Jul 2026 import.';
}

export function stageAgeSecondary(age: StageAge): string | null {
  if (age.importFallback || age.totalDays === age.days) return null;
  return `On the list ${age.totalDays} days`;
}

/**
 * Rows a placement may close.
 * An entry id closes that line only.
 * Otherwise a dog, quote, or application id must hit, or the client must have
 * exactly one open line. Several open lines for one client are left alone.
 */
export function entriesToClose(entries: CloseCandidate[], link: PlacementLink): CloseCandidate[] {
  const open = entries.filter((entry) => !isClosedWaitingStage(entry.pipeline_stage));
  const entryId = present(link.entryId);
  if (entryId) {
    const hit = open.find((entry) => entry.id === entryId);
    return hit ? [hit] : [];
  }

  const dogId = present(link.dogId);
  const clientId = present(link.clientId);
  const applicationId = present(link.applicationId);
  const quoteId = present(link.quoteId);
  if (!dogId && !clientId && !applicationId && !quoteId) return [];

  const byDog = dogId ? open.filter((entry) => entry.assigned_dog_id === dogId) : [];
  if (byDog.length > 0) return byDog;

  const byQuote = quoteId ? open.filter((entry) => entry.quote_id === quoteId) : [];
  if (byQuote.length === 1) return byQuote;

  const byApp = applicationId ? open.filter((entry) => entry.application_id === applicationId) : [];
  if (byApp.length === 1) return byApp;

  const byClient = clientId
    ? open.filter((entry) => {
        if (entry.client_id !== clientId) return false;
        if (entry.assigned_dog_id && dogId && entry.assigned_dog_id !== dogId) return false;
        return true;
      })
    : [];
  if (byClient.length === 1) return byClient;

  return [];
}

export function handoverClosePatch(note: string, nowIso: string, actorId?: string | null) {
  return {
    pipeline_stage: 'handover_complete' as const,
    status: 'removed' as const,
    stage_updated_at: nowIso,
    stage_updated_by: actorId ?? null,
    stage_change_note: note,
  };
}

/** When the close is for a known dog, record that dog if the line has none. */
export function dogLinkOnClose(
  entry: { assigned_dog_id: string | null },
  link: PlacementLink,
): { assigned_dog_id: string } | Record<string, never> {
  const dogId = present(link.dogId);
  if (dogId && !entry.assigned_dog_id) return { assigned_dog_id: dogId };
  return {};
}

/**
 * Records which puppy this line is for. Does not touch stage or status,
 * so a closed line stays closed.
 */
export function linkPuppyPatch(dog: { id: string; litter_id?: string | null }): {
  assigned_dog_id: string;
  assigned_litter_id?: string;
} {
  const patch: { assigned_dog_id: string; assigned_litter_id?: string } = {
    assigned_dog_id: dog.id,
  };
  if (dog.litter_id) patch.assigned_litter_id = dog.litter_id;
  return patch;
}

export type ReconcileEntry = CloseCandidate & {
  stage_updated_at?: string | null;
  date_added?: string | null;
  created_at?: string | null;
};

export function reconcileWaitingList(entries: ReconcileEntry[], now = new Date()) {
  const reservedStaleNoDog: ReconcileEntry[] = [];
  const depositPaidNoDog: ReconcileEntry[] = [];
  const closedUnlinked: ReconcileEntry[] = [];
  for (const entry of entries) {
    const noDog = !entry.assigned_dog_id;
    if (
      entry.pipeline_stage === 'reserved' &&
      noDog &&
      stageAge(entry, now).days > RESERVED_WITHOUT_DOG_DAYS
    ) {
      reservedStaleNoDog.push(entry);
    }
    if (entry.pipeline_stage === 'deposit_paid' && noDog) depositPaidNoDog.push(entry);
    if (isClosedWaitingStage(entry.pipeline_stage) && noDog) closedUnlinked.push(entry);
  }
  return { reservedStaleNoDog, depositPaidNoDog, closedUnlinked };
}

/** A fully paid balance invoice closes the line. The deposit invoice does not. */
export function entriesSettledByBalance(
  entries: Array<{
    id: string;
    pipeline_stage: string | null;
    balance_invoice_id: string | null;
    deposit_invoice_id: string | null;
  }>,
  invoiceId: string,
  outstanding: number,
): string[] {
  if (!(outstanding <= 0.009)) return [];
  return entries
    .filter((entry) => {
      if (entry.balance_invoice_id !== invoiceId) return false;
      if (!entry.balance_invoice_id) return false;
      if (entry.deposit_invoice_id && entry.deposit_invoice_id === entry.balance_invoice_id) {
        return false;
      }
      return !isClosedWaitingStage(entry.pipeline_stage);
    })
    .map((entry) => entry.id);
}
