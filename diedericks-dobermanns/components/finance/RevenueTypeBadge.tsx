import { Badge } from '@/components/ui/Badge';
import { REVENUE_TYPE_LABELS, parseRevenueType } from '@/lib/finance/quoteTypes';

export function RevenueTypeBadge({ type }: { type?: string | null }) {
  const parsed = parseRevenueType(type);
  const tone = parsed === 'dog_sale' ? 'gold' : parsed === 'other' || parsed === 'stud_fee' ? 'muted' : 'success';
  return <Badge label={REVENUE_TYPE_LABELS[parsed]} tone={tone} />;
}
