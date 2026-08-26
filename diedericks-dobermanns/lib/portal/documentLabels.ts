/** Plain-English labels for document categories shown to owners. */
export const PORTAL_CATEGORY_LABELS: Record<string, string> = {
  dna_test: 'DNA health panel',
  hip_elbow_score: 'Hip and elbow score',
  pedigree: 'Pedigree certificate',
  registration: 'Registration papers',
  vaccination_record: 'Vaccination card',
  rabies_titre: 'Rabies titre',
  health_certificate: 'Health certificate',
  microchip: 'Microchip certificate',
  export_permit: 'Export papers',
  other: 'Other document',
  proof_of_payment: 'Proof of payment',
  puppy_birth_certificate: 'Birth certificate',
  transfer_of_ownership: 'Transfer of ownership',
  purchase_agreement: 'Purchase agreement',
  puppy_guarantee: 'Puppy guarantee',
  health_warranty: 'Health warranty',
  training_certificate: 'Training certificate',
  training_report: 'Training report',
  psa_certificate: 'PSA certificate',
  eye_test: 'Eye test',
  heart_test: 'Heart test',
};

export function portalCategoryLabel(category: string | null | undefined): string {
  if (!category) return 'Document';
  return (
    PORTAL_CATEGORY_LABELS[category] ??
    category.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
