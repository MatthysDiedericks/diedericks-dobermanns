import type { BreedingDog, PairingRecord, PairingValidity, AgeGateResult } from '@/types/breeding';
import { CROSS_SIBLING_PAIRING_KEYS } from '@/lib/breeding/constants';

const PROHIBITED_PAIRS = [
  { sire: 'Hunter', dam: 'Hailey', reason: 'Father/daughter' },
  { sire: 'Hunter', dam: 'Cendra', reason: 'Father/daughter' },
  { sire: 'Santini', dam: 'Hannah', reason: 'Half-siblings (both by Napoleon Betelges)' },
  { sire: 'Hunter', dam: 'Hannah', reason: "Uncle/niece (Hunter's sister Havana is Hannah's dam)" },
] as const;

function nameIncludes(name: string, fragment: string): boolean {
  return name.toLowerCase().includes(fragment.toLowerCase());
}

function isCrossSiblingPairing(
  sireName: string,
  damName: string,
  keys: readonly (readonly [string, string])[],
): boolean {
  return keys.some(
    ([s, d]) => nameIncludes(sireName, s) && nameIncludes(damName, d),
  );
}

function sharesCrossLitterOrigin(
  sire: BreedingDog,
  dam: BreedingDog,
  pairings?: PairingRecord[],
): boolean {
  if (!pairings?.length || !sire.origin_pairing_id || !dam.origin_pairing_id) {
    if (sire.father_id && sire.father_id === dam.father_id) {
      return (
        isCrossSiblingPairing(sire.name, 'Claire', CROSS_SIBLING_PAIRING_KEYS) ||
        isCrossSiblingPairing(dam.name, 'Cendra', CROSS_SIBLING_PAIRING_KEYS) ||
        (nameIncludes(sire.name, 'Santini') && nameIncludes(dam.name, 'Claire')) ||
        false
      );
    }
    return false;
  }

  const sireOrigin = pairings.find((p) => p.id === sire.origin_pairing_id);
  const damOrigin = pairings.find((p) => p.id === dam.origin_pairing_id);
  if (!sireOrigin?.sire?.name || !damOrigin?.sire?.name) return false;

  const sireFromClaire = isCrossSiblingPairing(
    sireOrigin.sire.name,
    sireOrigin.dam?.name ?? '',
    [['Santini', 'Claire']],
  );
  const damFromCendra = isCrossSiblingPairing(
    damOrigin.sire.name,
    damOrigin.dam?.name ?? '',
    [['Santini', 'Cendra']],
  );
  const sireFromCendra = isCrossSiblingPairing(
    sireOrigin.sire.name,
    sireOrigin.dam?.name ?? '',
    [['Santini', 'Cendra']],
  );
  const damFromClaire = isCrossSiblingPairing(
    damOrigin.sire.name,
    damOrigin.dam?.name ?? '',
    [['Santini', 'Claire']],
  );

  return (sireFromClaire && damFromCendra) || (sireFromCendra && damFromClaire);
}

export function checkPairingValidity(
  sire: BreedingDog,
  dam: BreedingDog,
  options?: { pairings?: PairingRecord[] },
): PairingValidity {
  if (dam.father_id === sire.id) {
    return { allowed: false, reason: 'Father × Daughter — prohibited', coi_flag: false };
  }
  if (sire.mother_id === dam.id) {
    return { allowed: false, reason: 'Mother × Son — prohibited', coi_flag: false };
  }
  if (
    sire.father_id &&
    dam.father_id &&
    sire.mother_id &&
    dam.mother_id &&
    sire.father_id === dam.father_id &&
    sire.mother_id === dam.mother_id
  ) {
    return { allowed: false, reason: 'Full siblings — prohibited', coi_flag: false };
  }
  if (sire.father_id && sire.father_id === dam.father_id) {
    return { allowed: false, reason: 'Half-siblings (same sire) — prohibited', coi_flag: false };
  }
  if (sire.mother_id && sire.mother_id === dam.mother_id) {
    return { allowed: false, reason: 'Half-siblings (same dam) — prohibited', coi_flag: false };
  }

  const hardBlock = PROHIBITED_PAIRS.find(
    (p) => nameIncludes(sire.name, p.sire) && nameIncludes(dam.name, p.dam),
  );
  if (hardBlock) {
    return { allowed: false, reason: hardBlock.reason, coi_flag: false };
  }

  if (sharesCrossLitterOrigin(sire, dam, options?.pairings)) {
    return {
      allowed: false,
      reason:
        'Pups from Santini × Claire and Santini × Cendra share the same sire and half-sibling dams — do not cross',
      coi_flag: false,
    };
  }

  return { allowed: true, reason: '', coi_flag: false };
}

export function healthGatePassed(dog: BreedingDog): boolean {
  const dcmClear =
    dog.health_dcm1 === 'Clear' &&
    dog.health_dcm2 === 'Clear' &&
    dog.health_dcm3 === 'Clear' &&
    dog.health_dcm4 === 'Clear' &&
    dog.health_dcm5 === 'Clear';
  const hdOk = dog.health_hd === 'A' || dog.health_hd === 'B';
  const edOk = dog.health_ed === '0' || dog.health_ed === '1';
  return dcmClear && hdOk && edOk;
}

export function healthGatePending(dog: BreedingDog): boolean {
  const fields = [
    dog.health_dcm1,
    dog.health_dcm2,
    dog.health_dcm3,
    dog.health_dcm4,
    dog.health_dcm5,
    dog.health_hd,
    dog.health_ed,
  ];
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

export function estimateCoi(sire: BreedingDog, dam: BreedingDog): number {
  const sireCoi = sire.wrights_coi ?? 0;
  const damCoi = dam.wrights_coi ?? 0;
  return Math.round(((sireCoi + damCoi) / 2 + 2.5) * 100) / 100;
}

export function coiSeverity(coi: number): 'ok' | 'warning' | 'danger' {
  if (coi > 12.5) return 'danger';
  if (coi > 6.25) return 'warning';
  return 'ok';
}
