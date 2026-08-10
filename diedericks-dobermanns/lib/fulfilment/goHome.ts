import { addDays } from '@/lib/heats/calculations';
import { formatKennelDate } from '@/lib/kennel/formatters';

export type GoHomeSource = {
  go_home_date?: string | null;
  go_home_earliest?: string | null;
  go_home_latest?: string | null;
};

/** Suggest go-home from whelp date + weeks. Never auto-commit. */
export function suggestGoHomeDate(
  actualDate: string | null | undefined,
  weeks: number | null | undefined,
): string | null {
  if (!actualDate) return null;
  const w = weeks && weeks > 0 ? weeks : 10;
  return addDays(actualDate, w * 7);
}

/** Client-safe label — null when the kennel has not committed a date. */
export function formatGoHomeLabel(source: GoHomeSource): string | null {
  if (source.go_home_date) return formatKennelDate(source.go_home_date);
  const earliest = source.go_home_earliest;
  const latest = source.go_home_latest;
  if (earliest && latest) {
    return `${formatKennelDate(earliest)} – ${formatKennelDate(latest)}`;
  }
  if (earliest) return `from ${formatKennelDate(earliest)}`;
  if (latest) return `by ${formatKennelDate(latest)}`;
  return null;
}
