# Cursor Prompt — Website Application Form Sync
## Project: diedericksdobermann-web (Next.js 15, Tailwind CSS v4)
## Supabase project: nlmwxodvquwbjinhhbmr

---

## Context

This is the public website for Diedericks Dobermanns — a premium Dobermann breeding and training business. The website is a Next.js 15 App Router project.

The mobile app (React Native / Expo) was recently updated with a new 6-step puppy application form that collects significantly more information than the website form. The website form must now be rewritten to exactly match the mobile app's data model.

**The Supabase `applications` table already has all the required columns. No database migration is needed.**

Brand tokens: background `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`, muted `#8C8474`. Headings use Cinzel font, body uses Lato.

---

## What Needs To Change

Two files need to be fully rewritten:
1. `src/components/forms/ApplicationForm.tsx` — the 5-step form must become a 6-step form
2. `src/app/api/apply/route.ts` — the API must validate and insert all new fields

No other files need to change.

---

## TASK 1 — Rewrite `src/components/forms/ApplicationForm.tsx`

Completely rewrite this component. Keep the same visual style (Cinzel headings, gold progress bar, `GoldButton`), but replace all form content with the 6-step structure below.

### Step Structure

| Step | Title | Key Fields |
|------|-------|-----------|
| 1 | Personal Information | full_name, date_of_birth, id_number, email, phone, occupation, employer, country, province, city, address, instagram_handle, facebook_profile |
| 2 | Your Home & Lifestyle | home_type, has_secure_yard, yard_size, sleeping_arrangement, hours_alone_per_day, exercise_level, current_pets, children_ages |
| 3 | Experience & Due Diligence | why_dobermann, dobermann_experience_level, aware_of_dcm, aware_of_commitment, aware_of_costs, previous_dog_fate, experience_with_dobermanns, vet_name, vet_phone, personal_reference_name, personal_reference_phone |
| 4 | Puppy Preferences | dog_interest, purpose, preferred_sex, preferred_colour, tail_preference, preferred_timeline, budget_range, training_planned, delivery_acknowledged, special_requests |
| 5 | Legal Agreements | agreed_no_breeding_rights, agreed_right_of_recall, agreed_no_resale, agreed_welfare_commitment, agreed_microchip_policy, agreed_to_terms |
| 6 | Review & Submit | Read-only summary of all answers before final submit button |

### Zod Schema (exact — do not deviate)

