import type { ApplicationFormValues } from '@/components/forms/ApplicationForm/schema';

const LABELS: Partial<Record<keyof ApplicationFormValues, Record<string, string>>> = {
  home_type: {
    house: 'House',
    apartment: 'Apartment',
    smallholding: 'Smallholding',
    farm: 'Farm',
  },
  has_secure_yard: {
    yes: 'Yes, fully fenced and secure',
    no: 'No',
    in_progress: 'Not yet, but in progress',
  },
  yard_size: {
    small_under_200: 'Small (under 200m²)',
    medium_200_500: 'Medium (200–500m²)',
    large_500_plus: 'Large (500m²+)',
    open_land: 'Open land / farm',
    no_yard: 'No yard',
  },
  sleeping_arrangement: {
    inside_bedroom: 'Inside — bedroom',
    inside_lounge: 'Inside — lounge / living area',
    indoor_kennel: 'Inside — dedicated indoor kennel',
    outdoor_kennel: 'Outside — secure outdoor kennel',
    mixed_indoor_outdoor: 'Mixed — indoor and outdoor access',
  },
  hours_alone_per_day: {
    '0_2': '0–2 hours',
    '2_4': '2–4 hours',
    '4_6': '4–6 hours',
    '6_8': '6–8 hours',
    '8_plus': 'More than 8 hours',
  },
  exercise_level: {
    very_active: 'Very active',
    active: 'Active',
    moderate: 'Moderate',
    light: 'Light',
  },
  dobermann_experience_level: {
    never_owned: 'Never owned — researched only',
    researched_only: 'Never owned — researched only',
    previous_owner: 'Previous owner',
    experienced_handler: 'Experienced handler / trainer',
    breeder_trainer: 'Breeder / professional experience',
  },
  aware_of_dcm: {
    yes_fully_aware: 'Fully aware and prepared',
    aware_learning_more: 'Aware — still learning',
    not_aware: 'Not aware — please tell me more',
  },
  aware_of_commitment: {
    yes_fully_prepared: 'Fully prepared for lifetime commitment',
    mostly_prepared: 'Mostly prepared',
    need_more_info: 'Need more information',
  },
  aware_of_costs: {
    yes_fully_budgeted: 'Fully budgeted',
    mostly_prepared: 'Mostly prepared',
    need_cost_breakdown: 'Need cost breakdown',
  },
  dog_interest: {
    puppy: 'Standard Puppy',
    elite_developed: 'Elite Developed Puppy',
    protection_dog: 'Fully Trained Protection Dog',
  },
  purpose: {
    family: 'Family Companion',
    protection: 'Personal Protection',
    sport: 'Sport (PSA / IGP)',
    companion: 'Companion',
  },
  preferred_sex: {
    male: 'Male',
    female: 'Female',
    no_preference: 'No preference',
  },
  preferred_colour: {
    black_tan: 'Black & Tan',
    brown_tan: 'Brown & Tan',
    blue_tan: 'Blue & Tan',
    fawn_tan: 'Fawn & Tan (Isabella)',
    no_preference: 'No preference',
  },
  tail_preference: {
    docked: 'Docked (traditional)',
    natural: 'Natural (undocked)',
    no_preference: 'No preference',
  },
  preferred_timeline: {
    asap: 'As soon as possible',
    '3_months': 'Within 3 months',
    '6_months': 'Within 6 months',
    next_litter: 'Next available litter',
    flexible: 'Flexible',
  },
  budget_range: {
    standard: 'Standard Puppy',
    elite: 'Elite / Developed',
    open: 'Open — best available',
  },
};

export function labelFor<K extends keyof ApplicationFormValues>(
  field: K,
  value: ApplicationFormValues[K] | undefined,
): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  const map = LABELS[field];
  if (map && typeof value === 'string') return map[value] ?? value;
  return String(value);
}
