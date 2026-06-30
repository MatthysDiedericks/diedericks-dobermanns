export const HEAT_CYCLE_SELECT =
  'id, dog_id, heat_start_date, heat_end_date, proestrus_start_date, ' +
  'estrus_start_date, ovulation_date, mating_date, mating_type, ' +
  'sire_id, expected_whelp_date, actual_whelp_date, resulting_litter_id, ' +
  'status, is_predicted, actual_cycle_length_days, cycle_confirmed_at, ' +
  'progesterone_tests, cancelled_reason, notes, created_at, updated_at';

export const BREED_DEFAULTS_SELECT =
  'id, breed, avg_cycle_days, ovulation_offset_days, proestrus_days, estrus_days, diestrus_days, anestrus_days, gestation_days';

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
