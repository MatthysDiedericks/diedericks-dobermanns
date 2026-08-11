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
};

export function portalCategoryLabel(category: string | null | undefined): string {
  if (!category) return 'Document';
  return (
    PORTAL_CATEGORY_LABELS[category] ??
    category.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
