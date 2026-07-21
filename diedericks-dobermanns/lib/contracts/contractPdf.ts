import * as Print from 'expo-print';

import { requireSupabase } from '@/lib/supabase';
import type { TablesInsert } from '@/types/database.types';

const BUCKET = 'documents';
/** 1 year — long enough that a signed contract link never expires mid-review,
 * short enough to rotate if this bucket's access model ever changes. Callers
 * that need a fresh link can always re-derive one from the stored `documents`
 * row via `useGetSignedUrl`. */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365;

/**
 * Renders `html` to a PDF on-device (via `expo-print`, matching the pattern
 * already used for finance/growth-chart PDF export), then uploads it into the
 * existing `documents` storage bucket under `entity_type: 'contract'` so it
 * shows up alongside every other document for this contract, and returns a
 * long-lived signed URL to store on `contracts.document_url`.
 */
export async function generateAndUploadContractPdf(
  html: string,
  contractId: string,
  uploadedBy: string | null,
): Promise<string> {
  const supabase = requireSupabase();
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  const timestamp = Date.now();
  const storagePath = `contract/${contractId}/${timestamp}_contract.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: 'application/pdf', upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const documentPayload: TablesInsert<'documents'> = {
    entity_type: 'contract',
    entity_id: contractId,
    document_name: 'Signed contract',
    original_filename: 'contract.pdf',
    storage_path: storagePath,
    file_type: 'pdf',
    file_size_bytes: arrayBuffer.byteLength,
    mime_type: 'application/pdf',
    category: 'Other',
    client_visible: true,
    is_public: false,
    uploaded_by: uploadedBy,
  } as TablesInsert<'documents'>;
  const { error: docError } = await supabase.from('documents').insert(documentPayload);
  if (docError) throw new Error(docError.message);

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (signError) throw new Error(signError.message);
  return signed.signedUrl;
}
