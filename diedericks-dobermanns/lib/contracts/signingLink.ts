import { Config } from '@/constants/config';

export const ESIGN_TTL_DAYS = 30;

export function signingUrl(token: string): string {
  return `${Config.app.webBaseUrl.replace(/\/$/, '')}/sign/${token}`;
}

export function formatEsignExpiry(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function contractWhatsAppUrl(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  let d = phone.replace(/[^\d]/g, '');
  if (!d) return null;
  if (d.startsWith('0') && d.length === 10) d = `27${d.slice(1)}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(message)}`;
}

export function contractStatusChip(args: {
  status: string | null;
  signedByClient: boolean;
  clientSignedAt?: string | null;
  esignSentAt?: string | null;
}): { label: string; tone: 'success' | 'gold' | 'muted' | 'danger' } {
  if (args.signedByClient || args.status === 'signed_client' || args.status === 'signed_both') {
    return { label: 'Signed', tone: 'success' };
  }
  if (args.status === 'void') return { label: 'Void', tone: 'danger' };
  if (args.status === 'sent' || args.status === 'viewed') return { label: 'Sent', tone: 'gold' };
  if (args.status === 'draft') return { label: 'Draft', tone: 'muted' };
  return { label: args.status ?? 'Not created', tone: 'muted' };
}
