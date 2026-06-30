import { z } from 'zod';

/**
 * Diedericks Dobermanns — Puppy Application Schema
 *
 * 6 steps. Steps 1–4 collect information. Step 5 requires all 6 legal
 * agreements to be individually ticked. Step 6 is review before submit.
 *
 * Every z.literal(true) field is a mandatory individual agreement —
 * partial agreement is not accepted.
 */
export const applicationSchema = z.object({
  // ── STEP 1: Personal Information ─────────────────────────────────────────
  full_name: z.string().min(2, 'Please enter your full name'),
  date_of_birth: z.string().min(4, 'Date of birth is required'),
  id_number: z.string().min(6, 'ID or passport number is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().min(7, 'Enter a valid phone number'),
  occupation: z.string().min(2, 'Occupation is required'),
  employer: z.string().optional().or(z.literal('')),
  country: z.string().min(2, 'Country is required'),
  province: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  address: z.string().min(5, 'Physical address where the dog will live is required'),
  instagram_handle: z.string().optional().or(z.literal('')),
  facebook_profile: z.string().optional().or(z.literal('')),

  // ── STEP 2: Home & Lifestyle ──────────────────────────────────────────────
  home_type: z.enum(['house', 'apartment', 'smallholding', 'farm'], {
    message: 'Select your home type',
  }),
  has_secure_yard: z.enum(['yes', 'no', 'in_progress'], {
    message: 'Select your yard situation',
  }),
  yard_size: z.enum(['small_under_200', 'medium_200_500', 'large_500_plus', 'open_land', 'no_yard'], {
    message: 'Select your property size',
  }),
  sleeping_arrangement: z.enum(
    ['inside_bedroom', 'inside_lounge', 'indoor_kennel', 'outdoor_kennel', 'mixed_indoor_outdoor'],
    { message: 'Select sleeping arrangement' },
  ),
  hours_alone_per_day: z.enum(['0_2', '2_4', '4_6', '6_8', '8_plus'], {
    message: 'Select how many hours the dog will be alone',
  }),
  exercise_level: z.enum(['very_active', 'active', 'moderate', 'light'], {
    message: 'Select your activity level',
  }),
  current_pets: z.string().optional().or(z.literal('')),
  children_ages: z.string().optional().or(z.literal('')),

  // ── STEP 3: Experience & Due Diligence ───────────────────────────────────
  why_dobermann: z.string().min(10, 'Please tell us why you want a Dobermann'),
  dobermann_experience_level: z.enum(
    ['never_owned', 'researched_only', 'previous_owner', 'experienced_handler', 'breeder_trainer'],
    { message: 'Select your experience level' },
  ),
  aware_of_dcm: z.enum(['yes_fully_aware', 'aware_learning_more', 'not_aware'], {
    message: 'Please select your awareness of Dobermann health',
  }),
  aware_of_commitment: z.enum(['yes_fully_prepared', 'mostly_prepared', 'need_more_info'], {
    message: 'Please select your commitment level',
  }),
  aware_of_costs: z.enum(['yes_fully_budgeted', 'mostly_prepared', 'need_cost_breakdown'], {
    message: 'Please select your financial readiness',
  }),
  previous_dog_fate: z.string().optional().or(z.literal('')),
  experience_with_dobermanns: z.string().optional().or(z.literal('')),
  vet_name: z.string().optional().or(z.literal('')),
  vet_phone: z.string().optional().or(z.literal('')),
  personal_reference_name: z.string().optional().or(z.literal('')),
  personal_reference_phone: z.string().optional().or(z.literal('')),

  // ── STEP 4: Puppy Preferences ─────────────────────────────────────────────
  dog_interest: z.enum(['puppy', 'elite_developed', 'protection_dog'], {
    message: 'Select what you are interested in',
  }),
  purpose: z.enum(['family', 'protection', 'sport', 'companion'], {
    message: 'Select a primary purpose',
  }),
  preferred_sex: z.enum(['male', 'female', 'no_preference'], {
    message: 'Select preferred sex',
  }),
  preferred_colour: z.enum(['black_tan', 'brown_tan', 'blue_tan', 'fawn_tan', 'no_preference'], {
    message: 'Select preferred colour',
  }),
  tail_preference: z.enum(['docked', 'natural', 'no_preference'], {
    message: 'Select tail preference — this must be decided before whelping',
  }),
  preferred_timeline: z.enum(['asap', '3_months', '6_months', 'next_litter', 'flexible'], {
    message: 'Select your preferred timeline',
  }),
  budget_range: z.enum(['standard', 'elite', 'open'], {
    message: 'Select your budget range',
  }),
  training_planned: z.boolean(),
  security_requirements: z.string().optional().or(z.literal('')),
  delivery_acknowledged: z.boolean().refine((v) => v === true, {
    message: 'You must acknowledge the Pretoria collection / delivery requirement',
  }),
  special_requests: z.string().optional().or(z.literal('')),

  // ── STEP 5: Legal Agreements (ALL individually mandatory) ─────────────────
  agreed_no_breeding_rights: z.boolean().refine((v) => v === true, {
    message: 'You must acknowledge the no breeding rights condition',
  }),
  agreed_right_of_recall: z.boolean().refine((v) => v === true, {
    message: 'You must acknowledge our right of recall',
  }),
  agreed_no_resale: z.boolean().refine((v) => v === true, {
    message: 'You must acknowledge the no resale without consent condition',
  }),
  agreed_welfare_commitment: z.boolean().refine((v) => v === true, {
    message: 'You must commit to the lifetime welfare of this dog',
  }),
  agreed_microchip_policy: z.boolean().refine((v) => v === true, {
    message: 'You must acknowledge the microchip and registration policy',
  }),
  agreed_to_terms: z.boolean().refine((v) => v === true, {
    message: 'You must agree to the full Terms & Conditions of Sale',
  }),
});

export type ApplicationFormValues = z.infer<typeof applicationSchema>;

export const STEP_FIELDS: (keyof ApplicationFormValues)[][] = [
  ['full_name', 'date_of_birth', 'id_number', 'email', 'phone', 'occupation', 'country', 'address'],
  ['home_type', 'has_secure_yard', 'yard_size', 'sleeping_arrangement', 'hours_alone_per_day', 'exercise_level'],
  ['why_dobermann', 'dobermann_experience_level', 'aware_of_dcm', 'aware_of_commitment', 'aware_of_costs'],
  [
    'dog_interest',
    'purpose',
    'preferred_sex',
    'preferred_colour',
    'tail_preference',
    'preferred_timeline',
    'budget_range',
    'delivery_acknowledged',
  ],
  [
    'agreed_no_breeding_rights',
    'agreed_right_of_recall',
    'agreed_no_resale',
    'agreed_welfare_commitment',
    'agreed_microchip_policy',
    'agreed_to_terms',
  ],
  [],
];

export const STEP_TITLES = [
  'Personal Information',
  'Your Home & Lifestyle',
  'Experience & Due Diligence',
  'Puppy Preferences',
  'Terms & Conditions',
  'Review & Submit',
];

export const defaultApplicationValues: Partial<ApplicationFormValues> = {
  full_name: '',
  date_of_birth: '',
  id_number: '',
  email: '',
  phone: '',
  occupation: '',
  employer: '',
  country: 'South Africa',
  province: '',
  city: '',
  address: '',
  instagram_handle: '',
  facebook_profile: '',
  yard_size: undefined,
  sleeping_arrangement: undefined,
  hours_alone_per_day: undefined,
  exercise_level: undefined,
  current_pets: '',
  children_ages: '',
  why_dobermann: '',
  dobermann_experience_level: undefined,
  aware_of_dcm: undefined,
  aware_of_commitment: undefined,
  aware_of_costs: undefined,
  experience_with_dobermanns: '',
  previous_dog_fate: '',
  vet_name: '',
  vet_phone: '',
  personal_reference_name: '',
  personal_reference_phone: '',
  security_requirements: '',
  training_planned: false,
  special_requests: '',
  delivery_acknowledged: false,
  agreed_no_breeding_rights: false,
  agreed_right_of_recall: false,
  agreed_no_resale: false,
  agreed_welfare_commitment: false,
  agreed_microchip_policy: false,
  agreed_to_terms: false,
};
