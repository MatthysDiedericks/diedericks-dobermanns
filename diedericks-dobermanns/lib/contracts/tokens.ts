import type { CompanyProfile } from '@/lib/contracts/companySettings';
import type { ContractTokenMap } from '@/lib/contracts/merge';
import { formatAmount, formatDate } from '@/lib/finance/formatters';

export type ContractPartyDog = {
  name: string;
  sex: string | null;
  colour: string | null;
  date_of_birth: string | null;
  microchip_number: string | null;
  registration_number: string | null;
  programme_tier: string | null;
  litter_id: string | null;
  fatherName: string | null;
  motherName: string | null;
  litterName: string | null;
};

export type ContractBuyer = {
  full_name: string;
  email: string | null;
  phone: string | null;
  id_number: string | null;
  address: string | null;
};

const TIER_LABELS: Record<string, string> = {
  puppy: 'Standard Puppy',
  elite_developed: 'Elite Developed Puppy',
  protection_dog: 'Elite Family Protection Dog',
};

/** Builds the token map used when snapshotting an agreement at payment confirm. */
export function buildSaleContractTokens(input: {
  company: CompanyProfile;
  buyer: ContractBuyer;
  dog: ContractPartyDog;
  quoteNumber: string;
  invoiceNumber: string;
  purchasePrice: number | null;
  amountPaid: number | null;
  paymentDate: string;
  breedingPenalty: string;
  templateVersion: number | string;
  contractNumber?: string;
  contractReference?: string;
}): ContractTokenMap {
  const tier = input.dog.programme_tier;
  return {
    contract_number: input.contractNumber ?? '{{contract_number}}',
    contract_reference: input.contractReference ?? input.contractNumber ?? '{{contract_reference}}',
    quote_number: input.quoteNumber,
    invoice_number: input.invoiceNumber,
    breeder_email: input.company.email ?? input.company.contactEmail ?? '',
    breeder_phone: input.company.phone ?? '',
    buyer_full_name: input.buyer.full_name,
    buyer_id_number: input.buyer.id_number ?? '',
    buyer_address: input.buyer.address ?? '',
    buyer_email: input.buyer.email ?? '',
    buyer_phone: input.buyer.phone ?? '',
    dog_name: input.dog.name,
    dog_sex: input.dog.sex ?? '',
    dog_colour: input.dog.colour ?? '',
    dog_dob: formatDate(input.dog.date_of_birth),
    dog_microchip: input.dog.microchip_number ?? '',
    dog_registration: input.dog.registration_number ?? '',
    sire_name: input.dog.fatherName ?? '',
    dam_name: input.dog.motherName ?? '',
    litter_name: input.dog.litterName ?? '',
    purchase_price: formatAmount(input.purchasePrice),
    amount_paid: formatAmount(input.amountPaid),
    payment_date: formatDate(input.paymentDate),
    programme_tier: tier ? (TIER_LABELS[tier] ?? tier) : '',
    breeding_penalty: input.breedingPenalty,
    template_version: String(input.templateVersion),
    generated_at: formatDate(new Date().toISOString()),
    breeder_signature: 'Matthys Diedericks',
    buyer_signature: 'Pending electronic acceptance',
    breeder_signed_at: formatDate(new Date().toISOString()),
    buyer_signed_at: 'Pending',
    obedience_summary: "As recorded in the Buyer's client portal.",
    home_obedience_summary: "As recorded in the Buyer's client portal.",
    protection_prework_summary: 'Foundation and pre-work only, as recorded in the portal.',
    environmental_summary: "As recorded in the Buyer's client portal.",
    socialisation_summary: "As recorded in the Buyer's client portal.",
  };
}
