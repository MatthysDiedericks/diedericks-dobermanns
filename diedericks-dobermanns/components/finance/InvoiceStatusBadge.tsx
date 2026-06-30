import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { humanizeStatus } from '@/lib/finance/formatters';
import type { InvoiceStatus } from '@/types/finance';

const TONE: Record<InvoiceStatus, BadgeTone> = {
  draft: 'muted',
  sent: 'neutral',
  partially_paid: 'gold',
  paid: 'success',
  overdue: 'danger',
  void: 'muted',
  cancelled: 'muted',
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  const key = status as InvoiceStatus;
  return <Badge label={humanizeStatus(status)} tone={TONE[key] ?? 'neutral'} />;
}
