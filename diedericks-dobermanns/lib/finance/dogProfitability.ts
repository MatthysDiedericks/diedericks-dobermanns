/**
 * Two columns of money for one dog. Direct is this animal.
 * Attributed is what she produced. They are never added together.
 *
 * Missing income stays missing. A figure is "Not yet linked", never R0,
 * when the sale was not recorded against the dog.
 */

export type MoneyFigure =
  | { kind: "amount"; amount: number }
  | { kind: "not_linked" }
  | { kind: "not_recorded" }
  | { kind: "not_applicable" };

export type ProfitFilter = {
  year: number | "all";
  litterId: string | "all";
};

export const ALL_TIME: ProfitFilter = { year: "all", litterId: "all" };

export type ProfitDog = {
  id: string;
  name: string;
  status: string;
};

export type ProfitLitter = {
  id: string;
  name: string | null;
  motherId: string | null;
  fatherId: string | null;
  whelpDate: string | null;
};

export type ProfitPuppy = {
  id: string;
  name: string;
  status: string;
  litterId: string | null;
  deceasedAt: string | null;
  motherId: string | null;
  fatherId: string | null;
};

export type ProfitInvoice = {
  id: string;
  dogId: string | null;
  issueDate: string | null;
  /** Invoice total — what was billed. */
  total: number;
  /**
   * What has actually been collected. Omit only in fixtures that are fully
   * collected. Live rows must pass amount_paid, including 0.
   */
  paid?: number;
  buyer: string;
  status: string;
  number: string | null;
  historicalIncomeId: string | null;
  /** Set when the sale was linked to the litter and not to one puppy. */
  litterId?: string | null;
};

export type ProfitHistorical = {
  id: string;
  dogId: string | null;
  date: string | null;
  total: number;
  /** Collected. Historical rows are already received, so loaders pass the same total. */
  paid?: number;
  buyer: string;
  description: string | null;
  number: string | null;
  litterId?: string | null;
};

export type ProfitAllocation = {
  id: string;
  dogId: string | null;
  litterId: string | null;
  amount: number;
  kind: string;
  date: string | null;
  description: string;
  basisNote: string | null;
  supplier: string | null;
  /** The whole expense, when this row is one dog's share of it. */
  sourceAmount?: number | null;
};

export type ProfitInput = {
  dog: ProfitDog;
  litters: ProfitLitter[];
  puppies: ProfitPuppy[];
  invoices: ProfitInvoice[];
  historical: ProfitHistorical[];
  allocations: ProfitAllocation[];
  /** Null when no purchase was recorded. Never invent one. */
  purchaseAmount: number | null;
};

export type IncomeLine = {
  id: string;
  source: "invoice" | "historical";
  date: string | null;
  buyer: string;
  /** Invoiced amount. */
  amount: number;
  /** Collected amount. */
  paid: number;
  dogId: string;
  dogName: string;
  litterId: string | null;
  litterName: string | null;
  number: string | null;
};

export type ExpenseReportLine = {
  id: string;
  date: string | null;
  description: string;
  amount: number;
  basis: string | null;
  kind: string;
  sourceAmount?: number | null;
  litterId: string | null;
  litterName: string | null;
  dogId: string | null;
  column: "direct" | "litter";
};

export type LitterBreakdown = {
  litterId: string;
  label: string;
  role: "dam" | "sire" | "both";
  born: number;
  alive: number;
  sold: number;
  linkedSales: number;
  /** Invoiced. Kept so existing readers still see what was billed. */
  income: MoneyFigure;
  invoiced: MoneyFigure;
  received: MoneyFigure;
  outstanding: MoneyFigure;
  directCosts: number;
  sharedCosts: number;
  /** Received minus cost. */
  net: MoneyFigure;
  costPerPuppyRaised: number | null;
};

