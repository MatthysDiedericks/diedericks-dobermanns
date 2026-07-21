import * as FileSystem from 'expo-file-system/legacy';

import { requireSupabase } from '@/lib/supabase';

const BUCKET = 'contract-signatures';

/**
 * Uploads a base64 PNG signature (from `SignaturePad`) into the
 * `contract-signatures` bucket under `<clientUserId>/<contractId>/...`, which
 * matches the bucket's RLS (client can only write their own folder).
 */
export async function uploadSignature(
  base64Png: string,
  clientUserId: string,
  contractId: string,
): Promise<string> {
  const supabase = requireSupabase();
  const tmpUri = `${FileSystem.cacheDirectory}signature-${Date.now()}.png`;
  await FileSystem.writeAsStringAsync(tmpUri, base64Png, { encoding: FileSystem.EncodingType.Base64 });

  const response = await fetch(tmpUri);
  const arrayBuffer = await response.arrayBuffer();

  const storagePath = `${clientUserId}/${contractId}/${Date.now()}.png`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: 'image/png', upsert: false });
  if (error) throw new Error(error.message);
  return storagePath;
}

/** Short-lived signed URL for viewing a previously-uploaded signature (e.g. admin thumbnail tap). */
export async function getSignatureSignedUrl(storagePath: string): Promise<string> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
