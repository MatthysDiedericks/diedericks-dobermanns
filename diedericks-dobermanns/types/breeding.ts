import type { CoiResult } from '@/lib/breeding/coi';

export type BreedingLine = 'A' | 'B' | 'Bridge' | 'Sale' | 'Cross' | 'Unknown';
export type BreedingRole = 'Sire' | 'Dam' | 'Both' | 'Retired' | 'Prospect';
export type HealthDcmStatus = 'Clear' | 'Carrier' | 'Affected' | 'Pending';
export type HealthHdStatus = 'A' | 'B' | 'C' | 'D' | 'E' | 'Pending';
export type HealthEdStatus = '0' | '1' | '2' | '3' | 'Pending';
export type HolterResult = 'Normal' | 'Abnormal' | 'Pending';

export type PairingStatus =
  | 'Planned'
  | 'Active'
  | 'Completed'
  | 'Cancelled'
  | 'Prohibited'
  | 'Trial';
export type PairingPriority =
  | 'Critical'
  | 'Urgent'
  | 'High'
  | 'Active'
  | 'Future'
  | 'Prohibited'
  | 'Done';

export type ProgrammeHealthStatus = 'at_risk' | 'developing' | 'self_sustaining';

/** Dog fields used by the breeding rules engine and programme UI. */
export interface BreedingDog {
  id: string;
  name: string;
  sex: string | null;
  date_of_birth: string | null;
  father_id: string | null;
  mother_id: string | null;
  line: BreedingLine | null;
  generation: number | null;
  breeding_role: BreedingRole | null;
  urgency_flag: boolean;
  health_dcm1: HealthDcmStatus | null;
  health_dcm2: HealthDcmStatus | null;
  health_dcm3: HealthDcmStatus | null;
  health_dcm4: HealthDcmStatus | null;
  health_dcm5: HealthDcmStatus | null;
  health_hd: HealthHdStatus | null;
  health_ed: HealthEdStatus | null;
  holter_date: string | null;
  holter_result: HolterResult | null;
  wrights_coi: number | null;
  notes: string | null;
  origin_pairing_id: string | null;
  status: string;
  flag_dcm_carrier?: boolean;
}

export interface PairingRecord {
  id: string;
  sire_id: string;
  dam_id: string;
  line: BreedingLine;
  generation: number;
  status: PairingStatus;
  priority: PairingPriority;
  target_date: string | null;
  date_bred: string | null;
  coi_estimate: number | null;
  expected_litter_date: string | null;
  litter_id: string | null;
  notes: string | null;
  trial_generation?: number | null;
  trial_notes?: string | null;
  created_at: string;
  updated_at: string;
  sire?: BreedingDog | null;
  dam?: BreedingDog | null;
}

export interface PairingValidity {
  allowed: boolean;
  reason: string;
  coi_flag: boolean;
}

export interface AgeGateResult {
  passed: boolean;
  warning?: string;
}

export interface ProgrammeHealthReport {
  status: ProgrammeHealthStatus;
  label: string;
  alerts: string[];
}

/** Extended dog for the visual breeding planner. */
export interface PlannerDog extends BreedingDog {
  call_name: string | null;
  photo_url: string | null;
}

export type CardLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export interface PairingWithCoi extends PairingRecord {
  coi: CoiResult;
}

export interface FemaleAllocation {
  female: PlannerDog;
  pairing: PairingWithCoi;
}
