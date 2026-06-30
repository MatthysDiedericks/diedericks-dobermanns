import { z } from 'zod';

import type { Litter } from '@/types/app.types';

export const litterSchema = z.object({
  name: z.string(),
  litter_letter: z.string().max(1),
  status: z.enum(['planned', 'expected', 'born', 'placed']),
  mother_id: z.string(),
  father_id: z.string(),
  whelping_type: z.enum(['natural', 'c_section']).nullable(),
  expected_date: z.string(),
  actual_date: z.string(),
  actual_time: z.string(),
  go_home_date: z.string(),
  available_count: z.string(),
  puppy_count: z.string(),
  description: z.string(),
  is_public: z.boolean(),
});

export type LitterFormValues = z.infer<typeof litterSchema>;

function timeInput(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 5);
}

export function litterFormDefaults(litter?: Litter): LitterFormValues {
  return {
    name: litter?.name ?? '',
    litter_letter: litter?.litter_letter ?? '',
    status: litter?.status ?? 'planned',
    mother_id: litter?.mother_id ?? '',
    father_id: litter?.father_id ?? '',
    whelping_type: litter?.whelping_type ?? null,
    expected_date: litter?.expected_date ?? '',
    actual_date: litter?.actual_date ?? '',
    actual_time: timeInput(litter?.actual_time),
    go_home_date: litter?.go_home_date ?? '',
    available_count: litter?.available_count != null ? String(litter.available_count) : '',
    puppy_count: litter?.puppy_count != null ? String(litter.puppy_count) : '',
    description: litter?.description ?? '',
    is_public: litter?.is_public ?? true,
  };
}

export function litterFormPayload(values: LitterFormValues) {
  const born = values.status === 'born' || values.status === 'placed';
  const toInt = (v: string) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };
  return {
    name: values.name.trim() || null,
    litter_letter: values.litter_letter.trim().toUpperCase() || null,
    status: values.status,
    mother_id: values.mother_id.trim() || null,
    father_id: values.father_id.trim() || null,
    whelping_type: born ? values.whelping_type : null,
    expected_date: !born ? values.expected_date.trim() || null : null,
    actual_date: born ? values.actual_date.trim() || null : null,
    actual_time: born ? values.actual_time.trim() || null : null,
    go_home_date: values.go_home_date.trim() || null,
    available_count: toInt(values.available_count),
    puppy_count: toInt(values.puppy_count),
    description: values.description.trim() || null,
    is_public: values.is_public,
  };
}
