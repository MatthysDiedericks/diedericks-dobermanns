export type HandoverBlocker = {
  id: 'microchip' | 'contract' | 'balance' | 'vaccinations';
  label: string;
};

export function handoverBlockers(args: {
  microchipNumber: string | null | undefined;
  hasSignedContract: boolean;
  hasAnyContract: boolean;
  outstandingBalance: number;
  vaccinationsIncomplete: boolean;
}): HandoverBlocker[] {
  const out: HandoverBlocker[] = [];
  if (!args.microchipNumber?.trim()) {
    out.push({ id: 'microchip', label: 'Microchip not recorded' });
  }
  if (!args.hasSignedContract) {
    out.push({
      id: 'contract',
      label: args.hasAnyContract ? 'Contract unsigned' : 'No contract yet',
    });
  }
  if (args.outstandingBalance > 0) {
    out.push({ id: 'balance', label: 'Balance outstanding' });
  }
  if (args.vaccinationsIncomplete) {
    out.push({ id: 'vaccinations', label: 'Vaccinations incomplete' });
  }
  return out;
}