export type DogProfitability = {
  direct: {
    bought: MoneyFigure;
    sold: MoneyFigure;
    soldReceived: MoneyFigure;
    soldOutstanding: MoneyFigure;
    costs: number;
  };
  attributed: {
    role: "dam" | "sire" | "both";
    litters: number;
    born: number;
    alive: number;
    sold: number;
    retained: number;
    /** Invoiced. */
    income: MoneyFigure;
    invoiced: MoneyFigure;
    received: MoneyFigure;
    outstanding: MoneyFigure;
    litterCosts: number;
    net: MoneyFigure;
    netLabel: "Net (on money received)" | "Net of linked income (on money received)";
    coverage: string;
  } | null;
  coverage: string;
  litterBreakdown: LitterBreakdown[];
  incomeLines: IncomeLine[];
  expenseLines: ExpenseReportLine[];
};

const RETAINED = new Set(["keep", "stud", "breeding_stock", "retired", "in_training"]);
const EXCLUDED_INVOICE = new Set(["void", "cancelled", "draft"]);

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function inYear(date: string | null, year: number | "all"): boolean {
  if (year === "all") return true;
  if (!date) return false;
  return date.slice(0, 4) === String(year);
}

/**
 * "R1 400,00 · share of R9 800,00 vet visit, split across 7 dogs"
 * A bare share looks like the whole bill and gets queried.
 */
export function expenseShareSentence(
  line: {
    amount: number;
    description: string;
    kind: string;
    basis: string | null;
    sourceAmount?: number | null;
  },
  formatAmount: (amount: number) => string,
): string | null {
  if (line.kind !== "selected" || line.sourceAmount == null) return null;
  return `${formatAmount(line.amount)} · share of ${formatAmount(line.sourceAmount)} ${line.description}, ${shareAcrossPhrase(line.basis)}`;
}

function shareAcrossPhrase(basis: string | null): string {
  const equal = basis ? /^Split equally across (\d+) selected dogs$/i.exec(basis) : null;
  if (equal) return `split across ${equal[1]} dogs`;
  const uneven = basis ? /^Uneven amounts across (\d+) selected dogs$/i.exec(basis) : null;
  if (uneven) return `uneven split across ${uneven[1]} dogs`;
  if (!basis) return "split across selected dogs";
  return basis.charAt(0).toLowerCase() + basis.slice(1);
}

export function formatMoneyFigure(figure: MoneyFigure, formatAmount: (amount: number) => string): string {
  if (figure.kind === "amount") return formatAmount(figure.amount);
  if (figure.kind === "not_linked") return "Not yet linked";
  if (figure.kind === "not_recorded") return "Not recorded";
  return "—";
}

export function puppyIncomeCoverage(linked: number, sold: number): string {
  if (sold <= 0) return "No puppies sold";
  if (linked <= 0) {
    return `Income from 0 of ${sold} ${sold === 1 ? "puppy" : "puppies"} sold — ${sold} not yet linked`;
  }
  const noun = sold === 1 ? "puppy" : "puppies";
  if (linked >= sold) return `Income from ${sold} of ${sold} ${noun} sold`;
  const missing = sold - linked;
  return `Income from ${linked} of ${sold} ${noun} sold — ${missing} not yet linked`;
}

/**
 * Puppy coverage when individual sales are linked.
 * Litter coverage when the money reached the litter and was not split.
 */
export function incomeCoverage(input: {
  linkedPuppies: number;
  soldPuppies: number;
  littersWithIncome: number;
  litters: number;
}): string {
  if (input.soldPuppies <= 0 && input.littersWithIncome <= 0) return "No puppies sold";
  if (input.linkedPuppies > 0) return puppyIncomeCoverage(input.linkedPuppies, input.soldPuppies);
  if (input.littersWithIncome > 0) {
    const pups = input.soldPuppies === 1 ? "puppy" : "puppies";
    const litters = input.litters === 1 ? "litter" : "litters";
    return `Income linked to ${input.littersWithIncome} of ${input.litters} ${litters} — not split across ${input.soldPuppies} ${pups} sold`;
  }
  return puppyIncomeCoverage(0, input.soldPuppies);
}

function liveInvoices(invoices: ProfitInvoice[]): ProfitInvoice[] {
  return invoices.filter((row) => !EXCLUDED_INVOICE.has(row.status.toLowerCase()));
}

