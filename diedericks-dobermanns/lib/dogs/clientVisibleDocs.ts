/**
 * Categories that may cross to a client once the dog is shared.
 * Private, client-scoped, and "other" paperwork stay admin-only.
 */
export const CLIENT_VISIBLE_DOC_CATEGORIES = [
  'dna_test',
  'hip_elbow_score',
  'pedigree',
  'registration',
  'vaccination_record',
  'rabies_titre',
  'health_certificate',
  'microchip',
  'DNA Test',
  'Hip/Elbow Score',
  'Pedigree',
  'Registration',
  'Vaccination Record',
  'Health Certificate',
  'Microchip',
] as const;

export function isClientVisibleCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  return (CLIENT_VISIBLE_DOC_CATEGORIES as readonly string[]).includes(category);
}
