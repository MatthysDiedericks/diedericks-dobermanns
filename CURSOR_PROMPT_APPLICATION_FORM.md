# Cursor Prompt — Full Application Form, Privacy Policy & Terms and Conditions
**Project:** Diedericks Dobermanns App
**Supabase Project ID:** nlmwxodvquwbjinhhbmr
**Stack:** React Native + Expo SDK 56, TypeScript strict, NativeWind, react-hook-form + zod, Expo Router

---

## Overview

Build three things in this session:

1. **Enhanced puppy application form** — 6-step wizard with full buyer details, due diligence questions, puppy preferences (including tail docking and special requests), delivery acknowledgement, and mandatory individual legal tick boxes
2. **Privacy Policy screen** — `/privacy` route in the public area
3. **Terms & Conditions screen** — `/terms` route in the public area

---

## PART 1 — Database Migration

Run this in the Supabase SQL Editor FIRST before touching any code:

```sql
-- Step 1: Add all new columns to the applications table

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS date_of_birth            TEXT,
  ADD COLUMN IF NOT EXISTS occupation               TEXT,
  ADD COLUMN IF NOT EXISTS employer                 TEXT,
  ADD COLUMN IF NOT EXISTS instagram_handle         TEXT,
  ADD COLUMN IF NOT EXISTS facebook_profile         TEXT,
  ADD COLUMN IF NOT EXISTS hours_alone_per_day      TEXT,
  ADD COLUMN IF NOT EXISTS exercise_level           TEXT,
  ADD COLUMN IF NOT EXISTS yard_size                TEXT,
  ADD COLUMN IF NOT EXISTS sleeping_arrangement     TEXT,
  ADD COLUMN IF NOT EXISTS why_dobermann            TEXT,
  ADD COLUMN IF NOT EXISTS aware_of_dcm             TEXT,
  ADD COLUMN IF NOT EXISTS aware_of_commitment      TEXT,
  ADD COLUMN IF NOT EXISTS aware_of_costs           TEXT,
  ADD COLUMN IF NOT EXISTS dobermann_experience_level TEXT,
  ADD COLUMN IF NOT EXISTS previous_dog_fate        TEXT,
  ADD COLUMN IF NOT EXISTS preferred_sex            TEXT,
  ADD COLUMN IF NOT EXISTS preferred_colour         TEXT,
  ADD COLUMN IF NOT EXISTS tail_preference          TEXT,
  ADD COLUMN IF NOT EXISTS preferred_timeline       TEXT,
  ADD COLUMN IF NOT EXISTS budget_range             TEXT,
  ADD COLUMN IF NOT EXISTS training_planned         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS delivery_acknowledged    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS special_requests         TEXT,
  ADD COLUMN IF NOT EXISTS agreed_no_breeding_rights  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS agreed_right_of_recall     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS agreed_no_resale           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS agreed_welfare_commitment  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS agreed_microchip_policy    BOOLEAN DEFAULT FALSE;

-- Step 2: Verify migration succeeded
SELECT column_name FROM information_schema.columns
WHERE table_name = 'applications' AND table_schema = 'public'
ORDER BY ordinal_position;
```

---

## PART 2 — Rewrite `components/forms/ApplicationForm/schema.ts`

Replace the entire file:

```typescript
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
  full_name:        z.string().min(2, 'Please enter your full name'),
  date_of_birth:    z.string().min(4, 'Date of birth is required'),
  id_number:        z.string().min(6, 'ID or passport number is required'),
  email:            z.string().email('Enter a valid email address'),
  phone:            z.string().min(7, 'Enter a valid phone number'),
  occupation:       z.string().min(2, 'Occupation is required'),
  employer:         z.string().optional().or(z.literal('')),
  country:          z.string().min(2, 'Country is required'),
  province:         z.string().optional().or(z.literal('')),
  city:             z.string().optional().or(z.literal('')),
  address:          z.string().min(5, 'Physical address where the dog will live is required'),
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
  sleeping_arrangement: z.enum(['inside_bedroom', 'inside_lounge', 'indoor_kennel', 'outdoor_kennel', 'mixed_indoor_outdoor'], {
    message: 'Select sleeping arrangement',
  }),
  hours_alone_per_day: z.enum(['0_2', '2_4', '4_6', '6_8', '8_plus'], {
    message: 'Select how many hours the dog will be alone',
  }),
  exercise_level: z.enum(['very_active', 'active', 'moderate', 'light'], {
    message: 'Select your activity level',
  }),
  current_pets:  z.string().optional().or(z.literal('')),
  children_ages: z.string().optional().or(z.literal('')),

  // ── STEP 3: Experience & Due Diligence ───────────────────────────────────
  why_dobermann: z.string().min(10, 'Please tell us why you want a Dobermann'),
  dobermann_experience_level: z.enum(['never_owned', 'researched_only', 'previous_owner', 'experienced_handler', 'breeder_trainer'], {
    message: 'Select your experience level',
  }),
  aware_of_dcm: z.enum(['yes_fully_aware', 'aware_learning_more', 'not_aware'], {
    message: 'Please select your awareness of Dobermann health',
  }),
  aware_of_commitment: z.enum(['yes_fully_prepared', 'mostly_prepared', 'need_more_info'], {
    message: 'Please select your commitment level',
  }),
  aware_of_costs: z.enum(['yes_fully_budgeted', 'mostly_prepared', 'need_cost_breakdown'], {
    message: 'Please select your financial readiness',
  }),
  previous_dog_fate:          z.string().optional().or(z.literal('')),
  experience_with_dobermanns: z.string().optional().or(z.literal('')),
  vet_name:                   z.string().optional().or(z.literal('')),
  vet_phone:                  z.string().optional().or(z.literal('')),
  personal_reference_name:    z.string().optional().or(z.literal('')),
  personal_reference_phone:   z.string().optional().or(z.literal('')),

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
  training_planned:       z.boolean(),
  security_requirements:  z.string().optional().or(z.literal('')),
  delivery_acknowledged:  z.literal(true, {
    message: 'You must acknowledge the Pretoria collection / delivery requirement',
  }),
  special_requests:       z.string().optional().or(z.literal('')),

  // ── STEP 5: Legal Agreements (ALL individually mandatory) ─────────────────
  agreed_no_breeding_rights: z.literal(true, {
    message: 'You must acknowledge the no breeding rights condition',
  }),
  agreed_right_of_recall: z.literal(true, {
    message: 'You must acknowledge our right of recall',
  }),
  agreed_no_resale: z.literal(true, {
    message: 'You must acknowledge the no resale without consent condition',
  }),
  agreed_welfare_commitment: z.literal(true, {
    message: 'You must commit to the lifetime welfare of this dog',
  }),
  agreed_microchip_policy: z.literal(true, {
    message: 'You must acknowledge the microchip and registration policy',
  }),
  agreed_to_terms: z.literal(true, {
    message: 'You must agree to the full Terms & Conditions of Sale',
  }),
});

export type ApplicationFormValues = z.infer<typeof applicationSchema>;

export const STEP_FIELDS: (keyof ApplicationFormValues)[][] = [
  // Step 1 — Personal Information
  ['full_name', 'date_of_birth', 'id_number', 'email', 'phone', 'occupation', 'country', 'address'],
  // Step 2 — Home & Lifestyle
  ['home_type', 'has_secure_yard', 'yard_size', 'sleeping_arrangement', 'hours_alone_per_day', 'exercise_level'],
  // Step 3 — Experience & Due Diligence
  ['why_dobermann', 'dobermann_experience_level', 'aware_of_dcm', 'aware_of_commitment', 'aware_of_costs'],
  // Step 4 — Puppy Preferences
  ['dog_interest', 'purpose', 'preferred_sex', 'preferred_colour', 'tail_preference', 'preferred_timeline', 'budget_range', 'delivery_acknowledged'],
  // Step 5 — Legal Agreements
  ['agreed_no_breeding_rights', 'agreed_right_of_recall', 'agreed_no_resale', 'agreed_welfare_commitment', 'agreed_microchip_policy', 'agreed_to_terms'],
  // Step 6 — Review (no validation — submit on this step)
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
};
```

