export const BUYER_LOCATION_TYPES = ['sa', 'sadc', 'international'] as const;
export type BuyerLocationType = (typeof BUYER_LOCATION_TYPES)[number];

export const BUYER_LOCATION_OPTIONS: { value: BuyerLocationType; label: string }[] = [
  { value: 'sa', label: 'South Africa' },
  {
    value: 'sadc',
    label: 'A SADC country — Eswatini, Namibia, Botswana, Mozambique, Zimbabwe and neighbours',
  },
  { value: 'international', label: 'International — anywhere else in the world' },
];

export const EXPORT_NOTE_TITLE = 'Buying from outside South Africa';

export const EXPORT_NOTE_BODY =
  'Your dog is handed over to you or your agent in South Africa. Getting it home is arranged and paid for by you, and those costs are not included in the quoted price. Depending on your country they can include administration, an export agent, flights, health tests, veterinary inspections and transport.\n\nWe will put you in touch with an export agent who will confirm exactly what your country requires and what it will cost.';

export const EXPORT_CHECKBOX_LABEL =
  'I understand that export costs are not included in the quoted price.';

export function needsExportAck(type: string | null | undefined): boolean {
  return type === 'sadc' || type === 'international';
}

export function locationBadge(type: string | null | undefined): 'SADC' | 'International' | null {
  if (type === 'sadc') return 'SADC';
  if (type === 'international') return 'International';
  return null;
}

export function locationLabel(type: string | null | undefined): string {
  if (type === 'sa') return 'South Africa';
  if (type === 'sadc') return 'SADC';
  if (type === 'international') return 'International';
  return '—';
}
