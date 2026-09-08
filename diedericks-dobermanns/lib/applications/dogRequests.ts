import type { ApplicationFormValues } from '@/components/forms/ApplicationForm/schema';

export type DogRequestPayload = {
  preferred_sex: string | null;
  preferred_colour: string | null;
  ear_preference: string | null;
  tail_preference: string | null;
  preferred_category: string | null;
  preferred_timeline: string | null;
  budget_range: string | null;
  notes: string | null;
};

export const EMPTY_DOG_REQUEST: ApplicationFormValues['extra_dog_requests'][number] = {
  preferred_sex: 'no_preference',
  preferred_colour: 'no_preference',
  tail_preference: 'no_preference',
  preferred_timeline: 'flexible',
  budget_range: 'standard',
  notes: '',
};

export function dogRequestsFromForm(values: ApplicationFormValues): DogRequestPayload[] {
  const first: DogRequestPayload = {
    preferred_sex: values.preferred_sex,
    preferred_colour: values.preferred_colour,
    ear_preference: null,
    tail_preference: values.tail_preference,
    preferred_category: null,
    preferred_timeline: values.preferred_timeline,
    budget_range: values.budget_range,
    notes: values.special_requests || null,
  };
  const extra = (values.extra_dog_requests ?? []).slice(0, Math.max(0, values.dogs_requested - 1));
  return [
    first,
    ...extra.map((r) => ({
      preferred_sex: r.preferred_sex,
      preferred_colour: r.preferred_colour,
      ear_preference: null,
      tail_preference: r.tail_preference,
      preferred_category: null,
      preferred_timeline: r.preferred_timeline,
      budget_range: r.budget_range,
      notes: r.notes?.trim() ? r.notes.trim() : null,
    })),
  ].slice(0, values.dogs_requested);
}