type RawIncomeLine = Omit<IncomeLine, "dogName" | "litterName">;

/** Fixture rows that omit `paid` are treated as fully collected. Live loaders always pass `paid`. */
export function collectedAmount(total: number, paid: number | undefined): number {
  if (paid == null || !Number.isFinite(Number(paid))) return round2(Number(total) || 0);
  return round2(Number(paid) || 0);
}

function countedIncome(
  dogIds: Set<string>,
  invoices: ProfitInvoice[],
  historical: ProfitHistorical[],
  year: number | "all",
): { amount: number; received: number; linkedDogIds: Set<string>; lines: RawIncomeLine[] } {
  const live = liveInvoices(invoices).filter(
    (row) => row.dogId && dogIds.has(row.dogId) && inYear(row.issueDate, year),
  );
  const promoted = new Set(
    liveInvoices(invoices)
      .map((row) => row.historicalIncomeId)
      .filter((id): id is string => Boolean(id)),
  );
  const history = historical.filter(
    (row) =>
      row.dogId &&
      dogIds.has(row.dogId) &&
      !promoted.has(row.id) &&
      inYear(row.date, year),
  );
  const linkedDogIds = new Set<string>();
  let amount = 0;
  let received = 0;
  const lines: RawIncomeLine[] = [];
  for (const row of live) {
    linkedDogIds.add(row.dogId!);
    const invoiced = round2(Number(row.total) || 0);
    const paid = collectedAmount(invoiced, row.paid);
    amount += invoiced;
    received += paid;
    lines.push({
      id: row.id,
      source: "invoice",
      date: row.issueDate,
      buyer: row.buyer || "—",
      amount: invoiced,
      paid,
      dogId: row.dogId!,
      litterId: row.litterId ?? null,
      number: row.number,
    });
  }
  for (const row of history) {
    linkedDogIds.add(row.dogId!);
    const invoiced = round2(Number(row.total) || 0);
    const paid = collectedAmount(invoiced, row.paid);
    amount += invoiced;
    received += paid;
    lines.push({
      id: row.id,
      source: "historical",
      date: row.date,
      buyer: row.buyer || "—",
      amount: invoiced,
      paid,
      dogId: row.dogId!,
      litterId: row.litterId ?? null,
      number: row.number,
    });
  }
  return { amount: round2(amount), received: round2(received), linkedDogIds, lines };
}

/**
 * Income stamped on the litter itself. Rows already counted against a puppy
 * in `puppyIds` are left out, so a sale is never added twice.
 */
function countedLitterIncome(
  litterIds: Set<string>,
  puppyIds: Set<string>,
  invoices: ProfitInvoice[],
  historical: ProfitHistorical[],
  year: number | "all",
): { amount: number; received: number; litterIds: Set<string>; lines: RawIncomeLine[] } {
  const promoted = new Set(
    liveInvoices(invoices)
      .map((row) => row.historicalIncomeId)
      .filter((id): id is string => Boolean(id)),
  );
  const live = liveInvoices(invoices).filter((row) => {
    if (!row.litterId || !litterIds.has(row.litterId)) return false;
    if (row.dogId && puppyIds.has(row.dogId)) return false;
    return inYear(row.issueDate, year);
  });
  const history = historical.filter((row) => {
    if (!row.litterId || !litterIds.has(row.litterId)) return false;
    if (row.dogId && puppyIds.has(row.dogId)) return false;
    if (promoted.has(row.id)) return false;
    return inYear(row.date, year);
  });
  const hit = new Set<string>();
  let amount = 0;
  let received = 0;
  const lines: RawIncomeLine[] = [];
  for (const row of live) {
    hit.add(row.litterId!);
    const invoiced = round2(Number(row.total) || 0);
    const paid = collectedAmount(invoiced, row.paid);
    amount += invoiced;
    received += paid;
    lines.push({
      id: row.id,
      source: "invoice",
      date: row.issueDate,
      buyer: row.buyer || "—",
      amount: invoiced,
      paid,
      dogId: row.dogId ?? "",
      litterId: row.litterId!,
      number: row.number,
    });
  }
  for (const row of history) {
    hit.add(row.litterId!);
    const invoiced = round2(Number(row.total) || 0);
    const paid = collectedAmount(invoiced, row.paid);
    amount += invoiced;
    received += paid;
    lines.push({
      id: row.id,
      source: "historical",
      date: row.date,
      buyer: row.buyer || "—",
      amount: invoiced,
      paid,
      dogId: row.dogId ?? "",
      litterId: row.litterId!,
      number: row.number,
    });
  }
  return { amount: round2(amount), received: round2(received), litterIds: hit, lines };
}

