import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { Config } from '@/constants/config';
import { packQueryString, type PackChoice } from '@/lib/handover/sections';
import { requireSupabase } from '@/lib/supabase';

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await requireSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not signed in');
  return { Authorization: `Bearer ${token}` };
}

export async function fetchHandoverPackFile(
  dogId: string,
  choice?: PackChoice,
): Promise<{ uri: string; filename: string }> {
  const res = await fetch(
    `${Config.app.webBaseUrl}/api/puppies/${dogId}/handover-pack${choice ? packQueryString(choice) : ''}`,
    { headers: await authHeaders() },
  );
  if (res.status === 404) {
    throw new Error('This pack is not available yet. It appears after go-home.');
  }
  if (!res.ok) throw new Error('Could not generate the handover pack.');

  const filename =
    res.headers.get('X-Handover-Filename')?.trim() ||
    filenameFromDisposition(res.headers.get('Content-Disposition')) ||
    'handover.pdf';
  const bytes = await res.arrayBuffer();
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) throw new Error('No place to save the PDF on this device.');
  const uri = `${dir}${filename}`;
  await FileSystem.writeAsStringAsync(uri, arrayBufferToBase64(bytes), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { uri, filename };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const m = header.match(/filename="([^"]+)"/);
  return m?.[1] ?? null;
}

export async function shareHandoverPack(dogId: string, choice?: PackChoice): Promise<void> {
  const { uri, filename } = await fetchHandoverPackFile(dogId, choice);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: filename,
      UTI: 'com.adobe.pdf',
    });
    return;
  }
  await Print.printAsync({ uri });
}

export async function printHandoverPack(dogId: string, choice?: PackChoice): Promise<void> {
  const { uri } = await fetchHandoverPackFile(dogId, choice);
  await Print.printAsync({ uri });
}

export type HandoverOutline = {
  buyerName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  contactId: string | null;
  portalUrl: string;
  missing: string[];
  items: {
    id: string;
    label: string;
    pages: number;
    bytes: number;
    locked?: boolean;
    children?: { id: string; label: string; pages: number; bytes: number }[];
  }[];
};

export async function fetchHandoverOutline(dogId: string): Promise<HandoverOutline> {
  const res = await fetch(`${Config.app.webBaseUrl}/api/puppies/${dogId}/handover-pack/outline`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Could not load pack outline.');
  return (await res.json()) as HandoverOutline;
}

export async function sendHandoverPack(input: {
  dogId: string;
  packQuery: string;
  subject: string;
  message: string;
}): Promise<{ error?: string; to?: string }> {
  const res = await fetch(`${Config.app.webBaseUrl}/api/puppies/${input.dogId}/handover-pack/send`, {
    method: 'POST',
    headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pack: input.packQuery || undefined,
      subject: input.subject,
      message: input.message,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; to?: string };
  if (!res.ok) return { error: data.error || `Send failed (${res.status})` };
  return { to: data.to };
}
