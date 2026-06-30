export type DocumentEntityType =
  | 'dog'
  | 'litter'
  | 'puppy'
  | 'client'
  | 'application'
  | 'training'
  | 'contract'
  | 'kennel'
  | 'health'
  | 'show';

export type DocumentFileType = 'pdf' | 'jpg' | 'png' | 'docx' | 'xlsx';

export const DOCUMENT_SELECT =
  'id, entity_type, entity_id, document_name, original_filename, storage_path, file_type, category, date_of_document, expiry_date, issued_by, document_number, description, client_visible, allowed_user_ids, is_public, uploaded_by, uploaded_at, file_size_bytes, mime_type';

export const DOG_CATEGORIES = [
  'Pedigree',
  'Registration',
  'Microchip',
  'DNA Test',
  'Health Certificate',
  'Vaccination Record',
  'Hip/Elbow Score',
  'Eye Test',
  'Heart Test',
  'Parent Health Records',
  'Import Permit',
  'Export Permit',
  'Insurance',
  'Show Certificate',
  'Training Certificate',
  'Other',
] as const;

export const LITTER_CATEGORIES = [
  'Litter Registration',
  'Stud Agreement',
  'Whelping Record',
  'Puppy Birth Certificate',
  'Other',
] as const;

export const CLIENT_CATEGORIES = [
  'Purchase Agreement',
  'Puppy Guarantee',
  'Health Warranty',
  'Transfer of Ownership',
  'Parent Health Records',
  'NDA',
  'Other',
] as const;

export const APPLICATION_CATEGORIES = [
  'Application Supporting Doc',
  'Vet Reference',
  'ID Document',
  'Other',
] as const;

export const TRAINING_CATEGORIES = [
  'Training Report',
  'Completion Certificate',
  'PSA Certificate',
  'Other',
] as const;

export const KENNEL_CATEGORIES = [
  'Kennel Licence',
  'Breed Society Registration',
  'Vet Practice Agreement',
  'Other',
] as const;

export function categoriesForEntity(entityType: DocumentEntityType): readonly string[] {
  switch (entityType) {
    case 'dog':
    case 'puppy':
      return DOG_CATEGORIES;
    case 'litter':
      return LITTER_CATEGORIES;
    case 'client':
      return CLIENT_CATEGORIES;
    case 'application':
      return APPLICATION_CATEGORIES;
    case 'training':
      return TRAINING_CATEGORIES;
    case 'kennel':
      return KENNEL_CATEGORIES;
    default:
      return ['Other'];
  }
}

export function fileTypeFromName(filename: string): DocumentFileType {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'jpg';
  if (ext === 'png') return 'png';
  if (ext === 'docx') return 'docx';
  if (ext === 'xlsx') return 'xlsx';
  return 'pdf';
}

export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

/** Sentinel UUID for kennel-wide documents on the master screen */
export const KENNEL_DOCUMENT_ENTITY_ID = '00000000-0000-0000-0000-000000000001';
