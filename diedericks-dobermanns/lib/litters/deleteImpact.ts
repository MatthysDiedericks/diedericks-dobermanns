/**
 * What deleting a litter actually does. Cascades wipe health, photos and
 * finances; SET NULL leaves puppies and invoices pointing at nothing.
 * Counts come from the live rows so the confirmation is specific, not a
 * generic "are you sure".
 */

export const LITTER_STATUS_ARCHIVED = 'archived';

export type LitterDeleteImpact = {
  litterId: string;
  litterName: string | null;
  puppies: number;
  healthRecords: number;
  photos: number;
  financialEntries: number;
  taskItems: number;
  invoices: number;
  expenses: number;
  contracts: number;
  reservations: number;
  applications: number;
  waitingList: number;
  heatCycles: number;
  quoteItems: number;
  clientGroups: number;
  pairings: number;
  breedingPlanSteps: number;
  calendarEvents: number;
};

export type LitterDangerMode = 'delete' | 'archive';

export function isArchivedLitterStatus(
  status: string | null | undefined,
): boolean {
  return (status ?? '').toLowerCase() === LITTER_STATUS_ARCHIVED;
}

export function litterDangerMode(impact: LitterDeleteImpact): LitterDangerMode {
  return impact.puppies > 0 ? 'archive' : 'delete';
}

export function confirmToken(litterName: string | null | undefined): string {
  const name = litterName?.trim();
  return name || 'DELETE';
}

function normalizeConfirm(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[×]/g, 'x')
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ');
}

export function namesMatch(
  litterName: string | null | undefined,
  typed: string,
): boolean {
  return normalizeConfirm(typed) === normalizeConfirm(confirmToken(litterName));
}

function plural(n: number, singular: string, pluralForm?: string): string {
  const word = n === 1 ? singular : (pluralForm ?? `${singular}s`);
  return `${n} ${word}`;
}

function litterLabel(name: string | null | undefined): string {
  return name?.trim() || 'this litter';
}

export function destroyedLines(impact: LitterDeleteImpact): string[] {
  const lines: string[] = [];
  if (impact.healthRecords)
    lines.push(plural(impact.healthRecords, 'health record'));
  if (impact.photos) lines.push(plural(impact.photos, 'photo'));
  if (impact.financialEntries)
    lines.push(plural(impact.financialEntries, 'financial entry', 'financial entries'));
  if (impact.taskItems)
    lines.push(plural(impact.taskItems, 'task list item'));
  return lines;
}

export function disconnectedLines(impact: LitterDeleteImpact): string[] {
  const lines: string[] = [];
  if (impact.puppies) {
    lines.push(
      `${plural(impact.puppies, 'puppy', 'puppies')} — they will remain as dogs but lose their litter and their littermates`,
    );
  }
  const extras: string[] = [];
  if (impact.invoices) extras.push(plural(impact.invoices, 'invoice'));
  if (impact.expenses) extras.push(plural(impact.expenses, 'expense'));
  if (impact.contracts) extras.push(plural(impact.contracts, 'contract'));
  if (impact.reservations)
    extras.push(plural(impact.reservations, 'reservation'));
  if (impact.applications)
    extras.push(plural(impact.applications, 'application'));
  if (impact.waitingList)
    extras.push(plural(impact.waitingList, 'waiting list entry', 'waiting list entries'));
  if (impact.heatCycles) extras.push(plural(impact.heatCycles, 'heat cycle'));
  if (impact.quoteItems) extras.push(plural(impact.quoteItems, 'quote item'));
  if (impact.clientGroups)
    extras.push(plural(impact.clientGroups, 'client group'));
  if (impact.pairings) extras.push(plural(impact.pairings, 'pairing'));
  if (impact.breedingPlanSteps)
    extras.push(plural(impact.breedingPlanSteps, 'breeding plan step'));
  if (impact.calendarEvents)
    extras.push(plural(impact.calendarEvents, 'calendar event'));
  if (extras.length) lines.push(extras.join(', '));
  return lines;
}

