import { AgreementBox } from "./AgreementBox";
import type { StepProps } from "./FormFields";

export function Step5Legal({ register, errors }: StepProps) {
  return (
    <div>
      <div className="mb-6 rounded-sm border border-gold/30 bg-gold/5 p-4">
        <p className="font-cinzel text-sm text-gold">PLEASE READ AND TICK EACH CLAUSE</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          All six clauses are mandatory. You cannot submit until every condition has been
          individually acknowledged.
        </p>
      </div>

      <AgreementBox
        heading="No Breeding Rights"
        text="I understand and agree that this dog is sold WITHOUT breeding rights. Unauthorised breeding may result in immediate recall at the buyer's expense."
        register={register}
        name="agreed_no_breeding_rights"
        error={errors.agreed_no_breeding_rights}
      />
      <AgreementBox
        heading="Right of Recall"
        text="I understand that Diedericks Dobermanns holds the right to recall this dog if neglect, abuse, or unsuitable conditions are identified."
        register={register}
        name="agreed_right_of_recall"
        error={errors.agreed_right_of_recall}
      />
      <AgreementBox
        heading="No Resale Without Consent"
        text="I agree not to sell, transfer, or rehome this dog without written consent from Diedericks Dobermanns."
        register={register}
        name="agreed_no_resale"
        error={errors.agreed_no_resale}
      />
      <AgreementBox
        heading="Lifetime Welfare Commitment"
        text="I commit to appropriate veterinary care, nutrition, exercise, and enrichment for the full life of this dog."
        register={register}
        name="agreed_welfare_commitment"
        error={errors.agreed_welfare_commitment}
      />
      <AgreementBox
        heading="Microchip & Registration Policy"
        text="I acknowledge microchip registration requirements and agree not to alter or remove the microchip."
        register={register}
        name="agreed_microchip_policy"
        error={errors.agreed_microchip_policy}
      />
      <AgreementBox
        heading="Full Terms & Conditions of Sale"
        text="I confirm that I have read, understood, and agree to the full Terms & Conditions of Sale."
        register={register}
        name="agreed_to_terms"
        error={errors.agreed_to_terms}
        link={{ href: "/terms-of-sale", label: "Read full Terms of Sale →" }}
      />
      <p className="mt-2 text-xs text-muted">
        <a href="/privacy-policy" className="text-gold underline">
          Privacy Policy
        </a>
      </p>
    </div>
  );
}
