import type { WaitingListEntry } from '@/types/app.types';

import { sexesConflict } from '@/lib/waitlist/allocationDecision';
import { entryDisplayName } from '@/lib/waitlist/helpers';
import {
  isMatchableDogStatus,
  rankBuyersForDog,
  type MatchableDog,
  type MatchCandidate,
} from '@/lib/waitlist/matching';

export type AllocationPuppy = MatchableDog & {
  birth_order?: number | null;
  collar_colour?: string | null;
  reserved_for_name?: string | null;
};

/** A line on the board. `proposed` has not been written. */
export type WorkingAllocation = {
  puppyId: string;
  entryId: string;
  source: 'saved' | 'proposed';
  /** Recorded only when a sex mismatch was explicitly overridden. */
  sexOverride?: string;
};

export function takenEntryIds(
  allocations: WorkingAllocation[],
  exceptPuppyId?: string,
): Set<string> {
  return new Set(
    allocations.filter((a) => a.puppyId !== exceptPuppyId).map((a) => a.entryId),
  );
}

/** Ranked buyers for one puppy, minus anyone already placed on a sibling. */
export function rankedBuyersForPuppy(
  entries: WaitingListEntry[],
  puppy: MatchableDog,
  allocations: WorkingAllocation[],
): MatchCandidate[] {
  const taken = takenEntryIds(allocations, puppy.id);
  return rankBuyersForDog(
    entries.filter((entry) => !taken.has(entry.id)),
    puppy,
  );
}

/**
 * Place one buyer on one puppy in the working set.
 * A second puppy for the same buyer is refused unless `override` is set.
 */
export function assignBuyer(
  allocations: WorkingAllocation[],
  puppyId: string,
  entryId: string,
  options?: { override?: boolean; sexOverride?: string },
): { allocations: WorkingAllocation[]; error?: string } {
  const conflict = allocations.find(
    (a) => a.entryId === entryId && a.puppyId !== puppyId,
  );
  if (conflict && !options?.override) {
    return {
      allocations,
      error: 'This buyer already has a puppy in this litter.',
    };
  }
  let next = allocations.filter((a) => a.puppyId !== puppyId);
  if (options?.override) {
    next = next.filter((a) => a.entryId !== entryId);
  }
  next = [...next, { puppyId, entryId, source: 'proposed', sexOverride: options?.sexOverride }];
  return { allocations: next };
}

/** Drop the working line for this puppy and restore a saved line if there was one. */
export function undoAllocation(
  allocations: WorkingAllocation[],
  puppyId: string,
  baseline: WorkingAllocation[],
): WorkingAllocation[] {
  const rest = allocations.filter((a) => a.puppyId !== puppyId);
  const saved = baseline.find((a) => a.puppyId === puppyId && a.source === 'saved');
  return saved ? [...rest, saved] : rest;
}

function byBirthOrder<T extends { birth_order?: number | null; name: string }>(
  a: T,
  b: T,
): number {
  const ao = a.birth_order ?? Number.POSITIVE_INFINITY;
  const bo = b.birth_order ?? Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao - bo;
  return a.name.localeCompare(b.name);
}

/**
 * Walk the litter in birth order and take the best buyer who is not already
 * placed. Returns a proposal. Does not write anything.
 */
export function suggestLitterAllocation(
  puppies: AllocationPuppy[],
  entries: WaitingListEntry[],
  existing: WorkingAllocation[],
): WorkingAllocation[] {
  const saved = existing.filter((a) => a.source === 'saved');
  const proposed: WorkingAllocation[] = [];
  for (const puppy of [...puppies].sort(byBirthOrder)) {
    if (!isMatchableDogStatus(puppy.status)) continue;
    if (saved.some((a) => a.puppyId === puppy.id)) continue;
    const best = rankedBuyersForPuppy(entries, puppy, [...saved, ...proposed]).find(
      (candidate) => !sexesConflict(candidate.entry.preferred_sex, puppy.sex),
    );
    if (!best) continue;
    proposed.push({
      puppyId: puppy.id,
      entryId: best.entry.id,
      source: 'proposed',
    });
  }
  return [...saved, ...proposed];
}

export function siblingGroups<
  T extends { id: string; sibling_group_id?: string | null },
>(entries: T[]): { groupId: string; members: T[] }[] {
  const map = new Map<string, T[]>();
  for (const entry of entries) {
    if (!entry.sibling_group_id) continue;
    const list = map.get(entry.sibling_group_id) ?? [];
    list.push(entry);
    map.set(entry.sibling_group_id, list);
  }
  return [...map.entries()]
    .filter(([, members]) => members.length > 1)
    .map(([groupId, members]) => ({ groupId, members }));
}

/** One line per group, so the two requests are read together. */
export function siblingGroupLines(entries: WaitingListEntry[]): string[] {
  return siblingGroups(entries).map((group) => {
    const names = group.members.map((member) => entryDisplayName(member)).join(' and ');
    return `Sibling group: ${names} want ${group.members.length} puppies from the same litter`;
  });
}

export type Placement = 'allocated' | 'unallocated' | 'reserved' | 'other';

export function puppyPlacement(
  puppy: { id: string; status?: string | null; reserved_for_name?: string | null },
  allocations: WorkingAllocation[],
): Placement {
  if (allocations.some((a) => a.puppyId === puppy.id)) return 'allocated';
  if (puppy.status === 'reserved' || puppy.reserved_for_name) return 'reserved';
  if (puppy.status === 'available') return 'unallocated';
  return 'other';
}

export function litterPlacementCounts(
  puppies: { id: string; status?: string | null; reserved_for_name?: string | null }[],
  allocations: WorkingAllocation[],
): { allocated: number; unallocated: number; reserved: number } {
  const counts = { allocated: 0, unallocated: 0, reserved: 0 };
  for (const puppy of puppies) {
    const place = puppyPlacement(puppy, allocations);
    if (place === 'other') continue;
    counts[place] += 1;
  }
  return counts;
}
