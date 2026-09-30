/**
 * Litter league, dam lifetime, and the name-match queue.
 * Money figures come from dogProfitability. Unlinked income stays
 * "Not yet linked". A dam under 80% coverage is not drawn as a solid line.
 */

import {
  dogHasLinkedIncome,
  litterCoveragePhrase,
  summarizeLitter,
  type MoneyFigure,
  type ProfitAllocation,
  type ProfitHistorical,
  type ProfitInvoice,
  type ProfitPuppy,
} from "./dogProfitability";

export const SOLID_COVERAGE = 0.8;

const EXCLUDED_INVOICE = new Set(["void", "cancelled", "draft"]);

export const DAM_COLOURS = [
  "#C4A35A",
  "#7EB6D9",
  "#E07A5F",
  "#81B29A",
  "#F2CC8F",
  "#C77DFF",
  "#90BE6D",
  "#F4A261",
  "#4CC9F0",
  "#E9C46A",
  "#F28482",
  "#8ECAE6",
];

export type ReportLitter = {
  id: string;
  name: string | null;
  damId: string | null;
  damName: string;
  sireName: string;
  whelpDate: string | null;
};

export type ReportPuppy = {
  id: string;
  name: string;
  status: string;
  litterId: string | null;
  buyerName: string | null;
};

export type ReportInvoice = {
  id: string;
  dogId: string | null;
  litterId: string | null;
  issueDate: string | null;
  total: number;
  paid: number;
  status: string;
  number: string | null;
  clientName: string;
  historicalIncomeId: string | null;
};

export type ReportHistorical = {
  id: string;
  dogId: string | null;
  litterId: string | null;
  date: string | null;
  total: number;
  buyer: string;
};

export type ReportAllocation = {
  id: string;
  litterId: string | null;
  dogId: string | null;
  amount: number;
  date: string | null;
  description: string;
  kind: string;
};

export type LitterReportInput = {
  litters: ReportLitter[];
  puppies: ReportPuppy[];
  invoices: ReportInvoice[];
  historical: ReportHistorical[];
  allocations: ReportAllocation[];
};

export type LitterLeagueRow = {
  litterId: string;
  label: string;
  damId: string | null;
  damName: string;
  sireName: string;
  whelpDate: string | null;
  born: number;
  sold: number;
  linkedSales: number;
  coverage: string;
  invoiced: MoneyFigure;
  received: MoneyFigure;
  outstanding: MoneyFigure;
  cost: number;
  net: MoneyFigure;
  netPerPuppy: MoneyFigure;
};

export type DamLifetime = {
  damId: string;
  damName: string;
  colour: string;
  litters: number;
  born: number;
  sold: number;
  linkedSales: number;
  coverage: string;
  coverageRatio: number | null;
  chart: "solid" | "excluded";
  invoiced: MoneyFigure;
  received: MoneyFigure;
  outstanding: MoneyFigure;
  cost: number;
  net: MoneyFigure;
  averageNetPerLitter: MoneyFigure;
};

export type DamYearPoint = {
  year: number;
  /** Null when that year has sold puppies and none of the income is linked. */
  received: number | null;
  invoiced: number | null;
};

export type DamSeries = {
  damId: string;
  damName: string;
  colour: string;
  points: DamYearPoint[];
  cumulative: DamYearPoint[];
};

export type NameSuggestion = {
  dogId: string;
  dogName: string;
  litterId: string;
  litterLabel: string;
  damName: string;
  buyerName: string;
  invoiceId: string;
  invoiceNumber: string | null;
  clientName: string;
  issueDate: string | null;
  total: number;
  paid: number;
};

export type RejectedPair = { dogId: string; invoiceId: string };

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function asProfitPuppy(puppy: ReportPuppy): ProfitPuppy {
  return {
    id: puppy.id,
    name: puppy.name,
    status: puppy.status,
    litterId: puppy.litterId,
    deceasedAt: null,
    motherId: null,
    fatherId: null,
  };
}

function asProfitInvoice(row: ReportInvoice): ProfitInvoice {
  return {
    id: row.id,
    dogId: row.dogId,
    issueDate: row.issueDate,
    total: row.total,
    paid: row.paid,
    buyer: row.clientName,
    status: row.status,
    number: row.number,
    historicalIncomeId: row.historicalIncomeId,
    litterId: row.litterId,
  };
}

