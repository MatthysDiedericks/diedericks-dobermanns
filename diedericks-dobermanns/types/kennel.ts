/** Kennel dashboard domain types — aligned with live Supabase kennel schema. */

export type HeatCycleStatus =
  | 'active'
  | 'completed'
  | 'skipped'
  | 'anovulatory'
  | 'in_heat'
  | 'mated'
  | 'confirmed_pregnant'
  | 'whelped'
  | 'archived';

export type TodoCategory =
  | 'health'
  | 'breeding'
  | 'whelping'
  | 'training'
  | 'admin'
  | 'client'
  | 'general';

export type TodoPriority = 'high' | 'normal' | 'low';

export type ContractStatus =
  | 'draft'
  | 'sent'
  | 'awaiting_signature'
  | 'signed_client'
  | 'signed_both'
  | 'void';

export type KennelDocCategory =
  | 'general'
  | 'health'
  | 'breeding'
  | 'training'
  | 'legal'
  | 'marketing'
  | 'templates';

export type MatingType = 'natural' | 'ai_fresh' | 'ai_chilled' | 'ai_frozen';

export interface HeatCycle {
  id: string;
  dog_id: string;
  heat_start_date: string;
  ovulation_date: string | null;
  mating_date: string | null;
  mating_type: string | null;
  sire_id: string | null;
  expected_whelp_date: string | null;
  status: HeatCycleStatus;
  resulting_litter_id: string | null;
  next_heat_date?: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type HeatCycleWithDog = HeatCycle & {
  dog_name?: string;
  date_of_birth?: string | null;
  litter_count?: number;
  dam_name?: string;
};

export interface TodoItem {
  id: string;
  title: string;
  description: string | null;
  category: TodoCategory;
  priority: TodoPriority;
  due_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  litter_id: string | null;
  dog_id: string | null;
  booking_id: string | null;
  application_id: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export type TodoItemWithLinks = TodoItem & {
  litter_label?: string | null;
  dog_name?: string | null;
};

export interface ContractTemplate {
  id: string;
  name: string;
  description: string | null;
  contract_title: string;
  party_1_label: string;
  party_2_label: string;
  dog_label: string;
  body_html: string;
  created_at: string;
  updated_at: string;
}

export interface KennelDocument {
  id: string;
  name: string;
  original_filename: string;
  file_url: string;
  mime_type: string | null;
  file_size: number | null;
  category: KennelDocCategory;
  tags: string[] | null;
  is_starred: boolean;
  storage_path?: string | null;
  linked_dog_id?: string | null;
  linked_litter_id?: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardFinanceSnapshot {
  income: number;
  expenses: number;
  net: number;
  priorIncome: number;
  priorExpenses: number;
}

export interface WaitlistSummary {
  active: number;
  awaitingDeposit: number;
  followUpsOverdue: number;
}

export interface CurrentLitterRow {
  id: string;
  actual_date: string | null;
  go_home_date: string | null;
  go_home_weeks: number | null;
  male_count: number | null;
  female_count: number | null;
  litter_letter: string | null;
  mother_id: string | null;
  father_id: string | null;
  mother?: { id: string; name: string } | null;
  father?: { id: string; name: string } | null;
}