```typescript
import { z } from "zod";

export const applicationSchema = z.object({
  // Step 1 — Personal
  full_name: z.string().min(2, "Full name is required"),
  date_of_birth: z.string().min(4, "Date of birth is required"),
  id_number: z.string().min(6, "ID or passport number is required"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().min(7, "Enter a valid phone number"),
  occupation: z.string().min(2, "Occupation is required"),
  employer: z.string().optional().or(z.literal("")),
  country: z.string().min(2, "Country is required"),
  province: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  address: z.string().min(5, "Physical address where the dog will live is required"),
  instagram_handle: z.string().optional().or(z.literal("")),
  facebook_profile: z.string().optional().or(z.literal("")),

  // Step 2 — Home & Lifestyle
  home_type: z.enum(["house", "apartment", "smallholding", "farm"], {
    message: "Select your home type",
  }),
  has_secure_yard: z.enum(["yes", "no", "in_progress"], {
    message: "Select your yard situation",
  }),
  yard_size: z.enum(["small_under_200", "medium_200_500", "large_500_plus", "open_land", "no_yard"], {
    message: "Select your property size",
  }),
  sleeping_arrangement: z.enum(
    ["inside_bedroom", "inside_lounge", "indoor_kennel", "outdoor_kennel", "mixed_indoor_outdoor"],
    { message: "Select sleeping arrangement" },
  ),
  hours_alone_per_day: z.enum(["0_2", "2_4", "4_6", "6_8", "8_plus"], {
    message: "Select how many hours the dog will be alone",
  }),
  exercise_level: z.enum(["very_active", "active", "moderate", "light"], {
    message: "Select your activity level",
  }),
  current_pets: z.string().optional().or(z.literal("")),
  children_ages: z.string().optional().or(z.literal("")),

  // Step 3 — Experience & Due Diligence
  why_dobermann: z.string().min(10, "Please tell us why you want a Dobermann (min 10 characters)"),
  dobermann_experience_level: z.enum(
    ["never_owned", "researched_only", "previous_owner", "experienced_handler", "breeder_trainer"],
    { message: "Select your experience level" },
  ),
  aware_of_dcm: z.enum(["yes_fully_aware", "aware_learning_more", "not_aware"], {
    message: "Select your awareness of Dobermann health risks",
  }),
  aware_of_commitment: z.enum(["yes_fully_prepared", "mostly_prepared", "need_more_info"], {
    message: "Select your commitment level",
  }),
  aware_of_costs: z.enum(["yes_fully_budgeted", "mostly_prepared", "need_cost_breakdown"], {
    message: "Select your financial readiness",
  }),
  previous_dog_fate: z.string().optional().or(z.literal("")),
  experience_with_dobermanns: z.string().optional().or(z.literal("")),
  vet_name: z.string().optional().or(z.literal("")),
  vet_phone: z.string().optional().or(z.literal("")),
  personal_reference_name: z.string().optional().or(z.literal("")),
  personal_reference_phone: z.string().optional().or(z.literal("")),

  // Step 4 — Puppy Preferences
  dog_interest: z.enum(["puppy", "elite_developed", "protection_dog"], {
    message: "Select what you are interested in",
  }),
  purpose: z.enum(["family", "protection", "sport", "companion"], {
    message: "Select a primary purpose",
  }),
  preferred_sex: z.enum(["male", "female", "no_preference"], {
    message: "Select preferred sex",
  }),
  preferred_colour: z.enum(["black_tan", "brown_tan", "blue_tan", "fawn_tan", "no_preference"], {
    message: "Select preferred colour",
  }),
  tail_preference: z.enum(["docked", "natural", "no_preference"], {
    message: "Select tail preference — this must be decided before whelping",
  }),
  preferred_timeline: z.enum(["asap", "3_months", "6_months", "next_litter", "flexible"], {
    message: "Select your preferred timeline",
  }),
  budget_range: z.enum(["standard", "elite", "open"], {
    message: "Select your budget range",
  }),
  training_planned: z.boolean(),
  security_requirements: z.string().optional().or(z.literal("")),
  delivery_acknowledged: z.literal(true, {
    message: "You must acknowledge the Pretoria collection / delivery requirement",
  }),
  special_requests: z.string().optional().or(z.literal("")),

  // Step 5 — Legal Agreements (all individually mandatory)
  agreed_no_breeding_rights: z.literal(true, {
    message: "You must acknowledge the no breeding rights condition",
  }),
  agreed_right_of_recall: z.literal(true, {
    message: "You must acknowledge our right of recall",
  }),
  agreed_no_resale: z.literal(true, {
    message: "You must acknowledge the no resale without consent condition",
  }),
  agreed_welfare_commitment: z.literal(true, {
    message: "You must commit to the lifetime welfare of this dog",
  }),
  agreed_microchip_policy: z.literal(true, {
    message: "You must acknowledge the microchip and registration policy",
  }),
  agreed_to_terms: z.literal(true, {
    message: "You must agree to the full Terms & Conditions of Sale",
  }),
});

export type ApplicationFormValues = z.infer<typeof applicationSchema>;
```

### Step Field Groupings (for validation on Continue)

```typescript
const STEP_FIELDS: (keyof ApplicationFormValues)[][] = [
  // Step 0 — Personal
  ["full_name", "date_of_birth", "id_number", "email", "phone", "occupation", "country", "address"],
  // Step 1 — Home & Lifestyle
  ["home_type", "has_secure_yard", "yard_size", "sleeping_arrangement", "hours_alone_per_day", "exercise_level"],
  // Step 2 — Experience
  ["why_dobermann", "dobermann_experience_level", "aware_of_dcm", "aware_of_commitment", "aware_of_costs"],
  // Step 3 — Preferences
  ["dog_interest", "purpose", "preferred_sex", "preferred_colour", "tail_preference", "preferred_timeline", "budget_range", "delivery_acknowledged"],
  // Step 4 — Legal
  ["agreed_no_breeding_rights", "agreed_right_of_recall", "agreed_no_resale", "agreed_welfare_commitment", "agreed_microchip_policy", "agreed_to_terms"],
  // Step 5 — Review (no validation — user reads then submits)
  [],
];
```

