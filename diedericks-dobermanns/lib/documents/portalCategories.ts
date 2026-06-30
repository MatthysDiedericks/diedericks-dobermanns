/**
 * Maps portal display sections to the category strings used in the documents table.
 * Admin uploads use these category strings when setting client_visible=true.
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
      'Health Certificate',
      'Vaccination Record',
      'Hip/Elbow Score',
      'Eye Test',
      'Heart Test',
    ],
  },
  {
    id: 'pedigree',
    label: 'Pedigree & Registration',
    icon: 'git-network-outline',
    description: 'Pedigree certificates, registration papers, and DNA tests',
    categories: ['Pedigree', 'Registration', 'DNA Test', 'Microchip'],
  },
  {
    id: 'parents',
    label: "Parents' Health",
    icon: 'people-outline',
    description: 'Health clearances and test results for sire and dam',
    categories: ['Parent Health Records'],
  },
  {
    id: 'legal',
    label: 'Contracts & Legal',
    icon: 'document-text-outline',
    description: 'Purchase agreements, guarantees, and ownership transfers',
    categories: [
      'Purchase Agreement',
      'Puppy Guarantee',
      'Health Warranty',
      'Transfer of Ownership',
      'NDA',
    ],
  },
  {
    id: 'training',
    label: 'Training',
    icon: 'ribbon-outline',
    description: 'Training reports, certificates, and assessments',
    categories: [
      'Training Report',
      'Completion Certificate',
      'PSA Certificate',
      'Training Certificate',
    ],
  },
  {
    id: 'show',
    label: 'Show & Sport',
    icon: 'trophy-outline',
    description: 'Show certificates and sport achievements',
    categories: ['Show Certificate'],
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
