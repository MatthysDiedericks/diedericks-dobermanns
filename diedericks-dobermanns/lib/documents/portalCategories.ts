/**
 * Maps portal display sections to the category keys stored on documents.
 * Admin uploads write these keys when setting client_visible = true.
 */

export interface PortalCategoryGroup {
  id: string;
  label: string;
  icon: string;
  categories: string[];
  description: string;
}

export const PORTAL_CATEGORY_GROUPS: PortalCategoryGroup[] = [
  {
    id: 'health',
    label: 'Health Records',
    icon: 'heart-circle-outline',
    description: 'Vaccinations, health certificates, and vet records',
    categories: [
      'health_certificate',
      'vaccination_record',
      'hip_elbow_score',
      'eye_test',
      'heart_test',
    ],
  },
  {
    id: 'pedigree',
    label: 'Pedigree & Registration',
    icon: 'git-network-outline',
    description: 'Pedigree certificates, registration papers, and DNA tests',
    categories: ['pedigree', 'registration', 'dna_test', 'microchip'],
  },
  {
    id: 'parents',
    label: "Parents' Health",
    icon: 'people-outline',
    description: 'Health clearances and test results for sire and dam',
    categories: ['parent_health_records'],
  },
  {
    id: 'legal',
    label: 'Contracts & Legal',
    icon: 'document-text-outline',
    description: 'Purchase agreements, guarantees, and ownership transfers',
    categories: [
      'purchase_agreement',
      'puppy_guarantee',
      'health_warranty',
      'transfer_of_ownership',
      'nda',
    ],
  },
  {
    id: 'training',
    label: 'Training',
    icon: 'ribbon-outline',
    description: 'Training reports, certificates, and assessments',
    categories: [
      'training_report',
      'completion_certificate',
      'psa_certificate',
      'training_certificate',
    ],
  },
  {
    id: 'show',
    label: 'Show & Sport',
    icon: 'trophy-outline',
    description: 'Show certificates and sport achievements',
    categories: ['show_certificate'],
  },
];

export function buildCategoryGroupMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const group of PORTAL_CATEGORY_GROUPS) {
    for (const cat of group.categories) {
      map[cat] = group.id;
    }
  }
  return map;
}