### Dropdown Option Labels

Use these exact labels for every `<select>` on the form:

**home_type**
- `house` → House
- `apartment` → Apartment / Complex
- `smallholding` → Smallholding
- `farm` → Farm / Agricultural property

**has_secure_yard**
- `yes` → Yes — fully fenced and secure
- `no` → No
- `in_progress` → Not yet — fencing in progress

**yard_size**
- `small_under_200` → Small (under 200m²)
- `medium_200_500` → Medium (200–500m²)
- `large_500_plus` → Large (500m²+)
- `open_land` → Open land / farm
- `no_yard` → No yard

**sleeping_arrangement**
- `inside_bedroom` → Inside — bedroom
- `inside_lounge` → Inside — lounge / living area
- `indoor_kennel` → Inside — dedicated indoor kennel
- `outdoor_kennel` → Outside — secure outdoor kennel
- `mixed_indoor_outdoor` → Mixed — indoor and outdoor access

**hours_alone_per_day**
- `0_2` → 0–2 hours
- `2_4` → 2–4 hours
- `4_6` → 4–6 hours
- `6_8` → 6–8 hours
- `8_plus` → More than 8 hours

**exercise_level**
- `very_active` → Very active (daily runs, sport, training)
- `active` → Active (daily walks, active lifestyle)
- `moderate` → Moderate (regular walks)
- `light` → Light

**dobermann_experience_level**
- `never_owned` → Never owned a Dobermann
- `researched_only` → Never owned — have done research
- `previous_owner` → Previous Dobermann owner
- `experienced_handler` → Experienced handler / trainer
- `breeder_trainer` → Breeder or professional trainer

**aware_of_dcm**
- `yes_fully_aware` → Fully aware and prepared
- `aware_learning_more` → Aware — still learning more
- `not_aware` → Not yet aware — please send me more information

**aware_of_commitment**
- `yes_fully_prepared` → Fully prepared for 10–13 year commitment
- `mostly_prepared` → Mostly prepared
- `need_more_info` → Need more information before committing

**aware_of_costs**
- `yes_fully_budgeted` → Fully budgeted — I understand the costs
- `mostly_prepared` → Mostly prepared
- `need_cost_breakdown` → I need a breakdown of expected costs

**dog_interest**
- `puppy` → Standard Puppy
- `elite_developed` → Elite Developed Puppy (8–16 weeks structured programme)
- `protection_dog` → Fully Trained Personal Protection Dog

**purpose**
- `family` → Family Companion
- `protection` → Personal / Property Protection
- `sport` → Sport (PSA / IGP)
- `companion` → Companion

**preferred_sex**
- `male` → Male
- `female` → Female
- `no_preference` → No preference

**preferred_colour**
- `black_tan` → Black & Tan
- `brown_tan` → Brown & Tan
- `blue_tan` → Blue & Tan
- `fawn_tan` → Fawn & Tan (Isabella)
- `no_preference` → No preference

**tail_preference**
- `docked` → Docked (traditional — must be decided before whelping)
- `natural` → Natural (undocked)
- `no_preference` → No preference

**preferred_timeline**
- `asap` → As soon as possible
- `3_months` → Within 3 months
- `6_months` → Within 6 months
- `next_litter` → Next available litter
- `flexible` → Flexible — willing to wait for the right dog

**budget_range**
- `standard` → Standard Puppy
- `elite` → Elite / Developed Programme
- `open` → Open — best available option

### Step 4 Special Fields

**`training_planned`** — render as a single checkbox:
```
[ ] I plan to enrol this dog in formal obedience or protection training
```

