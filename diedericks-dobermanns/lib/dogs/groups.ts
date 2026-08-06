/**
 * Shared dog groupings used anywhere staff need to browse the roster by
 * "kind of dog" rather than raw status/tier columns (e.g. the dog picker in
 * the admin media screen). Mirrored on the web under
 * src/lib/dogs/groups.ts — keep both in sync.
 *
 * A dog can legitimately land in more than one group (an Elite Developed dog
 * that is also currently available), since status and programme_tier are
 * independent facets. That's intentional, not a bug.
 */
export type DogGroupable = {
  status: string | null;
  programme_tier: string | null;
};

export type DogGroupDefinition = {
  key: string;
  label: string;
  match: (dog: DogGroupable) => boolean;
};

export const DOG_GROUPS: DogGroupDefinition[] = [
  {
    key: 'breeding',
    label: 'Breeding Stock',
    match: (d) => ['keep', 'stud'].includes(d.status ?? ''),
  },
  {
    key: 'training',
    label: 'In Training',
    match: (d) => d.status === 'in_training',
  },
  {
    key: 'elite',
    label: 'Elite Developed',
    match: (d) => d.programme_tier === 'elite_developed',
  },
  {
    key: 'protection',
    label: 'Elite Family Protection Dogs',
    match: (d) => d.programme_tier === 'protection_dog',
  },
  {
    key: 'puppies',
    label: 'Available Puppies',
    match: (d) => d.status === 'available',
  },
  {
    key: 'sold',
    label: 'Sold / Placed',
    match: (d) => d.status === 'sold',
  },
];

export type DogGroup<T> = {
  key: string;
  label: string;
  dogs: T[];
};

/** Buckets dogs into DOG_GROUPS, dropping any group with zero matches. */
export function groupDogs<T extends DogGroupable>(dogs: T[]): DogGroup<T>[] {
  return DOG_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    dogs: dogs.filter(group.match),
  })).filter((group) => group.dogs.length > 0);
}
