import { Badge, type BadgeTone } from '@/components/ui/Badge';

const STATUS_TONE: Record<string, BadgeTone> = {
  pending: 'muted',
  confirmed: 'gold',
  completed: 'success',
  cancelled: 'danger',
  active: 'gold',
  sent: 'success',
  scheduled: 'neutral',
  draft: 'muted',
};

interface Props {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: Props) {
  const tone = STATUS_TONE[status] ?? 'neutral';
  const label = status.replace(/_/g, ' ');
  return <Badge label={label} tone={tone} className={className} />;
}
