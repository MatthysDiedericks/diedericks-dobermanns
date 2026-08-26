/** Owner-facing document checklist. Empty slots are stated, never hidden. */

export type PortalDocSlot = { category: string; label: string };

export type PortalDocSection = {
  id: string;
  title: string;
  slots: PortalDocSlot[];
};

export const PORTAL_DOC_SECTIONS: PortalDocSection[] = [
  {
    id: 'puppy',
    title: 'Your puppy',
    slots: [
      { category: 'microchip', label: 'Microchip certificate' },
      { category: 'puppy_birth_certificate', label: 'Birth certificate' },
      { category: 'registration', label: 'Registration' },
      { category: 'transfer_of_ownership', label: 'Transfer of ownership' },
    ],
  },
  {
    id: 'health',
    title: 'Health',
    slots: [
      { category: 'vaccination_record', label: 'Vaccination record' },
      { category: 'health_certificate', label: 'Health certificate' },
      { category: 'hip_elbow_score', label: 'Hip and elbow score' },
      { category: 'dna_test', label: 'DNA' },
      { category: 'eye_test', label: 'Eye' },
      { category: 'heart_test', label: 'Heart' },
    ],
  },
  {
    id: 'breeding',
    title: 'Breeding',
    slots: [{ category: 'pedigree', label: 'Pedigree' }],
  },
  {
    id: 'agreements',
    title: 'Agreements',
    slots: [
      { category: 'purchase_agreement', label: 'Purchase agreement' },
      { category: 'puppy_guarantee', label: 'Puppy guarantee' },
      { category: 'health_warranty', label: 'Health warranty' },
    ],
  },
  {
    id: 'training',
    title: 'Training',
    slots: [
      { category: 'training_certificate', label: 'Training certificate' },
      { category: 'training_report', label: 'Training report' },
      { category: 'psa_certificate', label: 'PSA certificate' },
    ],
  },
  {
    id: 'payments',
    title: 'Payments',
    slots: [{ category: 'proof_of_payment', label: 'Proof of payment' }],
  },
];

const SLOT_CATEGORIES = new Set(PORTAL_DOC_SECTIONS.flatMap((s) => s.slots.map((x) => x.category)));

export function extraDocumentCategories(categories: string[]): string[] {
  const seen = new Set<string>();
  const extra: string[] = [];
  for (const cat of categories) {
    if (!cat || SLOT_CATEGORIES.has(cat) || seen.has(cat)) continue;
    seen.add(cat);
    extra.push(cat);
  }
  return extra;
}
