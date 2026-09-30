/**
 * Split one expense across the dogs a person picked.
 * Equal by default, in cents. Leftover cents go one each to the first dogs
 * by birth order, then name, so the shares add up to the line exactly.
 */

import { wasOnPropertyOn, type DogLifecycle } from "@/lib/finance/dogDays";
import { fromCents, toCents } from "@/lib/finance/resolveAllocations";

export type PickerDog = DogLifecycle & {
  id: string;
  name: string;
  status: string | null;
  litterId: string | null;
  litterLabel: string | null;
  birthOrder: number | null;
  category: string | null;
};

export type SelectedShare = {
  dogId: string;
  litterId: string | null;
  amount: number;
  weight: number;
  basisNote: string;
};

const KENNEL_STATUSES = new Set(["keep", "stud", "in_training"]);
const LEFT_STATUSES = new Set(["sold", "deceased", "donated", "gifted", "retired"]);

export function selectedBasisNote(count: number, uneven: boolean): string {
  return uneven
    ? `Uneven amounts across ${count} selected dogs`
    : `Split equally across ${count} selected dogs`;
}

/** birth_order, then name. Dogs with no birth order sort after those that have one. */
export function sortDogsForRemainder<T extends { name: string; birthOrder: number | null }>(
  dogs: T[],
): T[] {
  return [...dogs].sort((a, b) => {
    const ao = a.birthOrder ?? Number.MAX_SAFE_INTEGER;
    const bo = b.birthOrder ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name, "en");
  });
}

/**
 * Equal split in cents. The remainder (total % count) is one extra cent
 * on each of the first N dogs after sortDogsForRemainder.
 */
export function splitEqualCents(amount: number, count: number): number[] {
  if (count <= 0) return [];
  const totalCents = toCents(amount);
  const base = Math.floor(totalCents / count);
  const extra = totalCents - base * count;
  return Array.from({ length: count }, (_, i) => fromCents(base + (i < extra ? 1 : 0)));
}

export function equalSelectedShares(amount: number, dogs: PickerDog[]): SelectedShare[] {
  const ordered = sortDogsForRemainder(dogs);
  const amounts = splitEqualCents(amount, ordered.length);
  const note = selectedBasisNote(ordered.length, false);
  return ordered.map((dog, i) => ({
    dogId: dog.id,
    litterId: dog.litterId,
    amount: amounts[i] ?? 0,
    weight: 1,
    basisNote: note,
  }));
}

export function unevenSelectedShares(
  dogs: PickerDog[],
  amountsById: Record<string, number>,
): SelectedShare[] {
  const ordered = sortDogsForRemainder(dogs);
  const note = selectedBasisNote(ordered.length, true);
  return ordered.map((dog) => ({
    dogId: dog.id,
    litterId: dog.litterId,
    amount: fromCents(toCents(amountsById[dog.id] ?? 0)),
    weight: 1,
    basisNote: note,
  }));
}

export function remainingCents(total: number, amounts: number[]): number {
  return toCents(total) - amounts.reduce((sum, n) => sum + toCents(n), 0);
}

export function departedSelectedDogs(dogs: PickerDog[], expenseDate: string): PickerDog[] {
  const on = new Date(`${expenseDate.slice(0, 10)}T00:00:00.000Z`);
  return dogs.filter((dog) => !wasOnPropertyOn(dog, on));
}

export function planSelectedSplit(input: {
  amount: number;
  expenseDate: string;
  dogs: PickerDog[];
  uneven: boolean;
  amountsById?: Record<string, number>;
}): { error: string } | { shares: SelectedShare[] } {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { error: "Enter an amount before splitting it." };
  }
  if (input.dogs.length === 0) {
    return { error: "Select at least one dog." };
  }
  const departed = departedSelectedDogs(input.dogs, input.expenseDate);
  if (departed.length > 0) {
    const names = departed.map((dog) => dog.name).join(", ");
    return {
      error: `${names} had already left on ${input.expenseDate.slice(0, 10)}. Remove them from this split.`,
    };
  }
  const shares = input.uneven
    ? unevenSelectedShares(input.dogs, input.amountsById ?? {})
    : equalSelectedShares(input.amount, input.dogs);
  const gap = remainingCents(
    input.amount,
    shares.map((share) => share.amount),
  );
  if (gap !== 0) {
    const rands = (Math.abs(gap) / 100).toFixed(2);
    return {
      error:
        gap > 0
          ? `R${rands} still to assign. The split has to come to exactly the expense amount.`
          : `The dog amounts are R${rands} over the expense. Bring the remainder to R0,00.`,
    };
  }
  return { shares };
}

function isPuppyRow(dog: PickerDog): boolean {
  if (!dog.litterId) return false;
  const status = dog.status ?? "";
  if (LEFT_STATUSES.has(status)) return false;
  if (status === "keep" || status === "stud") return false;
  return true;
}

export type DogPickerGroups = {
  kennel: PickerDog[];
  litters: { id: string; label: string; puppies: PickerDog[] }[];
  training: PickerDog[];
};

/**
 * Three lists Matt can mix. A dog appears once.
 * Kennel: keep, stud, and kennel-owned dogs in training.
 * Puppies: still with a litter, including puppies from different litters.
 * Training: client-owned dogs in training (on the truck, whoever owns them).
 */
export function groupDogsForPicker(dogs: PickerDog[]): DogPickerGroups {
  const puppies = dogs.filter(isPuppyRow);
  const puppyIds = new Set(puppies.map((dog) => dog.id));
  const kennel = dogs.filter((dog) => {
    if (puppyIds.has(dog.id)) return false;
    if (!KENNEL_STATUSES.has(dog.status ?? "")) return false;
    return (dog.ownership_status ?? "kennel") !== "with_owner";
  });
  const kennelIds = new Set(kennel.map((dog) => dog.id));
  const training = dogs.filter((dog) => {
    if (puppyIds.has(dog.id) || kennelIds.has(dog.id)) return false;
    return dog.status === "in_training";
  });

  const byLitter = new Map<string, PickerDog[]>();
  for (const puppy of puppies) {
    const id = puppy.litterId as string;
    const list = byLitter.get(id) ?? [];
    list.push(puppy);
    byLitter.set(id, list);
  }

  const byName = (a: PickerDog, b: PickerDog) => a.name.localeCompare(b.name, "en");
  const litters = [...byLitter.entries()]
    .map(([id, rows]) => ({
      id,
      label: rows.find((row) => row.litterLabel)?.litterLabel ?? "Litter",
      puppies: sortDogsForRemainder(rows),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "en"));

  return {
    kennel: kennel.sort(byName),
    litters,
    training: training.sort(byName),
  };
}

export function filterPickerGroups(groups: DogPickerGroups, query: string): DogPickerGroups {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  const hit = (dog: PickerDog) => dog.name.toLowerCase().includes(q);
  return {
    kennel: groups.kennel.filter(hit),
    training: groups.training.filter(hit),
    litters: groups.litters
      .map((litter) => ({
        ...litter,
        puppies: litter.label.toLowerCase().includes(q) ? litter.puppies : litter.puppies.filter(hit),
      }))
      .filter((litter) => litter.puppies.length > 0),
  };
}