/** All-time link, ignoring the year filter, so a quiet year is not "missing". */
function dogIsLinked(
  dogId: string,
  invoices: ProfitInvoice[],
  historical: ProfitHistorical[],
): boolean {
  const ids = new Set([dogId]);
  return countedIncome(ids, invoices, historical, "all").linkedDogIds.has(dogId);
}

function isAlive(puppy: ProfitPuppy): boolean {
  return !puppy.deceasedAt && puppy.status !== "deceased";
}

function incomeFigure(
  sold: number,
  linkedPuppies: number,
  litterLinked: boolean,
  amount: number,
): MoneyFigure {
  if (linkedPuppies > 0 || litterLinked) return { kind: "amount", amount: round2(amount) };
  if (sold > 0) return { kind: "not_linked" };
  return { kind: "not_applicable" };
}

function netFigure(income: MoneyFigure, costs: number): MoneyFigure {
  if (income.kind !== "amount") return income.kind === "not_linked" ? { kind: "not_linked" } : { kind: "not_applicable" };
  return { kind: "amount", amount: round2(income.amount - costs) };
}

export type LinkedMoney = {
  invoiced: MoneyFigure;
  received: MoneyFigure;
  outstanding: MoneyFigure;
  /** Received minus costs. Unlinked income stays unlinked, never a profit of −cost. */
  net: MoneyFigure;
};

/**
 * Invoiced, received, and outstanding for one sale group.
 * Missing income stays missing on all three. Net is on received.
 */
export function linkedMoney(input: {
  sold: number;
  linkedPuppies: number;
  litterLinked: boolean;
  invoiced: number;
  received: number;
  costs: number;
}): LinkedMoney {
  const gate = incomeFigure(input.sold, input.linkedPuppies, input.litterLinked, input.invoiced);
  if (gate.kind !== "amount") {
    const missing = gate.kind === "not_linked" ? { kind: "not_linked" as const } : { kind: "not_applicable" as const };
    return { invoiced: missing, received: missing, outstanding: missing, net: netFigure(missing, input.costs) };
  }
  const invoiced = round2(input.invoiced);
  const received = round2(input.received);
  const receivedFigure: MoneyFigure = { kind: "amount", amount: received };
  return {
    invoiced: { kind: "amount", amount: invoiced },
    received: receivedFigure,
    outstanding: { kind: "amount", amount: round2(invoiced - received) },
    net: netFigure(receivedFigure, input.costs),
  };
}

function roleFor(dogId: string, litters: ProfitLitter[], puppies: ProfitPuppy[]): "dam" | "sire" | "both" | null {
  const dam =
    litters.some((litter) => litter.motherId === dogId) ||
    puppies.some((puppy) => puppy.motherId === dogId);
  const sire =
    litters.some((litter) => litter.fatherId === dogId) ||
    puppies.some((puppy) => puppy.fatherId === dogId);
  if (dam && sire) return "both";
  if (dam) return "dam";
  if (sire) return "sire";
  return null;
}

