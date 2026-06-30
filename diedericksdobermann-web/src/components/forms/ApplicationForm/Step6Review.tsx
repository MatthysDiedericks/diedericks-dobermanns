import type { UseFormGetValues } from "react-hook-form";

import { ReviewRow, ReviewSection } from "./FormFields";
import { labelFor } from "./labels";
import type { ApplicationFormValues } from "./schema";

export function Step6Review({
  getValues,
}: {
  getValues: UseFormGetValues<ApplicationFormValues>;
}) {
  const v = getValues();

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Please review your details before submitting. All information must be accurate.
      </p>

      <ReviewSection title="Personal Details">
        <ReviewRow label="Name" value={v.full_name} />
        <ReviewRow label="Date of birth" value={v.date_of_birth} />
        <ReviewRow label="ID / Passport" value={v.id_number} />
        <ReviewRow label="Email" value={v.email} />
        <ReviewRow label="Phone" value={v.phone} />
        <ReviewRow label="Occupation" value={v.occupation} />
        <ReviewRow label="Address" value={v.address} />
      </ReviewSection>

      <ReviewSection title="Home & Lifestyle">
        <ReviewRow label="Home type" value={labelFor("home_type", v.home_type)} />
        <ReviewRow label="Secure yard" value={labelFor("has_secure_yard", v.has_secure_yard)} />
        <ReviewRow label="Yard size" value={labelFor("yard_size", v.yard_size)} />
        <ReviewRow
          label="Sleeping"
          value={labelFor("sleeping_arrangement", v.sleeping_arrangement)}
        />
        <ReviewRow
          label="Hours alone"
          value={labelFor("hours_alone_per_day", v.hours_alone_per_day)}
        />
      </ReviewSection>

      <ReviewSection title="Experience">
        <ReviewRow label="Why Dobermann" value={v.why_dobermann} />
        <ReviewRow
          label="Experience"
          value={labelFor("dobermann_experience_level", v.dobermann_experience_level)}
        />
        <ReviewRow label="DCM awareness" value={labelFor("aware_of_dcm", v.aware_of_dcm)} />
      </ReviewSection>

      <ReviewSection title="Dog Preference">
        <ReviewRow label="Interest" value={labelFor("dog_interest", v.dog_interest)} />
        <ReviewRow label="Purpose" value={labelFor("purpose", v.purpose)} />
        <ReviewRow label="Sex" value={labelFor("preferred_sex", v.preferred_sex)} />
        <ReviewRow label="Colour" value={labelFor("preferred_colour", v.preferred_colour)} />
        <ReviewRow label="Tail" value={labelFor("tail_preference", v.tail_preference)} />
        <ReviewRow
          label="Timeline"
          value={labelFor("preferred_timeline", v.preferred_timeline)}
        />
        <ReviewRow label="Budget" value={labelFor("budget_range", v.budget_range)} />
      </ReviewSection>

      <ReviewSection title="Legal Agreements">
        <ReviewRow
          label="All agreements"
          value={
            v.agreed_no_breeding_rights &&
            v.agreed_right_of_recall &&
            v.agreed_no_resale &&
            v.agreed_welfare_commitment &&
            v.agreed_microchip_policy &&
            v.agreed_to_terms &&
            v.delivery_acknowledged
              ? "✓ All agreed"
              : "Incomplete"
          }
        />
      </ReviewSection>
    </div>
  );
}