---

## PART 3 — Rewrite `components/forms/ApplicationForm/index.tsx`

This file renders the 6-step wizard. If it exceeds 300 lines, extract each step into a sub-component:
- `components/forms/ApplicationForm/Step1Personal.tsx`
- `components/forms/ApplicationForm/Step2Lifestyle.tsx`
- `components/forms/ApplicationForm/Step3Experience.tsx`
- `components/forms/ApplicationForm/Step4Preferences.tsx`
- `components/forms/ApplicationForm/Step5Legal.tsx`
- `components/forms/ApplicationForm/Step6Review.tsx`

The main `index.tsx` should only contain: form setup, step navigation logic, the ProgressBar, and the step router (rendering the correct step component). It must stay under 200 lines.

### ProgressBar component (stays in index.tsx)
```typescript
function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View className="mb-6">
      <View className="flex-row gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-gold' : 'bg-surface'}`} />
        ))}
      </View>
      <Typography variant="label" className="mt-3">
        Step {step + 1} of {total} · {STEP_TITLES[step]}
      </Typography>
    </View>
  );
}
```

### AgreementBox component (use in Step5Legal.tsx)

Each legal clause is a full tappable card with a visible checkbox — NOT a small toggle:

```typescript
function AgreementBox({ title, description, checked, onPress }: {
  title: string;
  description: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="mb-3">
      <View className={`rounded-xl border p-4 ${checked ? 'border-gold/60 bg-gold/5' : 'border-gold/20 bg-black-rich'}`}>
        <View className="flex-row items-start gap-3">
          <View className={`mt-0.5 h-6 w-6 items-center justify-center rounded-md border-2 ${checked ? 'border-gold bg-gold' : 'border-gold/40'}`}>
            {checked ? <Typography variant="caption" className="text-black font-bold">✓</Typography> : null}
          </View>
          <View className="flex-1">
            <Typography variant="subtitle" className="font-semibold">{title}</Typography>
            <Typography variant="bodyMuted" className="mt-1 text-sm leading-5">{description}</Typography>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
```

### Step 1 — Personal Information fields
```
Full legal name *
Date of birth * (format: DD/MM/YYYY)
ID / Passport number *
Email address *
Phone number * (keyboardType="phone-pad")
Occupation *
Employer (optional)
Country * (default: South Africa)
Province / State (optional)
City (optional)
Physical address * (multiline — "Address where the dog will live")
Instagram handle (optional)
Facebook profile (optional)
```

### Step 2 — Home & Lifestyle fields (all dropdowns / OptionGroups)
```
OptionGroup: Home type *
  - House
  - Apartment
  - Smallholding
  - Farm

OptionGroup: Do you have a secure, fenced yard? *
  - Yes, fully fenced and secure
  - Not yet, but in progress
  - No

OptionGroup: Property / yard size *
  - Small (under 200m²)
  - Medium (200–500m²)
  - Large (500m² and above)
  - Open land / farm
  - No yard

OptionGroup: Where will the dog sleep? *
  - Inside — bedroom
  - Inside — lounge / living area
  - Inside — dedicated indoor kennel
  - Outside — secure outdoor kennel
  - Mixed — indoor and outdoor access

OptionGroup: How many hours per day will the dog be left alone? *
  - 0–2 hours (almost always supervised)
  - 2–4 hours
  - 4–6 hours
  - 6–8 hours
  - More than 8 hours

OptionGroup: How active is your lifestyle? *
  - Very active (daily running, hiking, sport)
  - Active (daily walks, regular outdoor activity)
  - Moderate (regular walks, some outdoor activity)
  - Light (short walks, mostly indoor)

ControlledInput: Current pets (optional, multiline)
  placeholder: "e.g. 1 Labrador (male, 3 years), 2 cats"

ControlledInput: Children and ages (optional)
  placeholder: "e.g. 2 children, ages 6 and 9"
```

### Step 3 — Experience & Due Diligence fields (dropdowns for structured questions)

**Section header card (gold-bordered, display above all fields):**
> "As responsible breeders, we need to ensure every Diedericks Dobermann goes to a home that is genuinely prepared for the breed. Please answer each question honestly."

```
ControlledInput: Why do you specifically want a Dobermann? * (multiline, min 10 chars)
  placeholder: "Tell us what drew you to the breed and why a Dobermann is right for your lifestyle"

OptionGroup: Your experience with Dobermanns *
  - I have never owned one but I have researched the breed
  - I have owned a Dobermann previously
  - I am an experienced handler or trainer
  - I am a breeder or have professional experience with the breed

OptionGroup: Are you aware that Dobermanns are genetically prone to DCM (Dilated Cardiomyopathy — a serious heart condition) and may require cardiac screening and ongoing monitoring? *
  - Yes, I am fully aware and prepared for this
  - I am aware and am still learning about it
  - I was not aware — please tell me more
  Helper note (show below): "DCM is one of the leading causes of death in the breed. Our breeding stock is tested for DCM1–DCM5 genetic panels to reduce risk, but all buyers should be aware of the breed's cardiac predisposition."

OptionGroup: Do you understand that this is a 10–14 year commitment? *
  - Yes, I am fully prepared for a lifetime commitment
  - Mostly prepared — I understand the timeframe
  - I need more information before committing

OptionGroup: Are you financially prepared for the ongoing costs of owning a Dobermann (food, vet care, training, dental, cardiac screening)? *
  - Yes, I have budgeted for all costs
  - Mostly — I am prepared for standard costs
  - I would like a cost breakdown before deciding

ControlledInput: What happened to your previous dog(s)? (optional, multiline)
  placeholder: "e.g. Passed away at age 12, still alive, had to rehome due to relocation..."

ControlledInput: Any additional notes on your experience or background (optional, multiline)

ControlledInput: Veterinarian name (optional)
ControlledInput: Veterinarian phone (optional, keyboardType="phone-pad")
ControlledInput: Personal reference name (optional)
ControlledInput: Personal reference phone (optional, keyboardType="phone-pad")
```

**Important behaviour note:** If the applicant selects "I was not aware" for DCM or "I need more information" for commitment or costs, do NOT block them from proceeding. Instead, flag these responses in the Supabase record so the admin team knows to follow up with additional information before approving. The admin panel already shows the application status — these answers are visible to the admin reviewer.

### Step 4 — Puppy Preferences fields

```
OptionGroup: What are you interested in? *
  - Standard Puppy
  - Elite Developed Puppy (6 months in-kennel development)
  - Fully Trained Protection Dog

OptionGroup: Primary purpose *
  - Family Companion
  - Personal Protection
  - Sport (PSA / IGP)
  - Companion

OptionGroup: Preferred sex *
  - Male
  - Female
  - No preference

OptionGroup: Preferred colour *
  - Black & Tan
  - Brown & Tan
  - Blue & Tan
  - Fawn & Tan (Isabella)
  - No preference

OptionGroup: Tail preference * (IMPORTANT — must be decided before whelping)
  - Docked (traditional)
  - Natural (undocked)
  - No preference
  Helper text below: "Tail docking is performed at 2–5 days of age. Your preference must be communicated to us before the litter is born. If no preference is selected, we will apply our standard programme practice."

OptionGroup: When do you want your dog? *
  - As soon as possible
  - Within 3 months
  - Within 6 months
  - Next available litter
  - Flexible

OptionGroup: Budget range *
  - Standard Puppy (contact us for current pricing)
  - Elite / Developed (contact us for current pricing)
  - Open — best available dog regardless of price

ToggleRow: "I plan to enrol this dog in professional obedience or protection training"

ControlledInput: Security or training requirements (optional, multiline)
  placeholder: "Any specific security, sport, or training goals for this dog"

AgreementBox (single mandatory tick):
  Title: "Pretoria collection / delivery"
  Description: "I understand and acknowledge that all puppies from Diedericks Dobermanns are collected from, or delivered to, Pretoria on the confirmed handover date. I am responsible for arranging transport from Pretoria if I am based elsewhere. Any deviation from this arrangement must be discussed and agreed in writing with Diedericks Dobermanns in advance."
  Field: delivery_acknowledged (z.literal(true))

ControlledInput: Special requests or additional information (optional, multiline)
  label: "Special requests"
  placeholder: "Any additional requests, preferences, or information you would like us to consider (e.g. ear cropping preference, specific bloodline interest, timing constraints)"
```

### Step 5 — Terms & Conditions (all 6 mandatory)

Show this header card at the top:
```
Gold-bordered info card:
Title (gold, small caps): "Please read and tick each clause individually"
Body: "All six clauses are mandatory. You cannot submit your application until every condition has been individually acknowledged. These terms exist to protect the welfare of every dog we produce."
```

Then render 6 AgreementBox components:

```
1. No Breeding Rights
   "I understand and agree that this dog is sold WITHOUT breeding rights. I may not breed from this animal, register offspring from it, or use it for stud or whelping purposes without prior written consent from Diedericks Dobermanns. Unauthorised breeding will result in the immediate recall of the dog at the buyer's expense."

2. Right of Recall
   "I understand that Diedericks Dobermanns holds the unconditional right to recall and repossess this dog at any time if, in their sole judgement, the animal is subject to neglect, abuse, inadequate care, or unsuitable living conditions. I agree to permit welfare inspections when requested and to cooperate fully with any recall process."

3. No Resale Without Consent
   "I agree not to sell, transfer, give away, or rehome this dog to any third party without first obtaining written consent from Diedericks Dobermanns. In the event that I am unable to continue caring for this dog, I agree to return it to Diedericks Dobermanns as the priority option, with no financial expectation from either party."

4. Lifetime Welfare Commitment
   "I commit to providing this dog with appropriate and regular veterinary care, high-quality nutrition, daily exercise, socialisation, mental stimulation, and a safe, enriched living environment for the full duration of its life. I understand that Dobermanns are active, intelligent, working breed dogs that require significant daily engagement and human companionship."

5. Microchip & Registration Policy
   "I acknowledge that all dogs from Diedericks Dobermanns are microchipped and remain on the kennel's registry. Transfer of registration requires written authorisation from Diedericks Dobermanns. I agree not to alter, remove, or obscure the microchip and to update my contact details with the relevant national registry in the event of a change of address."

6. Full Terms & Conditions of Sale
   "I confirm that I have read, understood, and agree to the full Terms & Conditions of Sale of Diedericks Dobermanns, including all policies relating to deposits, health guarantees, puppy selection, delivery, and post-sale obligations."
```

Link below the boxes:
```typescript
<Pressable onPress={() => router.push('/terms')}>
  <Typography variant="caption" className="text-gold underline">
    Read the full Terms & Conditions →
  </Typography>
</Pressable>
<Pressable onPress={() => router.push('/privacy')} className="mt-1">
  <Typography variant="caption" className="text-gold underline">
    Read our Privacy Policy →
  </Typography>
</Pressable>
```

### Step 6 — Review & Submit

Display all answers in grouped ReviewRow sections:
- Personal Details (name, DOB, ID, email, phone, occupation, address)
- Home & Lifestyle (home type, yard, sleeping, hours alone)
- Experience (why dobermann, previous experience)
- Dog Preference (interest, purpose, sex, colour, tail, timeline, budget)
- Legal Agreements (show all 6 as ✓ Agreed)

Submit button triggers `handleSubmit(onValid)`.

---

## PART 4 — Update `hooks/useApplications.ts`

Update the `ApplicationDraft` type to include all new fields and pass them through to the Supabase insert. Add:

```typescript
// New fields — add to the ApplicationDraft type:
date_of_birth:              string | null;
occupation:                 string | null;
employer:                   string | null;
instagram_handle:           string | null;
facebook_profile:           string | null;
yard_size:                    string | null;
sleeping_arrangement:         string | null;
hours_alone_per_day:          string | null;
exercise_level:               string | null;
why_dobermann:                string | null;
dobermann_experience_level:   string | null;
aware_of_dcm:                 string | null;
aware_of_commitment:          string | null;
aware_of_costs:               string | null;
previous_dog_fate:            string | null;
preferred_sex:              string | null;
preferred_colour:           string | null;
tail_preference:            string | null;
preferred_timeline:         string | null;
budget_range:               string | null;
training_planned:           boolean;
delivery_acknowledged:      boolean;
special_requests:           string | null;
agreed_no_breeding_rights:  boolean;
agreed_right_of_recall:     boolean;
agreed_no_resale:           boolean;
agreed_welfare_commitment:  boolean;
agreed_microchip_policy:    boolean;
```

---

## PART 5 — Create Privacy Policy Screen

**File:** `app/(public)/privacy.tsx`

```typescript
import { ScrollView, View } from 'react-native';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Card } from '@/components/ui/Card';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Typography variant="subtitle" className="mb-2 text-gold">{title}</Typography>
      {children}
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  return (
    <ScreenContainer>
      <PageHeader eyebrow="Legal" title="Privacy Policy" back />
      <View className="px-6 pb-10">
        <Typography variant="bodyMuted" className="mb-6 text-sm">
          Last updated: June 2026 · Diedericks Dobermanns
        </Typography>

        <Section title="1. Who we are">
          <Typography variant="body">
            Diedericks Dobermanns is a professional Dobermann breeding and training operation.
            We collect and process personal information in order to evaluate puppy applications,
            manage client relationships, and operate our training programme.
          </Typography>
        </Section>

        <Section title="2. What information we collect">
          <Typography variant="body">
            Through this application form we collect: your full name, date of birth, identity
            number or passport number, email address, phone number, physical address, occupation,
            social media handles, and information about your home environment, lifestyle, and
            experience with dogs.{'\n\n'}
            We also collect your stated preferences regarding the dog you are applying for, and
            your acknowledgement of our Terms & Conditions.
          </Typography>
        </Section>

        <Section title="3. Why we collect it">
          <Typography variant="body">
            Your information is collected exclusively to:{'\n'}
            • Evaluate your suitability as a Dobermann owner{'\n'}
            • Communicate with you regarding your application{'\n'}
            • Match you with the right dog for your circumstances{'\n'}
            • Maintain records as required by responsible breeding practice{'\n'}
            • Contact your references or veterinarian where necessary
          </Typography>
        </Section>

        <Section title="4. Who we share it with">
          <Typography variant="body">
            We do not sell, rent, or share your personal information with any third party for
            commercial purposes. Your information may be shared with:{'\n'}
            • Veterinarians or references you have provided, for verification purposes{'\n'}
            • Our kennel management system (Supabase — hosted on ISO 27001 certified infrastructure){'\n'}
            • Law enforcement or regulatory bodies if required by law
          </Typography>
        </Section>

        <Section title="5. How we store it">
          <Typography variant="body">
            Your data is stored securely in an encrypted database. Access is restricted to
            authorised kennel staff only. We retain application records for a minimum of 3 years
            from the date of submission. You may request deletion of your data at any time by
            contacting us directly, subject to our legal record-keeping obligations.
          </Typography>
        </Section>

        <Section title="6. Your rights">
          <Typography variant="body">
            You have the right to:{'\n'}
            • Request access to the personal information we hold about you{'\n'}
            • Request correction of inaccurate information{'\n'}
            • Request deletion of your information (where not legally required to retain it){'\n'}
            • Withdraw consent for non-essential communications at any time{'\n\n'}
            To exercise any of these rights, contact us at diedericksdobermannssa@gmail.com
          </Typography>
        </Section>

        <Section title="7. Cookies & tracking">
          <Typography variant="body">
            This mobile application does not use cookies. We do not track your behaviour across
            other applications or websites. Usage analytics collected within the app are anonymous
            and are used only to improve the application experience.
          </Typography>
        </Section>

        <Section title="8. Contact">
          <Typography variant="body">
            For any privacy-related queries, contact:{'\n'}
            Email: diedericksdobermannssa@gmail.com{'\n'}
            Phone: +27 78 215 0832
          </Typography>
        </Section>
      </View>
    </ScreenContainer>
  );
}
```

---

## PART 6 — Create Terms & Conditions Screen

**File:** `app/(public)/terms.tsx`

```typescript
import { View } from 'react-native';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Typography variant="subtitle" className="mb-2 text-gold">{title}</Typography>
      {children}
    </View>
  );
}