export function buildDogProfitability(
  input: ProfitInput,
  filter: ProfitFilter = ALL_TIME,
): DogProfitability {
  const dogId = input.dog.id;
  const puppies = input.puppies.filter((puppy) => puppy.id !== dogId);
  const litterById = new Map(input.litters.map((litter) => [litter.id, litter]));
  const puppyById = new Map(puppies.map((puppy) => [puppy.id, puppy]));

  const scopePuppies =
    filter.litterId === "all"
      ? puppies
      : filter.litterId === "none"
        ? puppies.filter((puppy) => !puppy.litterId || !litterById.has(puppy.litterId))
        : puppies.filter((puppy) => puppy.litterId === filter.litterId);
  const scopeLitters =
    filter.litterId === "all"
      ? input.litters
      : filter.litterId === "none"
        ? []
        : input.litters.filter((litter) => litter.id === filter.litterId);
  const scopeLitterIds = new Set(scopeLitters.map((litter) => litter.id));
  const scopePuppyIds = new Set(scopePuppies.map((puppy) => puppy.id));

  const soldPuppies = scopePuppies.filter((puppy) => puppy.status === "sold");
  const linkedPuppyIds = new Set(
    soldPuppies.filter((puppy) => dogIsLinked(puppy.id, input.invoices, input.historical)).map((puppy) => puppy.id),
  );
  const progenyIncome = countedIncome(scopePuppyIds, input.invoices, input.historical, filter.year);
  const litterOnly = countedLitterIncome(
    scopeLitterIds,
    scopePuppyIds,
    input.invoices,
    input.historical,
    filter.year,
  );
  const ownIncome = countedIncome(new Set([dogId]), input.invoices, input.historical, filter.year);
  const ownLinked = dogIsLinked(dogId, input.invoices, input.historical);

  const litterAllocations = input.allocations.filter(
    (row) => row.litterId && scopeLitterIds.has(row.litterId) && inYear(row.date, filter.year),
  );
  const directAllocations = input.allocations.filter(
    (row) => row.dogId === dogId && !row.litterId && inYear(row.date, filter.year),
  );
  const directCosts = round2(directAllocations.reduce((sum, row) => sum + (Number(row.amount) || 0), 0));
  const litterCosts = round2(litterAllocations.reduce((sum, row) => sum + (Number(row.amount) || 0), 0));

  const soldMoney = linkedMoney({
    sold: input.dog.status === "sold" ? 1 : 0,
    linkedPuppies: ownLinked ? 1 : 0,
    litterLinked: false,
    invoiced: ownIncome.amount,
    received: ownIncome.received,
    costs: 0,
  });
  const soldFigure = soldMoney.invoiced;

  const names = new Map<string, string>([[dogId, input.dog.name]]);
  for (const puppy of puppies) names.set(puppy.id, puppy.name);

  function litterName(litterId: string | null): string | null {
    if (!litterId) return null;
    return litterById.get(litterId)?.name ?? null;
  }

  const incomeLines: IncomeLine[] = [...ownIncome.lines, ...progenyIncome.lines, ...litterOnly.lines].map(
    (line) => {
      const puppy = line.dogId ? puppyById.get(line.dogId) : undefined;
      const litterId =
        line.litterId ?? (line.dogId && line.dogId !== dogId ? (puppy?.litterId ?? null) : null);
      return {
        ...line,
        dogName: line.dogId ? (names.get(line.dogId) ?? line.dogId) : "Litter",
        litterId,
        litterName: litterName(litterId),
      };
    },
  );
  incomeLines.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  const expenseLines: ExpenseReportLine[] = [
    ...directAllocations.map((row) => ({
      id: row.id,
      date: row.date,
      description: row.description,
      amount: round2(Number(row.amount) || 0),
      basis: row.basisNote,
      kind: row.kind,
      sourceAmount: row.sourceAmount ?? null,
      litterId: null,
      litterName: null,
      dogId: row.dogId,
      column: "direct" as const,
    })),
    ...litterAllocations.map((row) => ({
      id: row.id,
      date: row.date,
      description: row.description,
      amount: round2(Number(row.amount) || 0),
      basis: row.basisNote,
      kind: row.kind,
      sourceAmount: row.sourceAmount ?? null,
      litterId: row.litterId,
      litterName: litterName(row.litterId),
      dogId: row.dogId,
      column: "litter" as const,
    })),
  ];
  expenseLines.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  const role = roleFor(dogId, input.litters, puppies);
  const littersWithIncome = new Set(litterOnly.litterIds);
  for (const puppy of soldPuppies) {
    if (linkedPuppyIds.has(puppy.id) && puppy.litterId && scopeLitterIds.has(puppy.litterId)) {
      littersWithIncome.add(puppy.litterId);
    }
  }
  const coverage = incomeCoverage({
    linkedPuppies: linkedPuppyIds.size,
    soldPuppies: soldPuppies.length,
    littersWithIncome: littersWithIncome.size,
    litters: scopeLitters.length,
  });

  const litterBreakdown: LitterBreakdown[] = [];
  const groups = new Map<string, ProfitPuppy[]>();
  for (const puppy of scopePuppies) {
    const key = puppy.litterId && litterById.has(puppy.litterId) ? puppy.litterId : puppy.litterId ?? "none";
    const list = groups.get(key) ?? [];
    list.push(puppy);
    groups.set(key, list);
  }
  for (const litter of scopeLitters) {
    if (!groups.has(litter.id)) groups.set(litter.id, []);
  }

  for (const [key, pups] of groups) {
    const litter = key === "none" ? null : litterById.get(key) ?? null;
    if (filter.litterId !== "all" && key !== filter.litterId) continue;
    const ids = new Set(pups.map((puppy) => puppy.id));
    const sold = pups.filter((puppy) => puppy.status === "sold");
    const linked = sold.filter((puppy) => dogIsLinked(puppy.id, input.invoices, input.historical)).length;
    const money = countedIncome(ids, input.invoices, input.historical, filter.year);
    const litterMoney =
      key === "none"
        ? { amount: 0, received: 0, litterIds: new Set<string>() }
        : countedLitterIncome(new Set([key]), ids, input.invoices, input.historical, filter.year);
    const rowInvoiced = round2(money.amount + litterMoney.amount);
    const rowReceived = round2(money.received + litterMoney.received);
    const allocs = litter
      ? litterAllocations.filter((row) => row.litterId === litter.id)
      : [];
    const directCost = round2(
      allocs.filter((row) => row.kind !== "shared").reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    );
    const sharedCost = round2(
      allocs.filter((row) => row.kind === "shared").reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    );
    const alive = pups.filter(isAlive).length;
    const moneyRow = linkedMoney({
      sold: sold.length,
      linkedPuppies: linked,
      litterLinked: litterMoney.litterIds.size > 0,
      invoiced: rowInvoiced,
      received: rowReceived,
      costs: round2(directCost + sharedCost),
    });
    const income = moneyRow.invoiced;
    const dam = litter?.motherId === dogId || pups.some((puppy) => puppy.motherId === dogId);
    const sire = litter?.fatherId === dogId || pups.some((puppy) => puppy.fatherId === dogId);
    const rowRole: LitterBreakdown["role"] = dam && sire ? "both" : sire && !dam ? "sire" : "dam";
    litterBreakdown.push({
      litterId: key,
      label: litter?.name?.trim() || (key === "none" ? "No litter on file" : "Litter"),
      role: rowRole,
      born: pups.length,
      alive,
      sold: sold.length,
      linkedSales: linked,
      income,
      invoiced: moneyRow.invoiced,
      received: moneyRow.received,
      outstanding: moneyRow.outstanding,
      directCosts: directCost,
      sharedCosts: sharedCost,
      net: moneyRow.net,
      costPerPuppyRaised: alive > 0 ? round2((directCost + sharedCost) / alive) : null,
    });
  }
  litterBreakdown.sort((a, b) => a.label.localeCompare(b.label));

  const attributedMoney = linkedMoney({
    sold: soldPuppies.length,
    linkedPuppies: linkedPuppyIds.size,
    litterLinked: litterOnly.litterIds.size > 0,
    invoiced: round2(progenyIncome.amount + litterOnly.amount),
    received: round2(progenyIncome.received + litterOnly.received),
    costs: litterCosts,
  });

  return {
    direct: {
      bought:
        input.purchaseAmount == null
          ? { kind: "not_recorded" }
          : { kind: "amount", amount: round2(input.purchaseAmount) },
      sold: soldFigure,
      soldReceived: soldMoney.received,
      soldOutstanding: soldMoney.outstanding,
      costs: directCosts,
    },
    attributed:
      role == null
        ? null
        : {
            role,
            litters: scopeLitters.length,
            born: scopePuppies.length,
            alive: scopePuppies.filter(isAlive).length,
            sold: soldPuppies.length,
            retained: scopePuppies.filter((puppy) => RETAINED.has(puppy.status)).length,
            income: attributedMoney.invoiced,
            invoiced: attributedMoney.invoiced,
            received: attributedMoney.received,
            outstanding: attributedMoney.outstanding,
            litterCosts,
            net: attributedMoney.net,
            netLabel:
              soldPuppies.length > linkedPuppyIds.size
                ? "Net of linked income (on money received)"
                : "Net (on money received)",
            coverage,
          },
    coverage,
    litterBreakdown,
    incomeLines,
    expenseLines,
  };
}