**`delivery_acknowledged`** — render as a required checkbox (must tick to continue):
```
[ ] I understand that all puppies are collected or delivered from Pretoria, 
    South Africa on the agreed handover date. I confirm I can arrange transport.
```
This is a `z.literal(true)` field — show an error message if not ticked when the user clicks Continue.

**`special_requests`** — free text area:
```
Label: Special Requests (Optional)
Placeholder: Any other notes — coat colour preference, ear cropping preference, 
             specific litter, or other requests...
```

### Step 5 — Legal Agreements

Each agreement is a separate required checkbox with `z.literal(true)`. Render each as:
- Bold heading
- 2–3 sentence explanation below
- Checkbox: "I understand and agree"
- Error message in red if not ticked

Use these exact texts:

**No Breeding Rights**
Heading: No Breeding Rights
Text: This dog is sold as a pet/working dog only. No breeding rights are included in the sale price. Breeding from this dog without written consent from Diedericks Dobermanns is a breach of the sale agreement and may trigger the right of recall.

**Right of Recall**
Heading: Right of Recall
Text: Diedericks Dobermanns reserves the right to reclaim this dog at any time if we believe the animal is being neglected, abused, improperly housed, or is being used for purposes contrary to this agreement. The purchase price will not be refunded in cases of recall due to welfare violations.

**No Resale Without Consent**
Heading: No Resale Without Consent
Text: This dog may not be sold, rehomed, surrendered to a shelter, or transferred to another person without the prior written consent of Diedericks Dobermanns. We have the right of first refusal on any resale.

**Welfare Commitment**
Heading: Lifetime Welfare Commitment
Text: I commit to providing this dog with adequate food, clean water, shelter, veterinary care, exercise, and social interaction for its entire life. I understand that a Dobermann is a high-energy, intelligent working breed that requires daily stimulation and human companionship.

**Microchip & Registration**
Heading: Microchip & Registration
Text: This dog will be delivered microchipped and registered. I agree to keep the microchip registration current in my name and to never have the microchip removed. In the event of ownership transfer (with consent), the registration must be updated within 30 days.

**Terms & Conditions**
Heading: Full Terms & Conditions of Sale
Text: I have read and understood the complete Terms & Conditions of Sale. I agree to be bound by all conditions set out therein, including health guarantees, vaccination schedules, and ownership obligations.
Link: Include a "Read full Terms & Conditions →" link that opens /terms in a new tab.

### Step 6 — Review & Submit

A clean read-only summary card for each section:
- Personal details (name, email, phone, address)
- Home & lifestyle (home type, yard, hours alone)
- Experience (experience level, DCM awareness)
- Preferences (sex, colour, tail, timeline, budget)
- Legal (show each agreement as "✓ Agreed" in gold)

Below the summary: a **Submit Application** button. If `isSubmitting`, show "Submitting…" and disable the button.

### Form Submission

Submit the form values to `/api/apply` via `fetch`:

```typescript
const onSubmit = async (values: ApplicationFormValues) => {
  setServerError(null);
  const res = await fetch("/api/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...values,
      specific_dog_id: undefined,   // not collected on website form
      litter_interest_id: undefined,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    setServerError(data?.error ?? "Could not submit your application.");
    return;
  }
  setSubmitted(values.full_name);
};
```

On success, show the existing thank-you card with the applicant's name.

### File Size Rule

If `ApplicationForm.tsx` would exceed 300 lines, split it into:
- `ApplicationForm/index.tsx` — orchestrator (wizard state, form provider, submit logic)
- `ApplicationForm/Step1Personal.tsx`
- `ApplicationForm/Step2Lifestyle.tsx`
- `ApplicationForm/Step3Experience.tsx`
- `ApplicationForm/Step4Preferences.tsx`
- `ApplicationForm/Step5Legal.tsx`
- `ApplicationForm/Step6Review.tsx`
- `ApplicationForm/schema.ts` — zod schema and types
- `ApplicationForm/labels.ts` — option label maps

This split is preferred even if the file is under 300 lines — it matches the mobile app architecture and makes maintenance much easier.

