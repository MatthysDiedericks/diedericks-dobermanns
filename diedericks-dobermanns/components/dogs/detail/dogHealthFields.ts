import type { FormField } from '@/components/dogs/detail/RecordBottomSheet';

export const VACC_FIELDS: FormField[] = [
  { key: 'vaccine_name', label: 'Vaccine', required: true },
  { key: 'date_administered', label: 'Date given', placeholder: 'YYYY-MM-DD', required: true },
  { key: 'next_due_date', label: 'Next due', placeholder: 'YYYY-MM-DD' },
  { key: 'administered_by', label: 'Administered by' },
  { key: 'batch_number', label: 'Batch number' },
  { key: 'notes', label: 'Notes', multiline: true },
];

export const VISIT_FIELDS: FormField[] = [
  { key: 'visit_date', label: 'Visit date', placeholder: 'YYYY-MM-DD', required: true },
  { key: 'vet_name', label: 'Vet name' },
  { key: 'vet_clinic', label: 'Clinic' },
  { key: 'reason', label: 'Reason', required: true },
  { key: 'diagnosis', label: 'Diagnosis', multiline: true },
  { key: 'treatment', label: 'Treatment', multiline: true },
  { key: 'medications', label: 'Medications', multiline: true },
  { key: 'follow_up_date', label: 'Follow-up', placeholder: 'YYYY-MM-DD' },
  { key: 'cost', label: 'Cost', keyboard: 'numeric' },
  { key: 'notes', label: 'Notes', multiline: true },
];

export const TEST_FIELDS: FormField[] = [
  { key: 'test_name', label: 'Test name', required: true },
  { key: 'result', label: 'Result' },
  { key: 'tested_date', label: 'Test date', placeholder: 'YYYY-MM-DD' },
  { key: 'lab', label: 'Lab' },
  { key: 'notes', label: 'Notes', multiline: true },
];

export const CONDITION_FIELDS: FormField[] = [
  { key: 'condition_name', label: 'Condition', required: true },
  { key: 'diagnosed_date', label: 'Diagnosed', placeholder: 'YYYY-MM-DD' },
  { key: 'notes', label: 'Notes', multiline: true },
];
