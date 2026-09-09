import { getSignedUrl, type StorageBucket } from '@/lib/storage';

export type ReceiptBucket = 'receipts' | 'documents';

export type ReceiptObjectRef = {
  bucket: ReceiptBucket;
  path: string;
};

export type ReceiptRef = ReceiptObjectRef | { href: string };

const MARKERS: Array<{ needle: string; bucket: ReceiptBucket }> = [
  { needle: '/object/public/receipts/', bucket: 'receipts' },
  { needle: '/object/sign/receipts/', bucket: 'receipts' },
  { needle: '/object/authenticated/receipts/', bucket: 'receipts' },
  { needle: '/object/public/documents/', bucket: 'documents' },
  { needle: '/object/sign/documents/', bucket: 'documents' },
  { needle: '/object/authenticated/documents/', bucket: 'documents' },
];

function decodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/** Path or legacy public/signed URL from expenses.receipt_url. */
export function parseReceiptRef(raw: string | null | undefined): ReceiptRef | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  for (const { needle, bucket } of MARKERS) {
    const idx = value.indexOf(needle);
    if (idx === -1) continue;
    const path = decodePath(value.slice(idx + needle.length).split('?')[0] ?? '');
    if (!path) return null;
    return { bucket, path };
  }

  if (/^https?:\/\//i.test(value)) return { href: value };

  // New web/app uploads live under expenses/ in the receipts bucket.
  // Older app uploads used {userId}/expenses/... in documents.
  if (value.startsWith('expenses/')) return { bucket: 'receipts', path: value };
  return { bucket: 'documents', path: value };
}

export const RECEIPT_SIGNED_TTL_SECONDS = 300;

export async function resolveReceiptViewUrl(raw: string | null | undefined): Promise<string | null> {
  const ref = parseReceiptRef(raw);
  if (!ref) return null;
  if ('href' in ref) return ref.href;
  return getSignedUrl(ref.bucket as StorageBucket, ref.path, RECEIPT_SIGNED_TTL_SECONDS);
}
