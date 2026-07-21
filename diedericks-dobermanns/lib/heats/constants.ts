export const HEAT_CYCLE_SELECT =
  'id, dog_id, heat_start_date, heat_end_date, proestrus_start_date, ' +
  'estrus_start_date, ovulation_date, mating_date, mating_type, ' +
  'sire_id, expected_whelp_date, actual_whelp_date, resulting_litter_id, ' +
  'status, is_predicted, actual_cycle_length_days, cycle_confirmed_at, ' +
  'progesterone_tests, cancelled_reason, notes, created_at, updated_at';

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
  'id, breed, avg_cycle_days:avg_cycle_length_days, ovulation_offset_days:ovulation_offset_from_heat_start_days, proestrus_days:avg_proestrus_days, estrus_days:avg_estrus_days, diestrus_days:avg_diestrus_days, gestation_days:avg_gestation_days';

export interface ProgesteroneTest {
  date: string;
  value_ng_ml: number;
  lab?: string | null;
  notes?: string | null;
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
}

export interface FemaleHeatSummary {
  id: string;
  name: string;
  photoUrl: string | null;
  activeHeat: HeatCycleRecord | null;
  nextPredicted: HeatCycleRecord | null;
  isOverdue: boolean;
  daysInHeat: number | null;
  daysUntilNext: number | null;
  daysOverdue: number | null;
}
