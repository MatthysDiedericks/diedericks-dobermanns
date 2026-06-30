import type { HealthEventType } from '@/lib/health/types';

export const HEALTH_PRODUCT_SELECT =
  'id, product_name, category, manufacturer, default_schedule_type, is_active';

export const VET_PRACTICE_SELECT =
  'id, practice_name, vet_names, phone, email, address';

export const VACCINATION_SELECT =
  'id, dog_id, vaccine_name, date_administered, next_due_date, schedule_type, doctor_name, administered_by, vet_practice_id, health_product_id, batch_number, notes';

export const DEWORMING_SELECT =
  'id, dog_ids, product_name, date_treated, next_due_date, schedule_type, treatment_type, doctor_name, vet_practice_id, health_product_id, weight_kg, notes';

export const VET_VISIT_SELECT =
  'id, dog_id, visit_date, reason, next_due_date, schedule_type, doctor_name, vet_name, vet_practice_id, vet_clinic, diagnosis, treatment, medications, cost, follow_up_date, notes';

export const CALENDAR_EVENT_SELECT =
  'id, title, event_type, event_date, end_date, dog_id, is_completed, is_reminder, notes, source_table, source_id, dogs(name, status)';

export const HEALTH_DOG_SELECT =
  'id, name, dog_media(url, is_primary)';

export const EVENT_TYPE_LABELS: Record<string, string> = {
  vaccination: 'VACCINATION',
  deworming: 'DEWORMING',
  tick_flea: 'TICK & FLEA',
  vet_visit: 'VET VISIT',
  vet: 'VET VISIT',
  heat: 'HEAT',
  whelping: 'WHELPING',
  go_home: 'GO HOME',
};

export const EVENT_TYPE_COLORS: Record<HealthEventType | string, string> = {
  vaccination: '#3B82F6',
  deworming: '#22C55E',
  tick_flea: '#F97316',
  vet_visit: '#A855F7',
  vet: '#A855F7',
  heat: '#EF4444',
  heat_predicted: '#C4A35A',
  heat_confirmed: '#EF4444',
  whelping: '#C4A35A',
  go_home: '#14B8A6',
  training: '#C4A35A',
  todo: '#F5F0E8',
};
