/** Kennel dashboard domain types — shared with app. */

export type HeatCycleStatus =
  | 'in_heat'
  | 'mated'
  | 'confirmed_pregnant'
  | 'whelped'
  | 'archived';

export interface HeatCycleWithDog {
  id: string;
  dog_id: string;
  heat_start_date: string;
  ovulation_date: string | null;
  mating_date: string | null;
  expected_whelp_date: string | null;
  status: string;
  dog_name?: string;
  date_of_birth?: string | null;
  litter_count?: number;
  dam_name?: string;
}

export interface TodoItemWithLinks {
  id: string;
  title: string;
  due_date: string | null;
  category: string;
  priority: string;
  litter_id: string | null;
  dog_id: string | null;
  litter_label?: string | null;
  dog_name?: string | null;
}

export interface CurrentLitterRow {
  id: string;
  actual_date: string | null;
  go_home_date: string | null;
  go_home_weeks: number | null;
  male_count: number | null;
  female_count: number | null;
  litter_letter: string | null;
  mother?: { id: string; name: string } | null;
  father?: { id: string; name: string } | null;
}

export interface DashboardFinanceSnapshot {
  income: number;
  expenses: number;
  net: number;
}

export interface WaitlistSummary {
  active: number;
  awaitingDeposit: number;
  followUpsOverdue: number;
}
