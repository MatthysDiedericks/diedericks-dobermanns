export type LitterParentageOption = {
  id: string;
  label: string;
  sireId: string | null;
  damId: string | null;
  sireName: string | null;
  damName: string | null;
};

export function litterOptionLabel(args: {
  name: string | null;
  litterLetter: string | null;
  actualDate: string | null;
  expectedDate: string | null;
  sireName: string | null;
  damName: string | null;
}): string {
  const pair =
    args.damName && args.sireName
      ? `${args.damName} × ${args.sireName}`
      : args.name?.trim() ||
        (args.litterLetter ? `Litter ${args.litterLetter}` : 'Unnamed litter');
  const date = args.actualDate || args.expectedDate;
  return date ? `${pair} · ${date}` : pair;
}

/** Read-only copy shown the moment a litter is picked. Display only — the trigger assigns. */
export function inheritedParentageText(litter: LitterParentageOption | undefined): string | null {
  if (!litter) return null;
  const sire = litter.sireName?.trim() || null;
  const dam = litter.damName?.trim() || null;
  if (!sire && !dam) {
    return 'This litter has no sire or dam recorded — the puppy will have no pedigree until you set them.';
  }
  if (sire && dam) {
    return `Sire: ${sire} · Dam: ${dam} (from the litter)`;
  }
  const parts = [
    sire ? `Sire: ${sire}` : 'Sire: not recorded',
    dam ? `Dam: ${dam}` : 'Dam: not recorded',
  ];
  return `${parts.join(' · ')} (from the litter)`;
}

export function parentageDiffersFromLitter(
  litter: LitterParentageOption | undefined,
  fatherId: string | null | undefined,
  motherId: string | null | undefined,
): boolean {
  if (!litter) return false;
  const father = fatherId?.trim() || null;
  const mother = motherId?.trim() || null;
  if (father && father !== litter.sireId) return true;
  if (mother && mother !== litter.damId) return true;
  return false;
}