export function preservedLines(impact: LitterDeleteImpact): string[] {
  const lines: string[] = [];
  if (impact.puppies)
    lines.push(plural(impact.puppies, 'puppy', 'puppies'));
  lines.push(...destroyedLines(impact));
  const extras: string[] = [];
  if (impact.invoices) extras.push(plural(impact.invoices, 'invoice'));
  if (impact.expenses) extras.push(plural(impact.expenses, 'expense'));
  if (impact.contracts) extras.push(plural(impact.contracts, 'contract'));
  if (impact.reservations)
    extras.push(plural(impact.reservations, 'reservation'));
  if (impact.applications)
    extras.push(plural(impact.applications, 'application'));
  if (impact.waitingList)
    extras.push(
      plural(impact.waitingList, 'waiting list entry', 'waiting list entries'),
    );
  if (impact.heatCycles) extras.push(plural(impact.heatCycles, 'heat cycle'));
  if (impact.quoteItems) extras.push(plural(impact.quoteItems, 'quote item'));
  if (impact.clientGroups)
    extras.push(plural(impact.clientGroups, 'client group'));
  if (impact.pairings) extras.push(plural(impact.pairings, 'pairing'));
  if (impact.breedingPlanSteps)
    extras.push(plural(impact.breedingPlanSteps, 'breeding plan step'));
  if (impact.calendarEvents)
    extras.push(plural(impact.calendarEvents, 'calendar event'));
  if (extras.length) lines.push(extras.join(', '));
  return lines;
}

export function dangerTitle(
  mode: LitterDangerMode,
  litterName: string | null | undefined,
): string {
  const label = litterLabel(litterName);
  return mode === 'archive' ? `Archive “${label}”?` : `Delete “${label}”?`;
}

type CountClient = {
  from: (table: string) => {
    select: (
      columns: string,
      options?: { count?: 'exact'; head?: boolean },
    ) => {
      eq: (
        column: string,
        value: string,
      ) => PromiseLike<{
        count: number | null;
        data: unknown;
        error: { message: string } | null;
      }> & {
        maybeSingle: () => PromiseLike<{
          data: { name: string | null } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

async function countEq(
  supabase: CountClient,
  table: string,
  column: string,
  id: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq(column, id);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Live row counts for the delete/archive confirmation. */
export async function fetchLitterDeleteImpact(
  supabase: CountClient,
  litterId: string,
): Promise<LitterDeleteImpact> {
  const { data: litter, error: litterError } = await supabase
    .from('litters')
    .select('name')
    .eq('id', litterId)
    .maybeSingle();
  if (litterError) throw new Error(litterError.message);
  if (!litter) throw new Error('Litter not found.');

  const [
    puppies,
    healthRecords,
    photos,
    financialEntries,
    litterTodos,
    todoItems,
    invoices,
    expenses,
    contracts,
    reservations,
    applications,
    waitingList,
    heatCycles,
    quoteItems,
    clientGroups,
    pairings,
    breedingPlanSteps,
    calendarEvents,
  ] = await Promise.all([
    countEq(supabase, 'dogs', 'litter_id', litterId),
    countEq(supabase, 'puppy_health_records', 'litter_id', litterId),
    countEq(supabase, 'litter_media', 'litter_id', litterId),
    countEq(supabase, 'litter_transactions', 'litter_id', litterId),
    countEq(supabase, 'litter_todos', 'litter_id', litterId),
    countEq(supabase, 'todo_items', 'litter_id', litterId),
    countEq(supabase, 'invoices', 'litter_id', litterId),
    countEq(supabase, 'expenses', 'litter_id', litterId),
    countEq(supabase, 'contracts', 'litter_id', litterId),
    countEq(supabase, 'reservations', 'litter_id', litterId),
    countEq(supabase, 'applications', 'litter_interest_id', litterId),
    countEq(supabase, 'waiting_list', 'assigned_litter_id', litterId),
    countEq(supabase, 'heat_cycles', 'resulting_litter_id', litterId),
    countEq(supabase, 'quote_items', 'litter_id', litterId),
    countEq(supabase, 'client_groups', 'litter_id', litterId),
    countEq(supabase, 'pairings', 'litter_id', litterId),
    countEq(supabase, 'breeding_plan_steps', 'litter_id', litterId),
    countEq(supabase, 'calendar_events', 'litter_id', litterId),
  ]);

  return {
    litterId,
    litterName: litter.name,
    puppies,
    healthRecords,
    photos,
    financialEntries,
    taskItems: litterTodos + todoItems,
    invoices,
    expenses,
    contracts,
    reservations,
    applications,
    waitingList,
    heatCycles,
    quoteItems,
    clientGroups,
    pairings,
    breedingPlanSteps,
    calendarEvents,
  };
}
