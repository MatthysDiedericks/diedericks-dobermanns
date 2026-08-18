import * as DocumentPicker from 'expo-document-picker';

import {
  MAX_APPLICATION_FILES,
  MAX_UPLOAD_BYTES,
  TOO_MANY_FILES_MESSAGE,
} from '@/lib/uploads/constants';
import { prepareUpload, UploadValidationError } from '@/lib/uploads/prepare';
import { ERROR_CODES } from '@/lib/errors/codes';
import { logSecurity } from '@/lib/security/logSecurity';

export interface PickedApplicationFile {
  uri: string;
  name: string;
  size: number;
}

const SITE =
  process.env.EXPO_PUBLIC_SITE_URL ?? 'https://diedericksdobermanns.com';

export async function pickApplicationFiles(
  current: PickedApplicationFile[],
): Promise<{ files: PickedApplicationFile[]; error: string | null }> {
  const remaining = MAX_APPLICATION_FILES - current.length;
  if (remaining <= 0) return { files: current, error: TOO_MANY_FILES_MESSAGE };
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return { files: current, error: null };
  const next = [...current];
  for (const asset of result.assets) {
    if (next.length >= MAX_APPLICATION_FILES) {
      return { files: next, error: TOO_MANY_FILES_MESSAGE };
    }
    if ((asset.size ?? 0) > MAX_UPLOAD_BYTES) {
      return {
        files: next,
        error: 'That file is over 10 MB — please send a smaller copy, or WhatsApp us.',
      };
    }
    const response = await fetch(asset.uri);
    const bytes = new Uint8Array(await response.arrayBuffer());
    try {
      prepareUpload(bytes, 'applications/preflight');
    } catch (e) {
      logSecurity({
        code: ERROR_CODES.SECURITY_UPLOAD_REJECTED,
        message: e instanceof UploadValidationError ? e.message : 'That file could not be accepted.',
        route: '/apply',
        actorRole: 'anon',
      });
      return {
        files: next,
        error: e instanceof UploadValidationError ? e.message : 'That file could not be accepted.',
      };
    }
    next.push({ uri: asset.uri, name: asset.name, size: asset.size ?? bytes.byteLength });
  }
  return { files: next, error: null };
}

export async function postApplicationFiles(input: {
  applicationId: string;
  email: string;
  files: PickedApplicationFile[];
}): Promise<{ error: string | null; paths: string[] }> {
  if (!input.files.length) return { error: null, paths: [] };
  const form = new FormData();
  form.append('applicationId', input.applicationId);
  form.append('email', input.email);
  for (const file of input.files) {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    form.append('files', blob as never, file.name);
  }
  const res = await fetch(`${SITE.replace(/\/$/, '')}/api/apply/files`, {
    method: 'POST',
    body: form,
  });
  const data = (await res.json().catch(() => null)) as
    | { error?: string; paths?: string[] }
    | null;
  if (!res.ok) return { error: data?.error ?? 'Could not upload those files.', paths: [] };
  return { error: null, paths: data?.paths ?? [] };
}
