import type { Control } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { ControlledAgreement } from '@/components/forms/ApplicationForm/AgreementBox';
import { Typography } from '@/components/ui/Typography';
import type { ApplicationFormValues } from '@/components/forms/ApplicationForm/schema';

interface StepProps {
  control: Control<ApplicationFormValues>;
}

export function Step5Legal({ control }: StepProps) {
  const router = useRouter();

  return (
    <View>
      <View className="mb-6 rounded-xl border border-gold/40 bg-gold/5 p-4">
        <Typography variant="label" className="text-gold">
          PLEASE READ AND TICK EACH CLAUSE INDIVIDUALLY
        </Typography>
        <Typography variant="bodyMuted" className="mt-2 leading-6">
          All six clauses are mandatory. You cannot submit your application until every condition
          has been individually acknowledged. These terms exist to protect the welfare of every
          dog we produce.
        </Typography>
      </View>

      <ControlledAgreement
        control={control}
        name="agreed_no_breeding_rights"
        title="No Breeding Rights"
        description="I understand and agree that this dog is sold WITHOUT breeding rights. I may not breed from this animal, register offspring from it, or use it for stud or whelping purposes without prior written consent from Diedericks Dobermanns. Unauthorised breeding will result in the immediate recall of the dog at the buyer's expense."
      />
      <ControlledAgreement
        control={control}
        name="agreed_right_of_recall"
        title="Right of Recall"
        description="I understand that Diedericks Dobermanns holds the unconditional right to recall and repossess this dog at any time if, in their sole judgement, the animal is subject to neglect, abuse, inadequate care, or unsuitable living conditions. I agree to permit welfare inspections when requested and to cooperate fully with any recall process."
      />
      <ControlledAgreement
        control={control}
        name="agreed_no_resale"
        title="No Resale Without Consent"
        description="I agree not to sell, transfer, give away, or rehome this dog to any third party without first obtaining written consent from Diedericks Dobermanns. In the event that I am unable to continue caring for this dog, I agree to return it to Diedericks Dobermanns as the priority option, with no financial expectation from either party."
      />
      <ControlledAgreement
        control={control}
        name="agreed_welfare_commitment"
        title="Lifetime Welfare Commitment"
        description="I commit to providing this dog with appropriate and regular veterinary care, high-quality nutrition, daily exercise, socialisation, mental stimulation, and a safe, enriched living environment for the full duration of its life. I understand that Dobermanns are active, intelligent, working breed dogs that require significant daily engagement and human companionship."
      />
      <ControlledAgreement
        control={control}
        name="agreed_microchip_policy"
        title="Microchip & Registration Policy"
        description="I acknowledge that all dogs from Diedericks Dobermanns are microchipped and remain on the kennel's registry. Transfer of registration requires written authorisation from Diedericks Dobermanns. I agree not to alter, remove, or obscure the microchip and to update my contact details with the relevant national registry in the event of a change of address."
      />
      <ControlledAgreement
        control={control}
        name="agreed_to_terms"
        title="Full Terms & Conditions of Sale"
        description="I confirm that I have read, understood, and agree to the full Terms & Conditions of Sale of Diedericks Dobermanns, including all policies relating to deposits, health guarantees, puppy selection, delivery, and post-sale obligations."
      />

      <Pressable onPress={() => router.push('/terms-of-sale')} className="mt-2">
        <Typography variant="caption" className="text-gold underline">
          Read the full Terms & Conditions of Sale →
        </Typography>
      </Pressable>
      <Pressable onPress={() => router.push('/privacy')} className="mt-1">
        <Typography variant="caption" className="text-gold underline">
          Read our Privacy Policy →
        </Typography>
      </Pressable>
    </View>
  );
}