function asProfitHistorical(row: ReportHistorical): ProfitHistorical {
  return {
    id: row.id,
    dogId: row.dogId,
    date: row.date,
    total: row.total,
    paid: row.total,
    buyer: row.buyer,
    description: null,
    number: null,
    litterId: row.litterId,
  };
}

function asAllocation(row: ReportAllocation): ProfitAllocation {
  return {
    id: row.id,
    dogId: row.dogId,
    litterId: row.litterId,
    amount: row.amount,
    kind: row.kind,
    date: row.date,
    description: row.description,
    basisNote: null,
    supplier: null,
  };
}

export function litterInYear(whelpDate: string | null, year: number | "all", month: number | "all"): boolean {
  if (year === "all" && month === "all") return true;
  if (!whelpDate) return false;
  if (year !== "all" && whelpDate.slice(0, 4) !== String(year)) return false;
  if (month === "all") return true;
  return Number(whelpDate.slice(5, 7)) === month + 1;
}

export function buildLitterLeague(
  input: LitterReportInput,
  filter: { year: number | "all"; month: number | "all" } = { year: "all", month: "all" },
): LitterLeagueRow[] {
  const invoices = input.invoices.map(asProfitInvoice);
  const historical = input.historical.map(asProfitHistorical);
  const allocations = input.allocations.map(asAllocation);
  const puppies = input.puppies.map(asProfitPuppy);
  const rows: LitterLeagueRow[] = [];
  for (const litter of input.litters) {
    if (!litterInYear(litter.whelpDate, filter.year, filter.month)) continue;
    const summary = summarizeLitter({
      litterId: litter.id,
      puppies,
      invoices,
      historical,
      allocations,
    });
    rows.push({
      litterId: litter.id,
      label: litter.name?.trim() || "Litter",
      damId: litter.damId,
      damName: litter.damName || "Dam not named",
      sireName: litter.sireName || "Sire not named",
      whelpDate: litter.whelpDate,
      born: summary.born,
      sold: summary.sold,
      linkedSales: summary.linkedSales,
      coverage: summary.coverage,
      invoiced: summary.invoiced,
      received: summary.received,
      outstanding: summary.outstanding,
      cost: summary.cost,
      net: summary.net,
      netPerPuppy: summary.netPerPuppy,
    });
  }
  rows.sort((a, b) => (b.whelpDate ?? "").localeCompare(a.whelpDate ?? ""));
  return rows;
}

function amountOrNull(figure: MoneyFigure): number | null {
  return figure.kind === "amount" ? figure.amount : null;
}

function sumFigures(figures: MoneyFigure[], sold: number, linked: number): MoneyFigure {
  if (linked <= 0 && sold > 0) return { kind: "not_linked" };
  if (sold <= 0 && figures.every((figure) => figure.kind !== "amount")) return { kind: "not_applicable" };
  const amounts = figures.filter((figure) => figure.kind === "amount");
  if (amounts.length === 0) return sold > 0 ? { kind: "not_linked" } : { kind: "not_applicable" };
  return {
    kind: "amount",
    amount: round2(amounts.reduce((sum, figure) => sum + (figure.kind === "amount" ? figure.amount : 0), 0)),
  };
}

export function coverageRatio(linked: number, sold: number): number | null {
  if (sold <= 0) return null;
  return linked / sold;
}

export function chartStatus(linked: number, sold: number): "solid" | "excluded" {
  const ratio = coverageRatio(linked, sold);
  if (ratio == null || ratio < SOLID_COVERAGE) return "excluded";
  return "solid";
}

