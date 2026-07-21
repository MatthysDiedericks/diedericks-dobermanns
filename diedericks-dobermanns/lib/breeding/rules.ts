import type { BreedingDog, PairingRecord, PairingValidity, AgeGateResult } from '@/types/breeding';
import { CROSS_SIBLING_PAIRING_KEYS } from '@/lib/breeding/constants';

const PROHIBITED_PAIRS = [
  {
    sire: 'Hunter',
    dam: 'Hailey',
    reason: "Father/daughter — Hunter is Hailey's sire (pedigree confirmed)",
  },
  {
    sire: 'Hunter',
    dam: 'Cendra',
    reason: "Father/daughter — Hunter is Cendra's sire (pedigree confirmed)",
  },
  {
    sire: 'Santini',
    dam: 'Hannah',
    reason: 'Half-siblings — both sired by Napoleon Betelges',
  },
  {
    sire: 'Hunter',
    dam: 'Hannah',
    reason: "Uncle/niece — Havana Betelges is Hunter's full sister and Hannah's dam",
    // One-time exception — approved by Matt 2026-07-21 as a deliberate line-breeding
    // decision (Bliksem, the intended outcross sire, was unavailable due to illness).
    // Both dogs are confirmed DCM-clear on all 3 commercial markers (PDK4, RBM20,
    // TITIN — Inqaba Biotech, see documents table). Baseline uncle/niece COI is
    // ~12.5%; the true pedigree COI hasn't been computed yet (ancestor import is
    // still in progress), so treat this as informed, not fully verified. This
    // exception applies ONLY to this specific pair — do not copy this pattern to
    // approve other prohibited pairs without the same review.
    exceptionApproved: true,
    exceptionNote:
      'Line-breeding exception approved 2026-07-21. Both dogs DCM-clear (PDK4/RBM20/TITIN). Pedigree COI not yet fully computed — monitor litter closely.',
  },
  {
    sire: 'Hunter',
    dam: 'Cyrus',
    reason: "Father/daughter — Hunter is Cyrus Pup's sire (owner confirmed)",
  },
  {
    sire: 'DC Son',
    dam: 'Claire',
    reason: "Half-siblings via Dharkha Betelges — D/C Son's sire is Dharkha; Claire's sire is Dharkha",
  },
  {
    sire: 'DC Son',
    dam: 'Kim',
    reason: "Half-siblings via Dharkha Betelges — D/C Son's sire is Dharkha; Kim's sire is Dharkha",
  },
  { sire: 'Claire', dam: 'DC Son', reason: 'Half-siblings via Dharkha Betelges' },
  { sire: 'Kim', dam: 'DC Son', reason: 'Half-siblings via Dharkha Betelges' },
] as const;

function isDCSon(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('dc son') || n.includes('d/c son');
}

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
    (p) =>
      (nameIncludes(sire.name, p.sire) && nameIncludes(dam.name, p.dam)) ||
      (nameIncludes(sire.name, p.dam) && nameIncludes(dam.name, p.sire)),
  );
  if (hardBlock && !('exceptionApproved' in hardBlock && hardBlock.exceptionApproved)) {
    return { allowed: false, reason: hardBlock.reason, coi_flag: false };
  }
  if (hardBlock && 'exceptionApproved' in hardBlock && hardBlock.exceptionApproved) {
    return {
      allowed: true,
      reason: `Approved line-breeding exception — ${hardBlock.reason}. ${
        'exceptionNote' in hardBlock ? hardBlock.exceptionNote : ''
      }`,
      coi_flag: true,
    };
  }

  const sireIsDCSon = isDCSon(sire.name);
  if (sireIsDCSon && dam.mother_id && sire.mother_id && dam.mother_id === sire.mother_id) {
    return {
      allowed: false,
      reason:
        "Half-siblings via Cleopatra — D/C Son's dam is Cleopatra; this dog's dam is also Cleopatra",
      coi_flag: false,
    };
  }

  if (
    (nameIncludes(sire.name, 'Odessa') && nameIncludes(dam.name, 'Kim')) ||
    (nameIncludes(dam.name, 'Odessa') && nameIncludes(sire.name, 'Kim'))
  ) {
    return {
      allowed: false,
      reason:
        "Half-siblings via Odessa — Kim's dam is Raconti Odessa. Odessa offspring and Kim offspring cannot breed.",
      coi_flag: false,
    };
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

/** Santini and other DCM-flagged sires — all pups sale-only. */
export function isSaleOnlySire(sire: BreedingDog): boolean {
  return sire.flag_dcm_carrier === true || nameIncludes(sire.name, 'Santini');
}

/** Banner when D/C Son is selected as sire in Pairing Builder. */
export function getBridgeSireBanner(sire: BreedingDog): string | null {
  if (isDCSon(sire.name)) {
    return '✓ Bridge Sire selected — D/C Son can breed all Hunter daughters (sire is Dharkha, not Hunter). COI = 0% with Hunter offspring.';
  }
  return null;
}
