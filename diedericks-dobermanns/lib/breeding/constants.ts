export const BREEDING_DOG_SELECT =
  'id, name, call_name, sex, date_of_birth, father_id, mother_id, line, generation, breeding_role, urgency_flag, health_dcm1, health_dcm2, health_dcm3, health_dcm4, health_dcm5, health_hd, health_ed, holter_date, holter_result, wrights_coi, notes, origin_pairing_id, status, dog_media(url, is_primary)';

export const PLANNER_MALE_FILTER = ['keep', 'stud', 'breeding_stock'] as const;
export const PLANNER_FEMALE_FILTER = ['keep'] as const;
export const PLANNER_SIRE_ROLES = ['Sire', 'Both', 'Prospect'] as const;
export const PLANNER_DAM_ROLES = ['Dam', 'Both', 'Prospect'] as const;

export const MALE_CARD_SIZE = 80;
export const FEMALE_CARD_SIZE = 56;
export const COLUMN_MIN_WIDTH = 160;
export const COLUMN_MAX_VISIBLE = 3;

export const PAIRING_SELECT = `
  id, sire_id, dam_id, line, generation, status, priority,
  target_date, date_bred, coi_estimate, expected_litter_date, litter_id, notes,
  created_at, updated_at,
  sire:dogs!pairings_sire_id_fkey(${BREEDING_DOG_SELECT}),
  dam:dogs!pairings_dam_id_fkey(${BREEDING_DOG_SELECT})
`;

export const LINE_COLORS = {
  A: '#8B0000',
  B: '#1B2A6B',
  Cross: '#2D6A4F',
  Unknown: '#6B7280',
} as const;

export const PRIORITY_STYLES: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  Critical: { label: 'CRITICAL', bg: '#7F1D1D', text: '#FCA5A5' },
  Urgent: { label: 'URGENT', bg: '#9A3412', text: '#FDBA74' },
  High: { label: 'HIGH', bg: '#854D0E', text: '#FDE047' },
  Active: { label: 'ACTIVE', bg: '#C4A35A33', text: '#C4A35A' },
  Future: { label: 'FUTURE', bg: '#374151', text: '#9CA3AF' },
  Done: { label: 'COMPLETED', bg: '#14532D', text: '#86EFAC' },
  Prohibited: { label: 'PROHIBITED', bg: '#450A0A', text: '#FCA5A5' },
};

export const COI_WARNING = 6.25;
export const COI_DANGER = 12.5;

/** Pairings whose offspring must not be crossed with each other (half-sibling dams). */
export const CROSS_SIBLING_PAIRING_KEYS = [
  ['Santini', 'Claire'],
  ['Santini', 'Cendra'],
] as const;

export const GEN2_SUGGESTED_PAIRINGS = [
  {
    key: 'a_within',
    line: 'A' as const,
    label: 'Line A Sire 2 × Line A Dams',
    notes: 'Within-line. Check COI before confirming.',
  },
  {
    key: 'b_within',
    line: 'B' as const,
    label: 'Line B Sire 2 × Line B Dams + Kim daughters',
    notes: 'Within-line. Initially low COI.',
  },
  {
    key: 'a_cross',
    line: 'Cross' as const,
    label: 'Line A Sire 2 × Santini/Claire daughter',
    notes: 'Verify COI carefully — dam carries Santini genetics.',
  },
  {
    key: 'hannah_special',
    line: 'Cross' as const,
    label: 'Line B Sire 2 × Hannah',
    notes: 'Only viable pairing for Hannah. Retain female → Line A pool.',
  },
];
