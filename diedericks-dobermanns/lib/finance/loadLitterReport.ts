import { summarizeLitter, type LitterSummary } from "./dogProfitability";
import {
  type LitterReportInput,
  type RejectedPair,
  type ReportAllocation,
} from "./litterReport";

function amount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function labelName(row: { name?: string | null; call_name?: string | null } | null | undefined): string {
  return row?.call_name?.trim() || row?.name?.trim() || "";
}

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function everyRow(
  run: (from: number, to: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<unknown[]> {
  const size = 1000;
  const rows: unknown[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await run(from, from + size - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < size) break;
  }
  return rows;
}

export type LoadedLitterReport = {
  input: LitterReportInput;
  rejected: RejectedPair[];
  allocations: ReportAllocation[];
};

type DogRow = {
  id: string;
  name: string | null;
  call_name: string | null;
  status: string | null;
  litter_id: string | null;
  new_owner_name: string | null;
};

/** Costs from expense_allocations. Income from invoices on the puppies. litter_transactions is not read. */
export async function loadLitterReport(supabase: any): Promise<LoadedLitterReport> {
  const litterRows = (await everyRow(async (from, to) =>
    supabase
      .from("litters")
      .select("id, name, mother_id, father_id, actual_date")
      .order("actual_date", { ascending: false })
      .range(from, to),
  )) as Array<{
    id: string;
    name: string | null;
    mother_id: string | null;
    father_id: string | null;
    actual_date: string | null;
  }>;

  const puppyRows = (await everyRow(async (from, to) =>
    supabase
      .from("dogs")
      .select("id, name, call_name, status, litter_id, new_owner_name")
      .not("litter_id", "is", null)
      .range(from, to),
  )) as DogRow[];

  const parentIds = [
    ...new Set(
      litterRows.flatMap((row) => [row.mother_id, row.father_id].filter((id): id is string => Boolean(id))),
    ),
  ];
  const known = new Set(puppyRows.map((row) => row.id));
  const missingParents = parentIds.filter((id) => !known.has(id));
  const parentRows: DogRow[] = [];
  for (let i = 0; i < missingParents.length; i += 80) {
    const chunk = missingParents.slice(i, i + 80);
    const { data, error } = await supabase
      .from("dogs")
      .select("id, name, call_name, status, litter_id, new_owner_name")
      .in("id", chunk);
    if (error) throw new Error(error.message);
    parentRows.push(...((data ?? []) as DogRow[]));
  }
  const dogName = new Map<string, string>();
  for (const row of [...puppyRows, ...parentRows]) {
    dogName.set(row.id, labelName(row) || "Dog");
  }

  const invoiceRows = (await everyRow(async (from, to) =>
    supabase
      .from("invoices")
      .select(
        "id, dog_id, litter_id, issue_date, total_amount, amount_paid, status, invoice_number, historical_client_name, historical_income_id",
      )
      .range(from, to),
  )) as any[];

  let historicalRows: any[] = [];
  const historySelect =
    "id, dog_id, litter_id, income_date, total_amount, contact_name";
  try {
    historicalRows = (await everyRow(async (from, to) =>
      supabase.from("historical_income").select(historySelect).range(from, to),
    )) as any[];
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!/litter_id/i.test(message)) throw error;
    historicalRows = (await everyRow(async (from, to) =>
      supabase
        .from("historical_income")
        .select("id, dog_id, income_date, total_amount, contact_name")
        .range(from, to),
    )) as any[];
    for (const row of historicalRows) row.litter_id = null;
  }

  const allocationRows = (await everyRow(async (from, to) =>
    supabase
      .from("expense_allocations")
      .select(
        "id, amount, dog_id, litter_id, expense_lines(description, allocation_kind, expenses(expense_date, description))",
      )
      .not("litter_id", "is", null)
      .range(from, to),
  )) as any[];

  let rejected: RejectedPair[] = [];
  const { data: reviewRows, error: reviewError } = await supabase
    .from("sale_link_reviews")
    .select("dog_id, invoice_id");
  if (reviewError) {
    if (!/sale_link_reviews/i.test(reviewError.message)) throw new Error(reviewError.message);
  } else {
    rejected = (reviewRows ?? []).map((row: { dog_id: string; invoice_id: string }) => ({
      dogId: row.dog_id,
      invoiceId: row.invoice_id,
    }));
  }

  const allocations: ReportAllocation[] = allocationRows.map((row) => {
    const line = asOne<any>(row.expense_lines);
    const expense = asOne<any>(line?.expenses);
    return {
      id: row.id,
      litterId: row.litter_id ?? null,
      dogId: row.dog_id ?? null,
      amount: amount(row.amount),
      date: expense?.expense_date ?? null,
      description: line?.description?.trim() || expense?.description?.trim() || "Expense",
      kind: line?.allocation_kind ?? "litter",
    };
  });

  const input: LitterReportInput = {
    litters: litterRows.map((row) => ({
      id: row.id,
      name: row.name,
      damId: row.mother_id,
      damName: row.mother_id ? dogName.get(row.mother_id) || "Dam" : "Dam not named",
      sireName: row.father_id ? dogName.get(row.father_id) || "Sire" : "Sire not named",
      whelpDate: row.actual_date,
    })),
    puppies: puppyRows.map((row) => ({
      id: row.id,
      name: dogName.get(row.id) || "Puppy",
      status: row.status ?? "",
      litterId: row.litter_id,
      buyerName: row.new_owner_name,
    })),
    invoices: invoiceRows.map((row) => ({
      id: row.id,
      dogId: row.dog_id ?? null,
      litterId: row.litter_id ?? null,
      issueDate: row.issue_date ?? null,
      total: amount(row.total_amount),
      paid: amount(row.amount_paid),
      status: row.status ?? "",
      number: row.invoice_number ?? null,
      clientName: String(row.historical_client_name ?? "").trim(),
      historicalIncomeId: row.historical_income_id ?? null,
    })),
    historical: historicalRows.map((row) => ({
      id: row.id,
      dogId: row.dog_id ?? null,
      litterId: row.litter_id ?? null,
      date: row.income_date ?? null,
      total: amount(row.total_amount),
      buyer: String(row.contact_name ?? "").trim(),
    })),
    allocations,
  };

  return { input, rejected, allocations };
}

export type LitterFinancials = {
  litterId: string;
  label: string;
  summary: LitterSummary;
  allocations: ReportAllocation[];
};

/** One litter. Reads allocations and puppy invoices, never litter_transactions. */
export async function loadLitterFinancials(supabase: any, litterId: string): Promise<LitterFinancials | null> {
  const { data: litter, error } = await supabase
    .from("litters")
    .select("id, name, mother_id, father_id, actual_date")
    .eq("id", litterId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!litter) return null;

  const { data: puppies, error: puppyError } = await supabase
    .from("dogs")
    .select("id, name, call_name, status, litter_id")
    .eq("litter_id", litterId);
  if (puppyError) throw new Error(puppyError.message);
  const puppyList = (puppies ?? []) as Array<{
    id: string;
    name: string | null;
    call_name: string | null;
    status: string | null;
    litter_id: string | null;
  }>;
  const puppyIds = puppyList.map((row) => row.id);

  const invoiceSelect =
    "id, dog_id, litter_id, issue_date, total_amount, amount_paid, status, invoice_number, historical_client_name, historical_income_id";
  const dogInvoices = puppyIds.length
    ? await supabase.from("invoices").select(invoiceSelect).in("dog_id", puppyIds)
    : { data: [], error: null };
  if (dogInvoices.error) throw new Error(dogInvoices.error.message);
  const litterInvoices = await supabase.from("invoices").select(invoiceSelect).eq("litter_id", litterId);
  if (litterInvoices.error) throw new Error(litterInvoices.error.message);
  const invoiceById = new Map<string, any>();
  for (const row of [...(dogInvoices.data ?? []), ...(litterInvoices.data ?? [])]) invoiceById.set(row.id, row);

  const historyByDog = puppyIds.length
    ? await supabase
        .from("historical_income")
        .select("id, dog_id, income_date, total_amount, contact_name")
        .in("dog_id", puppyIds)
    : { data: [], error: null };
  if (historyByDog.error) throw new Error(historyByDog.error.message);

  const { data: allocationRows, error: allocationError } = await supabase
    .from("expense_allocations")
    .select(
      "id, amount, dog_id, litter_id, expense_lines(description, allocation_kind, expenses(expense_date, description))",
    )
    .eq("litter_id", litterId);
  if (allocationError) throw new Error(allocationError.message);

  const allocations: ReportAllocation[] = ((allocationRows ?? []) as any[]).map((row) => {
    const line = asOne<any>(row.expense_lines);
    const expense = asOne<any>(line?.expenses);
    return {
      id: row.id,
      litterId: row.litter_id ?? null,
      dogId: row.dog_id ?? null,
      amount: amount(row.amount),
      date: expense?.expense_date ?? null,
      description: line?.description?.trim() || expense?.description?.trim() || "Expense",
      kind: line?.allocation_kind ?? "litter",
    };
  });

  const summary = summarizeLitter({
    litterId,
    puppies: puppyList.map((row) => ({
      id: row.id,
      name: labelName(row) || "Puppy",
      status: row.status ?? "",
      litterId: row.litter_id,
      deceasedAt: null,
      motherId: null,
      fatherId: null,
    })),
    invoices: [...invoiceById.values()].map((row) => ({
      id: row.id,
      dogId: row.dog_id ?? null,
      issueDate: row.issue_date ?? null,
      total: amount(row.total_amount),
      paid: amount(row.amount_paid),
      buyer: String(row.historical_client_name ?? ""),
      status: row.status ?? "",
      number: row.invoice_number ?? null,
      historicalIncomeId: row.historical_income_id ?? null,
      litterId: row.litter_id ?? null,
    })),
    historical: ((historyByDog.data ?? []) as any[]).map((row) => ({
      id: row.id,
      dogId: row.dog_id ?? null,
      date: row.income_date ?? null,
      total: amount(row.total_amount),
      paid: amount(row.total_amount),
      buyer: String(row.contact_name ?? ""),
      description: null,
      number: null,
    })),
    allocations: allocations.map((row) => ({
      id: row.id,
      dogId: row.dogId,
      litterId: row.litterId,
      amount: row.amount,
      kind: row.kind,
      date: row.date,
      description: row.description,
      basisNote: null,
      supplier: null,
    })),
  });

  return {
    litterId,
    label: litter.name?.trim() || "Litter",
    summary,
    allocations: allocations.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
  };
}
