import type { BreedingDog, AgeGateResult } from '@/types/breeding';

// Pairing legality (prohibited pairs, half-sibling checks, cross-litter
// origin checks) and COI now live solely in the `evaluate_pairing` Postgres
// function — see lib/breeding/evaluatePairing.ts and PARITY PROMPT 4. Do not
// re-add pairing-legality logic here; it must only exist in one place.

function nameIncludes(name: string, fragment: string): boolean {
  return name.toLowerCase().includes(fragment.toLowerCase());
}

export function healthGatePassed(dog: BreedingDog): boolean {
  // Only 3 DCM markers exist as commercial genetic tests for Dobermanns today
  // (PDK4, RBM20, TITIN — see health_dcm1/2/3, mapped in that order). dcm4/dcm5
  // are reserved for future markers that don't exist yet, so they must not be
  // required to equal 'Clear' — every dog would fail the gate forever otherwise.
  // They still block the gate if a future test comes back Carrier/Affected.
  const dcm1to3Clear =
    dog.health_dcm1 === 'Clear' && dog.health_dcm2 === 'Clear' && dog.health_dcm3 === 'Clear';
  const dcm4Ok = dog.health_dcm4 == null || dog.health_dcm4 === 'Clear' || dog.health_dcm4 === 'Pending';
  const dcm5Ok = dog.health_dcm5 == null || dog.health_dcm5 === 'Clear' || dog.health_dcm5 === 'Pending';
  const hdOk = dog.health_hd === 'A' || dog.health_hd === 'B';
  const edOk = dog.health_ed === '0' || dog.health_ed === '1';
  return dcm1to3Clear && dcm4Ok && dcm5Ok && hdOk && edOk;
}

export function healthGatePending(dog: BreedingDog): boolean {
  // dcm4/dcm5 are reserved for DCM markers that don't exist as commercial tests
  // yet — a dog being null on those isn't "pending," there's simply nothing to
  // run. Only the 3 real markers (dcm1-3) plus HD/ED count toward "pending".
  const fields = [dog.health_dcm1, dog.health_dcm2, dog.health_dcm3, dog.health_hd, dog.health_ed];
  return fields.some((f) => f === 'Pending' || f == null);
}

export function ageGatePassed(dam: BreedingDog, breedingDate: Date): AgeGateResult {
  if (!dam.date_of_birth) {
    return { passed: false, warning: 'Dam date of birth unknown — cannot verify age' };
  }
  const ageMonths =
    (breedingDate.getTime() - new Date(dam.date_of_birth).getTime()) /
    (1000 * 60 * 60 * 24 * 30);
  if (ageMonths < 18) {
    return { passed: false, warning: 'Dam is under 18 months — too young to breed' };
  }
  if (ageMonths < 24) {
    return {
      passed: true,
      warning: 'Dam is under 24 months — first litter ideally at 24+ months',
    };
  }
  return { passed: true };
}

export function damAgeMonths(dam: BreedingDog, asOf = new Date()): number | null {
  if (!dam.date_of_birth) return null;
  return Math.floor(
    (asOf.getTime() - new Date(dam.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 30),
  );
}

/** Santini and other DCM-flagged sires — all pups sale-only. */
export function isSaleOnlySire(sire: BreedingDog): boolean {
  return sire.flag_dcm_carrier === true || nameIncludes(sire.name, 'Santini');
}

/** Banner when D/C Son is selected as sire in Pairing Builder. */
export function getBridgeSireBanner(sire: BreedingDog): string | null {
  const isDCSon = nameIncludes(sire.name, 'dc son') || nameIncludes(sire.name, 'd/c son');
  if (isDCSon) {
    return '✓ Bridge Sire selected — D/C Son can breed all Hunter daughters (sire is Dharkha, not Hunter). COI = 0% with Hunter offspring.';
  }
  return null;
}
