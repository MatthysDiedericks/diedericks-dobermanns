import * as DocumentPicker from 'expo-document-picker';

import { uploadFile } from '@/lib/storage';
import { ACCEPT_DOCUMENT_MIME } from '@/lib/uploads/constants';

export interface ReceiptUploadResult {
  /** Storage path inside the private receipts bucket. */
  path: string;
  fileName: string;
}

/** Picks a PDF/image receipt and uploads to the private receipts bucket. */
export async function pickAndUploadReceipt(): Promise<ReceiptUploadResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [...ACCEPT_DOCUMENT_MIME],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const file = result.assets[0];
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf';
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const path = `expenses/${year}/${month}/receipt.${ext === 'pdf' ? 'pdf' : 'jpg'}`;

  const upload = await uploadFile({
    bucket: 'receipts',
    path,
    uri: file.uri,
    fileName: file.name,
    contentType: file.mimeType ?? (ext === 'pdf' ? 'application/pdf' : 'image/jpeg'),
    sizeBytes: file.size,
  });
  if (upload.error || !upload.path) {
    throw new Error(upload.error ?? 'Receipt upload failed.');
  }

  return { path: upload.path, fileName: file.name };
}
