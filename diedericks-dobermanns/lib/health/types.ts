export type HealthProductCategory = 'vaccination' | 'deworming' | 'tick_flea';

export type VaccinationSchedule = 'annual' | 'biannual' | 'quarterly' | 'custom';
export type DewormingSchedule = 'monthly' | 'quarterly' | 'biannual' | 'custom';
export type VetFollowUpSchedule = 'annual' | 'biannual' | 'quarterly' | 'custom' | 'none';

export type DewormingTreatmentType = 'deworming' | 'tick_flea' | 'both';

export type HealthEventType =
  | 'vaccination'
  | 'deworming'
  | 'tick_flea'
  | 'vet_visit'
  | 'heat'
  | 'whelping'
  | 'go_home';

export interface HealthProduct {
  id: string;
  product_name: string;
  category: HealthProductCategory;
  manufacturer: string | null;
  default_schedule_type: string | null;
  is_active: boolean;
}

export interface VetPractice {
  id: string;
  practice_name: string;
  vet_names: string[] | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface CalendarEventRow {
  id: string;
  event_date: string;
  event_type: string;
  title: string;
  dog_id: string | null;
  source_table: string | null;
  source_id: string | null;
  is_completed: boolean;
}

export interface HealthDog {
  id: string;
  name: string;
  photoUrl: string | null;
}

export interface VaccinationRecord {
  id: string;
  dog_id: string;
  vaccine_name: string;
  date_administered: string;
  next_due_date: string | null;
  schedule_type: string | null;
  doctor_name: string | null;
  administered_by: string | null;
  vet_practice_id: string | null;
  health_product_id: string | null;
  batch_number: string | null;
  notes: string | null;
  vet_practice?: { practice_name: string } | null;
}

export interface DewormingRecord {
  id: string;
  dog_ids: string[];
  product_name: string | null;
  date_treated: string;
  next_due_date: string | null;
  schedule_type: string | null;
  treatment_type: string;
  doctor_name: string | null;
  vet_practice_id: string | null;
  health_product_id: string | null;
  weight_kg: number | null;
  notes: string | null;
}

export interface VetVisitRecord {
  id: string;
  dog_id: string | null;
  visit_date: string;
  reason: string;
  next_due_date: string | null;
  schedule_type: string | null;
  doctor_name: string | null;
  vet_name: string | null;
  vet_practice_id: string | null;
  vet_clinic: string | null;
  diagnosis: string | null;
  treatment: string | null;
  medications: string | null;
  cost: number | null;
  follow_up_date: string | null;
  notes: string | null;
  vet_practice?: { practice_name: string } | null;
}

export interface DogVaccinationSummary {
  dog: HealthDog;
  lastVaccine: string | null;
  lastDate: string | null;
  nextDue: string | null;
}

export interface DogDewormingSummary {
  dog: HealthDog;
  lastDeworm: string | null;
  lastDewormDate: string | null;
  nextDewormDue: string | null;
  lastTickFlea: string | null;
  lastTickFleaDate: string | null;
  nextTickFleaDue: string | null;
}

export interface DogVetSummary {
  dog: HealthDog;
  lastVisitDate: string | null;
  lastReason: string | null;
  nextDue: string | null;
}

export interface UpcomingHealthEvent {
  id: string;
  dogId: string;
  dogName: string;
  photoUrl: string | null;
  eventType: HealthEventType;
  eventLabel: string;
  dueDate: string;
  daysUntil: number;
  sourceTable: 'vaccinations' | 'deworming_records' | 'vet_visits' | 'calendar_events';
  sourceId: string;
  urgency: 'overdue' | 'critical' | 'soon' | 'month';
}