export function buildDamLifetimes(rows: LitterLeagueRow[]): DamLifetime[] {
  const groups = new Map<string, LitterLeagueRow[]>();
  for (const row of rows) {
    if (!row.damId) continue;
    const list = groups.get(row.damId) ?? [];
    list.push(row);
    groups.set(row.damId, list);
  }
  const dams = [...groups.entries()].map(([damId, litters]) => ({
    damId,
    damName: litters[0]?.damName || "Dam",
    litters,
  }));
  dams.sort((a, b) => a.damName.localeCompare(b.damName));
  return dams.map((dam, index) => {
    const sold = dam.litters.reduce((sum, row) => sum + row.sold, 0);
    const linked = dam.litters.reduce((sum, row) => sum + row.linkedSales, 0);
    const moneyLinked = dam.litters.reduce(
      (sum, row) => sum + (row.received.kind === "amount" ? Math.max(row.linkedSales, 1) : 0),
      0,
    );
    const born = dam.litters.reduce((sum, row) => sum + row.born, 0);
    const cost = round2(dam.litters.reduce((sum, row) => sum + row.cost, 0));
    const invoiced = sumFigures(
      dam.litters.map((row) => row.invoiced),
      sold,
      moneyLinked,
    );
    const received = sumFigures(
      dam.litters.map((row) => row.received),
      sold,
      moneyLinked,
    );
    const outstanding = sumFigures(
      dam.litters.map((row) => row.outstanding),
      sold,
      moneyLinked,
    );
    const net: MoneyFigure =
      received.kind !== "amount" ? received : { kind: "amount", amount: round2(received.amount - cost) };
    const average: MoneyFigure =
      net.kind !== "amount"
        ? net
        : dam.litters.length > 0
          ? { kind: "amount", amount: round2(net.amount / dam.litters.length) }
          : { kind: "not_applicable" };
    return {
      damId: dam.damId,
      damName: dam.damName,
      colour: DAM_COLOURS[index % DAM_COLOURS.length]!,
      litters: dam.litters.length,
      born,
      sold,
      linkedSales: linked,
      coverage: litterCoveragePhrase(linked, sold),
      coverageRatio: coverageRatio(linked, sold),
      chart: chartStatus(linked, sold),
      invoiced,
      received,
      outstanding,
      cost,
      net,
      averageNetPerLitter: average,
    };
  });
}

export function buildDamSeries(rows: LitterLeagueRow[], dams: DamLifetime[]): DamSeries[] {
  const years = [
    ...new Set(
      rows
        .map((row) => (row.whelpDate ? Number(row.whelpDate.slice(0, 4)) : null))
        .filter((year): year is number => year != null && Number.isFinite(year)),
    ),
  ].sort((a, b) => a - b);

  return dams
    .filter((dam) => dam.chart === "solid")
    .map((dam) => {
      const hers = rows.filter((row) => row.damId === dam.damId);
      const points: DamYearPoint[] = years.map((year) => {
        const inYear = hers.filter((row) => row.whelpDate?.slice(0, 4) === String(year));
        if (inYear.length === 0) return { year, received: null, invoiced: null };
        const sold = inYear.reduce((sum, row) => sum + row.sold, 0);
        const linked = inYear.reduce((sum, row) => sum + row.linkedSales, 0);
        if (sold > 0 && linked === 0 && inYear.every((row) => row.received.kind !== "amount")) {
          return { year, received: null, invoiced: null };
        }
        const received = inYear.reduce((sum, row) => sum + (amountOrNull(row.received) ?? 0), 0);
        const invoiced = inYear.reduce((sum, row) => sum + (amountOrNull(row.invoiced) ?? 0), 0);
        return { year, received: round2(received), invoiced: round2(invoiced) };
      });
      let runningReceived = 0;
      let runningInvoiced = 0;
      let seen = false;
      const cumulative: DamYearPoint[] = points.map((point) => {
        if (point.received == null || point.invoiced == null) {
          return { year: point.year, received: null, invoiced: null };
        }
        seen = true;
        runningReceived = round2(runningReceived + point.received);
        runningInvoiced = round2(runningInvoiced + point.invoiced);
        return { year: point.year, received: runningReceived, invoiced: runningInvoiced };
      });
      if (!seen) {
        return { damId: dam.damId, damName: dam.damName, colour: dam.colour, points, cumulative };
      }
      return { damId: dam.damId, damName: dam.damName, colour: dam.colour, points, cumulative };
    });
}