export type LitterSummary = {
  born: number;
  alive: number;
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

/** One litter, using the same link and received-net rules as the dog panel. */
export function summarizeLitter(input: {
  litterId: string;
  puppies: ProfitPuppy[];
  invoices: ProfitInvoice[];
  historical: ProfitHistorical[];
  allocations: ProfitAllocation[];
}): LitterSummary {
  const pups = input.puppies.filter((puppy) => puppy.litterId === input.litterId);
  const ids = new Set(pups.map((puppy) => puppy.id));
  const sold = pups.filter((puppy) => puppy.status === "sold");
  const linked = sold.filter((puppy) => dogIsLinked(puppy.id, input.invoices, input.historical)).length;
  const money = countedIncome(ids, input.invoices, input.historical, "all");
  const litterMoney = countedLitterIncome(
    new Set([input.litterId]),
    ids,
    input.invoices,
    input.historical,
    "all",
  );
  const allocs = input.allocations.filter((row) => row.litterId === input.litterId);
  const cost = round2(allocs.reduce((sum, row) => sum + (Number(row.amount) || 0), 0));
  const figures = linkedMoney({
    sold: sold.length,
    linkedPuppies: linked,
    litterLinked: litterMoney.litterIds.size > 0,
    invoiced: round2(money.amount + litterMoney.amount),
    received: round2(money.received + litterMoney.received),
    costs: cost,
  });
  const alive = pups.filter(isAlive).length;
  const netPerPuppy: MoneyFigure =
    figures.net.kind !== "amount"
      ? figures.net
      : pups.length > 0
        ? { kind: "amount", amount: round2(figures.net.amount / pups.length) }
        : { kind: "not_applicable" };
  return {
    born: pups.length,
    alive,
    sold: sold.length,
    linkedSales: linked,
    coverage: litterCoveragePhrase(linked, sold.length),
    invoiced: figures.invoiced,
    received: figures.received,
    outstanding: figures.outstanding,
    cost,
    net: figures.net,
    netPerPuppy,
  };
}

/** Coverage that sits next to the figure, not in a footnote. */
export function litterCoveragePhrase(linked: number, sold: number): string {
  if (sold <= 0) return "No puppies sold";
  const noun = sold === 1 ? "puppy" : "puppies";
  return `Income linked for ${linked} of ${sold} sold ${noun}`;
}

export function dogHasLinkedIncome(
  dogId: string,
  invoices: ProfitInvoice[],
  historical: ProfitHistorical[],
): boolean {
  return dogIsLinked(dogId, invoices, historical);
}

/** Column labels the screen is allowed to show. There is no combined profit row. */
export function profitColumnLabels(model: DogProfitability): { direct: string[]; attributed: string[] } {
  return {
    direct: ["Bought for", "Sold for", "Costs allocated to this dog"],
    attributed: model.attributed
      ? [
          "Litters",
          "Puppies born",
          "Alive",
          "Sold",
          "Retained",
          "Invoiced",
          "Received",
          "Outstanding",
          "Costs allocated to those litters",
          model.attributed.netLabel,
        ]
      : [],
  };
}
