import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { formatDelta } from '@/lib/finance/formatters';

interface FinanceKpiCardProps {
  label: string;
  value: string;
  delta: number | null;
  subtext: string;
  valueClass?: string;
}

export function FinanceKpiCard({ label, value, delta, subtext, valueClass }: FinanceKpiCardProps) {
  const up = delta != null && delta >= 0;
  return (
    <Card className="min-w-[160px] mr-3">
      <Typography variant="caption">{label}</Typography>
      <Typography variant="displayLg" className={`mt-1 ${valueClass ?? 'text-gold'}`}>
        {value}
      </Typography>
      {delta != null ? (
        <Typography variant="caption" className={up ? 'text-success' : 'text-danger'}>
          {formatDelta(delta)} vs last year
        </Typography>
      ) : null}
      <Typography variant="caption" className="mt-1 text-subtle">
        {subtext}
      </Typography>
    </Card>
  );
}