export function programmeCoverage(rows: LitterLeagueRow[]): { linked: number; sold: number; text: string } {
  const sold = rows.reduce((sum, row) => sum + row.sold, 0);
  const linked = rows.reduce((sum, row) => sum + row.linkedSales, 0);
  return {
    linked,
    sold,
    text: `Income is linked for ${linked} of ${sold} sold puppies. Figures below cover only linked sales.`,
  };
}

export function excludedDamNote(dams: DamLifetime[]): string {
  const excluded = dams.filter((dam) => dam.chart === "excluded" && dam.sold > 0);
  if (excluded.length === 0) return "";
  const names = excluded.map((dam) => `${dam.damName} (${dam.linkedSales} of ${dam.sold})`);
  return `Not drawn: ${names.join(", ")}. A line needs income linked for at least 80% of puppies sold.`;
}

export function normalizeBuyerName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function suggestExactNameLinks(
  input: LitterReportInput,
  rejected: RejectedPair[] = [],
): NameSuggestion[] {
  const blocked = new Set(rejected.map((pair) => `${pair.dogId}:${pair.invoiceId}`));
  const invoices = input.invoices.map(asProfitInvoice);
  const historical = input.historical.map(asProfitHistorical);
  const litterById = new Map(input.litters.map((litter) => [litter.id, litter]));
  const openInvoices = input.invoices.filter((row) => {
    if (row.dogId) return false;
    if (EXCLUDED_INVOICE.has(row.status.toLowerCase())) return false;
    return normalizeBuyerName(row.clientName).length > 0;
  });
  const suggestions: NameSuggestion[] = [];
  for (const puppy of input.puppies) {
    if (puppy.status !== "sold" || !puppy.litterId) continue;
    const buyer = normalizeBuyerName(puppy.buyerName ?? "");
    if (!buyer) continue;
    if (dogHasLinkedIncome(puppy.id, invoices, historical)) continue;
    const litter = litterById.get(puppy.litterId);
    if (!litter) continue;
    for (const invoice of openInvoices) {
      if (normalizeBuyerName(invoice.clientName) !== buyer) continue;
      if (blocked.has(`${puppy.id}:${invoice.id}`)) continue;
      suggestions.push({
        dogId: puppy.id,
        dogName: puppy.name,
        litterId: litter.id,
        litterLabel: litter.name?.trim() || "Litter",
        damName: litter.damName || "Dam not named",
        buyerName: puppy.buyerName?.trim() || invoice.clientName,
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        clientName: invoice.clientName,
        issueDate: invoice.issueDate,
        total: invoice.total,
        paid: invoice.paid,
      });
    }
  }
  suggestions.sort((a, b) => (b.issueDate ?? "").localeCompare(a.issueDate ?? "") || a.dogName.localeCompare(b.dogName));
  return suggestions;
}

/** Every exact name pair, including ones the queue then leaves out. */
export function exactNameCensus(input: LitterReportInput): { pairs: number; puppies: number; invoices: number } {
  const puppies = new Set<string>();
  const invoices = new Set<string>();
  let pairs = 0;
  const open = input.invoices.filter((row) => !row.dogId && normalizeBuyerName(row.clientName));
  for (const puppy of input.puppies) {
    if (puppy.status !== "sold" || !puppy.litterId) continue;
    const buyer = normalizeBuyerName(puppy.buyerName ?? "");
    if (!buyer) continue;
    for (const invoice of open) {
      if (normalizeBuyerName(invoice.clientName) !== buyer) continue;
      pairs += 1;
      puppies.add(puppy.id);
      invoices.add(invoice.id);
    }
  }
  return { pairs, puppies: puppies.size, invoices: invoices.size };
}

export function nameMatchSummary(suggestions: NameSuggestion[]): string {
  const puppies = new Set(suggestions.map((row) => row.dogId)).size;
  const invoices = new Set(suggestions.map((row) => row.invoiceId)).size;
  const pair = suggestions.length === 1 ? "pair" : "pairs";
  const puppy = puppies === 1 ? "puppy" : "puppies";
  const invoice = invoices === 1 ? "invoice" : "invoices";
  return `${suggestions.length} exact name ${pair} · ${puppies} ${puppy} · ${invoices} ${invoice}. Each link needs a confirmation. A name match is only a suggestion.`;
}
