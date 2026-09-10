import { ACCEPT_DOCUMENT_MIME, MAX_UPLOAD_BYTES } from '@/lib/uploads/constants';

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
  | 'show'
  | 'invoice'
  | 'payment'
  | 'employee';

export type DocumentFileType = 'pdf' | 'jpg' | 'png' | 'docx' | 'xlsx';

export const DOCUMENT_SELECT =
  'id, entity_type, entity_id, document_name, original_filename, storage_path, file_type, category, date_of_document, expiry_date, issued_by, document_number, description, client_visible, allowed_user_ids, is_public, uploaded_by, uploaded_at, file_size_bytes, mime_type, provided_by, review_status, review_note';

export function fileTypeFromName(filename: string): DocumentFileType {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'png') return 'png';
  return 'jpg';
}

/** One shared list — do not invent a local accept list in uploaders. */
export const ACCEPTED_MIME_TYPES: readonly string[] = [...ACCEPT_DOCUMENT_MIME];

export const MAX_DOCUMENT_BYTES = MAX_UPLOAD_BYTES;

/** Sentinel UUID for kennel-wide documents (`documents.entity_type = 'kennel'`). */
export const KENNEL_DOCUMENT_ENTITY_ID = '00000000-0000-0000-0000-000000000001';
