import type { DocumentEntityType, DocumentFileType } from '@/lib/documents/constants';

export interface DocumentRecord {
  id: string;
  entity_type: DocumentEntityType;
  entity_id: string;
  document_name: string;
  original_filename: string;
  storage_path: string;
  file_type: DocumentFileType;
  category: string;
  date_of_document: string | null;
  expiry_date: string | null;
  issued_by: string | null;
  document_number: string | null;
  description: string | null;
  client_visible: boolean;
  allowed_user_ids: string[] | null;
  is_public: boolean;
  uploaded_by: string | null;
  uploaded_at: string;
  file_size_bytes: number | null;
  mime_type: string | null;
}

export interface DocumentUploadMetadata {
  entityType: DocumentEntityType;
  entityId: string;
  name: string;
  category: string;
  dateOfDocument?: string | null;
  expiryDate?: string | null;
  documentNumber?: string | null;
  issuedBy?: string | null;
  description?: string | null;
  clientVisible?: boolean;
  isPublic?: boolean;
  allowedUserIds?: string[];
}

export interface PickedDocumentFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
}
