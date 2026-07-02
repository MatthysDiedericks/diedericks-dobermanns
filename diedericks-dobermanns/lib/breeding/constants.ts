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
  Bridge: '#006666',
  Sale: '#3D1A6B',
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
    key: 'dc_son_odessa_daughter',
    line: 'Bridge' as const,
    label: 'D/C Son × Hunter/Odessa Daughter',
    notes: 'Core Line B Gen 2. D/C Son sire = Dharkha — 0% COI with all Hunter daughters.',
    coi: '0%',
  },
  {
    key: 'dc_son_kim_daughter',
    line: 'Bridge' as const,
    label: 'D/C Son × Hunter/Kim Daughter',
    notes: 'Second Line B dam branch. 0% COI.',
    coi: '0%',
  },
  {
    key: 'a_within',
    line: 'A' as const,
    label: 'Line A Sire 2 × Line A Dams (separate litter daughters only)',
    notes: 'Within-line. Verify COI. Same-litter sisters of Line A Sire 2 are PROHIBITED.',
    coi: 'Calculate before confirming',
  },
  {
    key: 'hannah_line_a',
    line: 'Cross' as const,
    label: 'Line A Sire 2 × Hannah',
    notes: "COI ≈ 1.95% — Hannah's primary programme pairing. Retain best female → Line A pool.",
    coi: '~1.95%',
  },
  {
    key: 'dc_son_cyrus_pup',
    line: 'Bridge' as const,
    label: 'D/C Son × Cyrus Pup',
    notes: 'Premium pups. 0% COI. Cyrus pup must pass full DCM1–5 + Holter before breeding.',
    coi: '0%',
  },
  {
    key: 'hannah_dc_alternative',
    line: 'Cross' as const,
    label: 'D/C Son × Hannah (alternative)',
    notes: 'COI ≈ 3.125% via Chico/Chiquita Betelges. Use if Line A Sire 2 unavailable.',
    coi: '~3.125%',
  },
  {
    key: 'dc_son_hailey_daughters',
    line: 'Bridge' as const,
    label: 'D/C Son × Hailey Daughters',
    notes: "After Santini × Hailey litter. D/C Son can breed Hailey's daughters — 0% COI.",
    coi: '0%',
  },
  {
    key: 'dc_son_cendra_daughters',
    line: 'Bridge' as const,
    label: 'D/C Son × Cendra Daughters',
    notes: "After Santini × Cendra litter. D/C Son can breed Cendra's daughters — 0% COI.",
    coi: '0%',
  },
];

export const BRIDGE_SIRE_NAME_FRAGMENT = 'D/C Son';
export const DHARKHA_NAME_FRAGMENT = 'Dharkha';
export const HUNTER_NAME_FRAGMENT = 'Hunter';
export const CLEOPATRA_NAME_FRAGMENT = 'Cleopatra';
export const DC_SON_DAM_FRAGMENT = 'Cleopatra';

export const DC_SON_CAN_BREED_FRAGMENTS = ['Hailey', 'Cendra'] as const;

export const DC_SON_CANNOT_BREED_FRAGMENTS = ['Claire', 'Kim'] as const;
