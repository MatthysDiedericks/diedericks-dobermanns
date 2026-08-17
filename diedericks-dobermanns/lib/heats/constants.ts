export const HEAT_CYCLE_SELECT =
  'id, dog_id, heat_start_date, heat_end_date, proestrus_start_date, ' +
  'estrus_start_date, ovulation_date, mating_date, mating_type, ' +
  'sire_id, expected_whelp_date, actual_whelp_date, resulting_litter_id, ' +
  'status, is_predicted, actual_cycle_length_days, cycle_confirmed_at, ' +
  'progesterone_tests, cancelled_reason, notes, created_at, updated_at, ' +
  'pregnancy_status, pregnancy_confirmed_date, pregnancy_confirmed_method, ' +
  'pregnancy_notes, whelp_date_earliest, whelp_date_latest, ' +
  'go_home_earliest, go_home_latest, predicted_next_heat_date, ' +
  'whelp_date_basis, whelp_date_locked, forecast_offset_days, ' +
  'forecast_basis, forecast_range_earliest, forecast_range_latest';

export const MATING_SELECT =
  'id, heat_cycle_id, sire_id, external_sire_name, mated_at, mating_type, ' +
  'tie_minutes, successful, notes, created_at, updated_at';

export const PROG_TEST_SELECT =
  'id, heat_cycle_id, tested_at, value, unit, value_ng_ml, test_phase, ' +
  'lab, notes, created_at';

export const WHELP_TEMP_SELECT =
  'id, heat_cycle_id, taken_at, temp_c, notes, created_at';

export const WHELP_TEMP_DROP_C = 37.2;

export const MATING_TYPES = [
  { value: 'natural', label: 'Natural' },
  { value: 'ai_fresh', label: 'AI — fresh' },
  { value: 'ai_chilled', label: 'AI — chilled' },
  { value: 'ai_frozen', label: 'AI — frozen' },
] as const;

export const PREGNANCY_STATUS_OPTIONS = [
  { value: 'not_yet_known', label: 'Not yet known' },
  { value: 'not_pregnant', label: 'Not pregnant' },
  { value: 'pregnant', label: 'Pregnant' },
  { value: 'false_pregnancy', label: 'False pregnancy' },
  { value: 'loss_early', label: 'Loss before day 45' },
  { value: 'loss_late', label: 'Loss after day 45' },
  { value: 'loss_unspecified', label: 'Loss (unspecified)' },
] as const;

// Aliased to the app's internal field names (left of `:`) — the live
// `breed_heat_defaults` table uses longer, more explicit column names
// (right of `:`). This select previously used the app's own field names as
// the actual column names, which don't exist on the table, so every call
// failed with "column breed_heat_defaults.avg_cycle_days does not exist"
// and silently fell back to the hardcoded DOBERMANN_DEFAULTS below. The
// table has no anestrus-length column, so anestrus_days is intentionally
// left out; every consumer already treats a missing value as 0 (see
// PhaseTimeline.tsx's `defaults[p.dayKey] ?? 0`).
export const BREED_DEFAULTS_SELECT =
  'id, breed, avg_cycle_days:avg_cycle_length_days, min_cycle_days:min_cycle_length_days, max_cycle_days:max_cycle_length_days, ovulation_offset_days:ovulation_offset_from_heat_start_days, proestrus_days:avg_proestrus_days, estrus_days:avg_estrus_days, diestrus_days:avg_diestrus_days, gestation_days:avg_gestation_days';

export interface ProgesteroneTest {
  date: string;
  value_ng_ml: number;
  lab?: string | null;
  notes?: string | null;
}

export interface MatingRecord {
  id: string;
  heat_cycle_id: string;
  sire_id: string | null;
  external_sire_name: string | null;
  mated_at: string;
  mating_type: string;
  tie_minutes: number | null;
  successful: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sire?: { id: string; name: string } | null;
}

export interface ProgTestRecord {
  id: string;
  heat_cycle_id: string;
  tested_at: string;
  value: number;
  unit: 'ng_ml' | 'nmol_l';
  value_ng_ml: number;
  test_phase: 'ovulation_timing' | 'reverse';
  lab: string | null;
  notes: string | null;
  created_at: string;
}

export interface WhelpTempRecord {
  id: string;
  heat_cycle_id: string;
  taken_at: string;
  temp_c: number;
  notes: string | null;
  created_at: string;
}

export interface HeatCycleRecord {
  id: string;
  dog_id: string;
  heat_start_date: string;
  heat_end_date: string | null;
  proestrus_start_date: string | null;
  estrus_start_date: string | null;
  ovulation_date: string | null;
  mating_date: string | null;
  mating_type: string | null;
  sire_id: string | null;
  expected_whelp_date: string | null;
  actual_whelp_date: string | null;
  resulting_litter_id: string | null;
  status: string;
  is_predicted: boolean;
  actual_cycle_length_days: number | null;
  cycle_confirmed_at: string | null;
  progesterone_tests: ProgesteroneTest[] | null;
  cancelled_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  pregnancy_status: string | null;
  pregnancy_confirmed_date: string | null;
  pregnancy_confirmed_method: string | null;
  pregnancy_notes: string | null;
  whelp_date_earliest: string | null;
  whelp_date_latest: string | null;
  go_home_earliest: string | null;
  go_home_latest: string | null;
  predicted_next_heat_date: string | null;
  whelp_date_basis: string | null;
  whelp_date_locked: boolean;
  forecast_offset_days: number | null;
  forecast_basis: string | null;
  forecast_range_earliest: string | null;
  forecast_range_latest: string | null;
  is_overdue?: boolean;
  sire?: { id: string; name: string } | null;
}

export interface BreedHeatDefaults {
  id: string;
  breed: string;
  avg_cycle_days: number;
  ovulation_offset_days: number;
  proestrus_days: number;
  estrus_days: number;
  diestrus_days: number | null;
  anestrus_days: number | null;
  gestation_days: number;
  min_cycle_days: number;
  max_cycle_days: number;
}

export interface FemaleHeatSummary {
  id: string;
  name: string;
  photoUrl: string | null;
  dateOfBirth: string | null;
  ageMonths: number | null;
  activeHeat: HeatCycleRecord | null;
  pregnantCycle: HeatCycleRecord | null;
  nextPredicted: HeatCycleRecord | null;
  isOverdue: boolean;
  daysInHeat: number | null;
  daysUntilNext: number | null;
  daysOverdue: number | null;
  daysRemaining: number | null;
  goHomeDate: string | null;
  forecastRangeLabel: string | null;
  forecastBasis: string | null;
  statusDetail: string;
  offsetMessage: string | null;
}

export const DOBERMANN_DEFAULTS: BreedHeatDefaults = {
  id: 'default',
  breed: 'Dobermann',
  avg_cycle_days: 180,
  min_cycle_days: 150,
  max_cycle_days: 210,
  ovulation_offset_days: 11,
  proestrus_days: 9,
  estrus_days: 7,
  diestrus_days: 75,
  anestrus_days: 89,
  gestation_days: 63,
};