---

## TASK 2 — Rewrite `src/app/api/apply/route.ts`

Replace the schema and insert with the full field set:

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  full_name: z.string().min(2),
  date_of_birth: z.string().optional().or(z.literal("")),
  id_number: z.string().optional().or(z.literal("")),
  email: z.string().email(),
  phone: z.string().min(5),
  occupation: z.string().optional().or(z.literal("")),
  employer: z.string().optional().or(z.literal("")),
  country: z.string().min(2),
  province: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  instagram_handle: z.string().optional().or(z.literal("")),
  facebook_profile: z.string().optional().or(z.literal("")),

  home_type: z.string().optional(),
  has_secure_yard: z.enum(["yes", "no", "in_progress"]).optional(),
  yard_size: z.string().optional(),
  sleeping_arrangement: z.string().optional(),
  hours_alone_per_day: z.string().optional(),
  exercise_level: z.string().optional(),
  current_pets: z.string().optional().or(z.literal("")),
  children_ages: z.string().optional().or(z.literal("")),

  why_dobermann: z.string().optional().or(z.literal("")),
  dobermann_experience_level: z.string().optional(),
  aware_of_dcm: z.string().optional(),
  aware_of_commitment: z.string().optional(),
  aware_of_costs: z.string().optional(),
  previous_dog_fate: z.string().optional().or(z.literal("")),
  experience_with_dobermanns: z.string().optional().or(z.literal("")),
  vet_name: z.string().optional().or(z.literal("")),
  vet_phone: z.string().optional().or(z.literal("")),
  personal_reference_name: z.string().optional().or(z.literal("")),
  personal_reference_phone: z.string().optional().or(z.literal("")),

  dog_interest: z.string().optional(),
  specific_dog_id: z.string().uuid().optional().or(z.literal("")).or(z.undefined()),
  litter_interest_id: z.string().uuid().optional().or(z.literal("")).or(z.undefined()),
  purpose: z.string().optional(),
  preferred_sex: z.string().optional(),
  preferred_colour: z.string().optional(),
  tail_preference: z.string().optional(),
  preferred_timeline: z.string().optional(),
  budget_range: z.string().optional(),
  training_planned: z.boolean().optional(),
  security_requirements: z.string().optional().or(z.literal("")),
  delivery_acknowledged: z.boolean().optional(),
  special_requests: z.string().optional().or(z.literal("")),

  agreed_no_breeding_rights: z.boolean().optional(),
  agreed_right_of_recall: z.boolean().optional(),
  agreed_no_resale: z.boolean().optional(),
  agreed_welfare_commitment: z.boolean().optional(),
  agreed_microchip_policy: z.boolean().optional(),
  agreed_to_terms: z.literal(true),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please complete all required fields." },
      { status: 422 },
    );
  }
  const v = parsed.data;

  const supabase = createAdminClient();
  const { error } = await supabase.from("applications").insert({
    full_name: v.full_name,
    date_of_birth: v.date_of_birth || null,
    id_number: v.id_number || null,
    email: v.email,
    phone: v.phone,
    occupation: v.occupation || null,
    employer: v.employer || null,
    country: v.country,
    province: v.province || null,
    city: v.city || null,
    address: v.address || null,
    instagram_handle: v.instagram_handle || null,
    facebook_profile: v.facebook_profile || null,

    home_type: v.home_type || null,
    has_secure_yard: v.has_secure_yard || null,
    yard_size: v.yard_size || null,
    sleeping_arrangement: v.sleeping_arrangement || null,
    hours_alone_per_day: v.hours_alone_per_day || null,
    exercise_level: v.exercise_level || null,
    current_pets: v.current_pets || null,
    children_ages: v.children_ages || null,

    why_dobermann: v.why_dobermann || null,
    dobermann_experience_level: v.dobermann_experience_level || null,
    aware_of_dcm: v.aware_of_dcm || null,
    aware_of_commitment: v.aware_of_commitment || null,
    aware_of_costs: v.aware_of_costs || null,
    previous_dog_fate: v.previous_dog_fate || null,
    experience_with_dobermanns: v.experience_with_dobermanns || null,
    vet_name: v.vet_name || null,
    vet_phone: v.vet_phone || null,
    personal_reference_name: v.personal_reference_name || null,
    personal_reference_phone: v.personal_reference_phone || null,

    dog_interest: v.dog_interest || null,
    specific_dog_id: v.specific_dog_id || null,
    litter_interest_id: v.litter_interest_id || null,
    purpose: v.purpose || null,
    preferred_sex: v.preferred_sex || null,
    preferred_colour: v.preferred_colour || null,
    tail_preference: v.tail_preference || null,
    preferred_timeline: v.preferred_timeline || null,
    budget_range: v.budget_range || null,
    training_planned: v.training_planned ?? null,
    security_requirements: v.security_requirements || null,
    delivery_acknowledged: v.delivery_acknowledged ?? null,
    special_requests: v.special_requests || null,

    agreed_no_breeding_rights: v.agreed_no_breeding_rights ?? null,
    agreed_right_of_recall: v.agreed_right_of_recall ?? null,
    agreed_no_resale: v.agreed_no_resale ?? null,
    agreed_welfare_commitment: v.agreed_welfare_commitment ?? null,
    agreed_microchip_policy: v.agreed_microchip_policy ?? null,
    agreed_to_terms: v.agreed_to_terms,
    status: "pending",
  });

  if (error) {
    console.error("[api/apply]", error);
    return NextResponse.json(
      { error: "Could not submit your application. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
```

---

## TASK 3 — Contact Details

Check `src/app/(site)/contact/page.tsx` and any contact data files. Update these values wherever they appear:

- Phone: `+27 78 215 0832`
- WhatsApp: `https://wa.me/27782150832`
- Email: `diedericksdobermannssa@gmail.com`
- Instagram: `https://instagram.com/diedericksdobermanns`

---

## Critical Rules — Do NOT Break These

1. **Do NOT expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.** The API route uses `createAdminClient()` (server-side only). The form component is a client component that calls `/api/apply` via fetch — it never touches Supabase directly.
2. **Do NOT use `z.boolean()` for `has_secure_yard`.** It is now a text enum (`"yes" | "no" | "in_progress"`) in the database.
3. **Do NOT change the database schema.** All columns already exist.
4. **Keep TypeScript strict.** No `any`. No `as unknown`.
5. **Keep every file under 300 lines.** Split `ApplicationForm.tsx` into sub-components if needed.

---

## Testing Checklist

After completing these tasks, verify:

- [ ] Website form at `/apply` loads without TypeScript or console errors
- [ ] Step 1: Required fields (full_name, date_of_birth, id_number, email, phone, occupation, country, address) block "Continue" if empty
- [ ] Step 2: All 6 dropdowns present and functional
- [ ] Step 3: `why_dobermann` text area present; all 3 awareness dropdowns present
- [ ] Step 4: All 7 dropdowns present; `delivery_acknowledged` checkbox blocks Continue if unticked
- [ ] Step 5: All 6 checkboxes individually required; each shows its own error if unticked
- [ ] Step 6: Review summary shows all answers before submit
- [ ] Submission inserts a complete row in Supabase `applications` table
- [ ] Submitted row contains `has_secure_yard` as text ('yes'/'no'/'in_progress'), not boolean
- [ ] Thank-you card displays on success
- [ ] `npx tsc --noEmit` passes with zero errors in `diedericksdobermann-web`

---

## Execution Order

1. Create `ApplicationForm/schema.ts` with the Zod schema and types
2. Create `ApplicationForm/labels.ts` with option label maps
3. Create `ApplicationForm/Step1Personal.tsx` through `Step6Review.tsx`
4. Create `ApplicationForm/index.tsx` as the orchestrator
5. Update `src/app/(site)/apply/page.tsx` to import from the new location if path changed
6. Rewrite `src/app/api/apply/route.ts` with the new schema and insert
7. Update contact details
8. Run `npx tsc --noEmit` and fix all errors before finishing