export default function TermsScreen() {
  return (
    <ScreenContainer>
      <PageHeader eyebrow="Legal" title="Terms & Conditions" back />
      <View className="px-6 pb-10">
        <Typography variant="bodyMuted" className="mb-6 text-sm">
          Last updated: June 2026 · Diedericks Dobermanns
        </Typography>

        <Section title="1. Application & acceptance">
          <Typography variant="body">
            Submission of an application does not constitute an agreement to sell. Diedericks
            Dobermanns reserves the right to accept or decline any application at our sole
            discretion. All placements are subject to our approval of the applicant's suitability.
          </Typography>
        </Section>

        <Section title="2. Deposit & payment">
          <Typography variant="body">
            A non-refundable deposit is required to secure a puppy reservation. The deposit amount
            will be communicated upon application approval. The balance of the purchase price is
            due in full before or on the day of collection. All prices are quoted in South African
            Rand (ZAR) unless otherwise agreed in writing.
          </Typography>
        </Section>

        <Section title="3. No breeding rights">
          <Typography variant="body">
            All dogs sold by Diedericks Dobermanns are sold WITHOUT breeding rights unless
            explicitly stated in a separate written agreement signed by the kennel principal.
            Breeding from, registering offspring of, or using any dog sold by Diedericks
            Dobermanns for stud or whelping purposes without prior written consent is a breach
            of these Terms and will result in the immediate recall of the dog. No refund will
            be issued in the event of a recall due to breach of this clause.
          </Typography>
        </Section>

        <Section title="4. Right of recall">
          <Typography variant="body">
            Diedericks Dobermanns reserves the unconditional right to recall and repossess any
            dog sold by the kennel at any time if, in our sole judgement, the animal is subject
            to neglect, abuse, inadequate nutrition, inadequate veterinary care, unsuitable living
            conditions, or any circumstances that compromise the welfare of the dog.{'\n\n'}
            The buyer agrees to permit welfare inspections of the dog and its living environment
            by an authorised representative of Diedericks Dobermanns upon reasonable notice.
            In emergency welfare situations, no prior notice is required.{'\n\n'}
            In the event of a welfare recall, the buyer forfeits the purchase price and all costs
            associated with the recall are borne by the buyer.
          </Typography>
        </Section>

        <Section title="5. Resale & transfer">
          <Typography variant="body">
            The buyer may not sell, transfer, give away, donate, or rehome any dog purchased from
            Diedericks Dobermanns without first:{'\n'}
            (a) Notifying Diedericks Dobermanns in writing of the intention to rehome{'\n'}
            (b) Offering the dog back to Diedericks Dobermanns as the first option{'\n'}
            (c) Obtaining written consent from Diedericks Dobermanns before any transfer{'\n\n'}
            Diedericks Dobermanns will not charge the buyer in the event of a return. The buyer
            may not seek financial compensation for a returned dog.
          </Typography>
        </Section>

        <Section title="6. Health guarantee">
          <Typography variant="body">
            All puppies are sold with a health check by a registered veterinarian prior to
            departure. Puppies are vaccinated and dewormed according to our standard programme.
            All breeding stock is health-tested for DCM (Dilated Cardiomyopathy genetic panels),
            hip dysplasia, and elbow dysplasia.{'\n\n'}
            The buyer acknowledges that Dobermanns as a breed carry a genetic predisposition
            to DCM and that this health guarantee does not cover the development of DCM or
            other hereditary conditions that may manifest later in the dog's life. The kennel's
            health testing reduces, but does not eliminate, this risk.{'\n\n'}
            Any health concerns must be reported to us within 48 hours of collection, supported
            by a veterinary examination. Health guarantees are void if the dog has been subjected
            to negligent care or has been handled by persons other than those approved at the
            time of purchase.
          </Typography>
        </Section>

        <Section title="7. Collection & delivery">
          <Typography variant="body">
            All standard puppy collections take place in Pretoria on the confirmed handover date.
            The buyer is responsible for transport costs from Pretoria unless a separate delivery
            arrangement has been agreed in writing.{'\n\n'}
            Elite Developed Puppies and Elite Family Protection Dogs include personal delivery
            and formal handover by a Diedericks Dobermanns representative. Delivery destination
            will be agreed at time of sale.{'\n\n'}
            Failure to collect on the agreed date without prior written notice may result in
            forfeiture of the reservation deposit and cancellation of the sale.
          </Typography>
        </Section>

        <Section title="8. Microchip & registration">
          <Typography variant="body">
            All dogs are microchipped prior to sale. The microchip is registered to the buyer
            upon completion of sale. The buyer may not alter, remove, or obscure the microchip
            and must update the national registry in the event of a change of ownership or
            address.{'\n\n'}
            All dogs remain on the Diedericks Dobermanns kennel registry for the lifetime of
            the dog. Transfer of KUSA or kennel club registration requires written authorisation
            from Diedericks Dobermanns.
          </Typography>
        </Section>

        <Section title="9. Limitation of liability">
          <Typography variant="body">
            Diedericks Dobermanns shall not be liable for any loss, damage, injury, or cost
            arising from the ownership of any dog sold by the kennel, including but not limited
            to damage caused by the dog to third parties, property, or other animals. The buyer
            accepts full legal responsibility for the dog from the moment of collection.
          </Typography>
        </Section>

        <Section title="10. Governing law">
          <Typography variant="body">
            These Terms & Conditions are governed by the laws of the Republic of South Africa.
            Any disputes shall be subject to the jurisdiction of the South African courts.
          </Typography>
        </Section>

        <Section title="11. Contact">
          <Typography variant="body">
            Diedericks Dobermanns{'\n'}
            Email: diedericksdobermannssa@gmail.com{'\n'}
            Phone: +27 78 215 0832{'\n'}
            Pretoria, South Africa
          </Typography>
        </Section>
      </View>
    </ScreenContainer>
  );
}
```

---

## PART 7 — Register New Routes

In `app/(public)/_layout.tsx` (or wherever the public stack is defined), make sure these screens are registered:

```typescript
<Stack.Screen name="privacy" options={{ headerShown: false }} />
<Stack.Screen name="terms" options={{ headerShown: false }} />
```

---

## Critical Rules for Cursor

1. Run the SQL migration FIRST — before touching any TypeScript
2. Keep every file under 300 lines — split step components if needed
3. Every AgreementBox must be individually tappable — not grouped
4. The submit button must remain disabled/loading until handleSubmit validates all fields
5. `tail_preference` is critical — add a helper text note below the OptionGroup explaining it must be decided before whelping
6. `delivery_acknowledged` renders as an AgreementBox (tappable card), not a toggle
7. In Step 3, the three due diligence boxes (`aware_of_dcm`, `aware_of_commitment`, `aware_of_costs`) also use the AgreementBox component — same visual treatment as the legal step
8. Do not use `select('*')` in any Supabase query — always list explicit columns
9. No TypeScript errors on completion (`npx tsc --noEmit`)
10. Both `/privacy` and `/terms` screens must have a back button (use `PageHeader` with `back={true}`)

---

## Testing Checklist

**Application Form**
- [ ] All 6 steps navigate forward and back
- [ ] Cannot advance past Step 3 without ticking all 3 due diligence boxes
- [ ] Cannot advance past Step 4 without selecting tail preference and ticking delivery box
- [ ] Cannot advance past Step 5 without all 6 legal boxes individually ticked
- [ ] Tail preference helper text is visible below the OptionGroup
- [ ] Special requests field accepts free text of any length
- [ ] Review step shows correct data from all steps
- [ ] Submit creates a record in Supabase `applications` table with all new fields
- [ ] Reference number appears on success screen

**Privacy & T&Cs**
- [ ] `/privacy` route accessible from contact screen and footer
- [ ] `/terms` route accessible from application form legal step
- [ ] Both screens have working back navigation
- [ ] Text is readable in dark theme
- [ ] No overflow or clipping issues on small screens

**TypeScript**
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] All new fields in ApplicationDraft type match database columns exactly
