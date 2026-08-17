import type { BreedHeatDefaults, FemaleHeatSummary, HeatCycleRecord } from '@/lib/heats/constants';
import { computeIsOverdue, daysSince, daysUntil, isActiveHeat } from '@/lib/heats/calculations';
import { formatKennelDate } from '@/lib/kennel/formatters';
import {
  ageInMonths,
  dashboardSortKey,
  femaleDaysRemaining,
  forecastFromHistory,
  goHomeForCycle,
  isPregnantCycle,
  offsetMessageFromDays,
} from '@/lib/heats/forecast';

export function buildFemaleHeatSummary(
  female: { id: string; name: string; photoUrl: string | null; dateOfBirth?: string | null },
  cycles: HeatCycleRecord[],
  defaults: BreedHeatDefaults,
  litterGoHome: Record<string, string | null> = {},
): FemaleHeatSummary {
  const activeHeat = cycles.find(isActiveHeat) ?? null;
  const pregnantCycle = cycles.find(isPregnantCycle) ?? null;
  const nextPredicted =
    cycles
      .filter((c) => c.is_predicted)
      .sort((a, b) => a.heat_start_date.localeCompare(b.heat_start_date))[0] ?? null;
  const forecast = forecastFromHistory(cycles, defaults, female.dateOfBirth);
  const isOverdue = nextPredicted
    ? computeIsOverdue(nextPredicted)
    : Boolean(
        forecast &&
          forecast.source !== 'first_season' &&
          (daysUntil(forecast.rangeLatest) ?? 0) < 0,
      );
  const goHomeDate = goHomeForCycle(
    pregnantCycle,
    pregnantCycle?.resulting_litter_id
      ? litterGoHome[pregnantCycle.resulting_litter_id]
      : null,
  );
  const daysRemaining = femaleDaysRemaining({
    activeHeat,
    pregnantCycle,
    forecast,
    goHomeDate,
  });
  const ageMonths = ageInMonths(female.dateOfBirth);
  const untilNext = forecast ? daysUntil(forecast.rangeEarliest) : null;

  return {
    id: female.id,
    name: female.name,
    photoUrl: female.photoUrl,
    dateOfBirth: female.dateOfBirth ?? null,
    ageMonths,
    activeHeat,
    pregnantCycle,
    nextPredicted,
    isOverdue,
    daysInHeat: activeHeat ? daysSince(activeHeat.heat_start_date) : null,
    daysUntilNext: untilNext,
    daysOverdue: isOverdue && untilNext != null ? Math.abs(untilNext) : null,
    daysRemaining,
    goHomeDate,
    forecastRangeLabel: forecast?.rangeLabel ?? null,
    forecastBasis: forecast?.basisLabel ?? null,
    statusDetail: statusDetail({
      activeHeat,
      pregnantCycle,
      isOverdue,
      forecast,
      goHomeDate,
      ageMonths,
      cycles,
    }),
    offsetMessage: offsetMessageFromDays(
      cycles.find((c) => !c.is_predicted)?.forecast_offset_days,
    ),
  };
}

function statusDetail(input: {
  activeHeat: HeatCycleRecord | null;
  pregnantCycle: HeatCycleRecord | null;
  isOverdue: boolean;
  forecast: ReturnType<typeof forecastFromHistory>;
  goHomeDate: string | null;
  ageMonths: number | null;
  cycles: HeatCycleRecord[];
}): string {
  if (input.activeHeat) {
    const day = (daysSince(input.activeHeat.heat_start_date) ?? 0) + 1;
    return `In heat · day ${day}`;
  }
  if (input.pregnantCycle) {
    const due = input.pregnantCycle.expected_whelp_date;
    const dueBit = due ? `due ${formatKennelDate(due)}` : 'pregnant';
    const home = input.goHomeDate ? ` · go home ${formatKennelDate(input.goHomeDate)}` : '';
    return `Pregnant · ${dueBit}${home}`;
  }
  const hasActual = input.cycles.some((c) => !c.is_predicted);
  if (!hasActual) {
    const age = input.ageMonths != null ? ` · ${input.ageMonths} months old` : '';
    return `No season recorded yet${age}`;
  }
  if (input.isOverdue && input.forecast) {
    return `Overdue · expected ${input.forecast.rangeLabel.replace('Expected ', '')} (${input.forecast.basisLabel})`;
  }
  if (input.forecast) {
    const none = input.forecast.source === 'breed_default' ? ' (no history)' : '';
    return `Next heat ${input.forecast.rangeLabel.replace('Expected ', 'expected ')}${none}`;
  }
  return 'No heat history';
}

export function sortBreedingFemales(rows: FemaleHeatSummary[]): FemaleHeatSummary[] {
  return [...rows].sort((a, b) => {
    const d = dashboardSortKey(a) - dashboardSortKey(b);
    if (d !== 0) return d;
    return a.name.localeCompare(b.name);
  });
}
