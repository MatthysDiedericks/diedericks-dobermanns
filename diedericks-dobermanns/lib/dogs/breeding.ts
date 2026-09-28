/**
 * Which dogs carry a breeding record.
 *
 * A kennel dog is not the same thing. Cuba is deceased, so she is not a
 * kennel dog, and she still bred. Kim is keep and has never had a litter;
 * she is a breeding dog with nothing attributed yet.
 *
 * Keep in lockstep with diedericksdobermann-web/src/lib/dogs/breeding.ts.
 *
 * status in ('keep','stud')
 *   or exists (select 1 from litters where mother_id = d.id or father_id = d.id)
 */

const BREEDING_STATUSES = new Set(["keep", "stud"]);

export function isBreedingDog(input: {
  status?: string | null;
  /** True when this dog is mother_id or father_id on at least one litter. */
  hasProducedLitter?: boolean;
}): boolean {
  const status = (input.status ?? "").toLowerCase();
  if (BREEDING_STATUSES.has(status)) return true;
  return input.hasProducedLitter === true;
}
