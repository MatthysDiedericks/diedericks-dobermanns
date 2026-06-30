import * as DocumentPicker from 'expo-document-picker';

import { uploadFile } from '@/lib/storage';
import { requireSupabase } from '@/lib/supabase';

function newFileId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface ReceiptUploadResult {
  /** Storage path inside the documents bucket (prefix with user id for RLS). */
  path: string;
  fileName: string;
}

/** Picks a PDF/image receipt and uploads to the private documents bucket. */
export async function pickAndUploadReceipt(userId: string): Promise<ReceiptUploadResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/jpeg', 'image/png'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const file = result.assets[0];
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf';
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const path = `${userId}/expenses/${year}/${month}/${newFileId()}.${ext}`;

  const upload = await uploadFile({
    bucket: 'documents',
    path,
    uri: file.uri,
    contentType: file.mimeType ?? (ext === 'pdf' ? 'application/pdf' : 'image/jpeg'),
    sizeBytes: file.size,
  });
  if (upload.error || !upload.path) {
    throw new Error(upload.error ?? 'Receipt upload failed.');
  }

  requireSupabase();
  return { path: upload.path, fileName: file.name };
}
