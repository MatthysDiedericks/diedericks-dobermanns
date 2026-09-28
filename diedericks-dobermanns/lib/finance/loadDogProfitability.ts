import {
  buildDogProfitability,
  type DogProfitability,
  type ProfitAllocation,
  type ProfitHistorical,
  type ProfitInput,
  type ProfitInvoice,
  type ProfitLitter,
  type ProfitPuppy,
} from "./dogProfitability";

function amount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function labelName(row: { name?: string | null; call_name?: string | null }): string {
  return row.call_name?.trim() || row.name?.trim() || "Dog";
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

async function byIds(
  ids: string[],
  run: (chunk: string[]) => Promise<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let i = 0; i < ids.length; i += 80) {
    const chunk = ids.slice(i, i + 80);
    const { data, error } = await run(chunk);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
  }
  return rows;
}

async function loadHistoricalRows(supabase: any, dogIds: string[], litterIds: string[]): Promise<any[]> {
  const withLitter =
    "id, dog_id, litter_id, income_date, total_amount, contact_name, description, invoice_number";
  const withoutLitter =
    "id, dog_id, income_date, total_amount, contact_name, description, invoice_number";

  async function pull(select: string, column: "dog_id" | "litter_id", ids: string[]) {
    return byIds(ids, async (chunk) => supabase.from("historical_income").select(select).in(column, chunk));
  }

  let dogRows: any[] = [];
  let litterRows: any[] = [];
  let litterColumn = true;
  try {
    dogRows = (await pull(withLitter, "dog_id", dogIds)) as any[];
    if (litterIds.length) litterRows = (await pull(withLitter, "litter_id", litterIds)) as any[];
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!/litter_id/i.test(message)) throw error;
    litterColumn = false;
    dogRows = (await pull(withoutLitter, "dog_id", dogIds)) as any[];
  }

  const byId = new Map<string, any>();
  for (const row of [...dogRows, ...litterRows]) {
    if (!litterColumn) row.litter_id = null;
    byId.set(row.id, row);
  }
  return [...byId.values()];
}

/** Loads the rows the profitability panel is allowed to use. Purchase price is not invented. */
export async function loadProfitInput(supabase: any, dogId: string): Promise<ProfitInput> {
  const { data: dog, error: dogError } = await supabase
    .from("dogs")
    .select("id, name, call_name, status")
    .eq("id", dogId)
    .maybeSingle();
  if (dogError) throw new Error(dogError.message);
  if (!dog) throw new Error("Dog not found");

  const [{ data: litterRows, error: litterError }, { data: puppyRows, error: puppyError }] =
    await Promise.all([
      supabase
        .from("litters")
        .select("id, name, mother_id, father_id, actual_date, expected_date")
        .or(`mother_id.eq.${dogId},father_id.eq.${dogId}`),
      supabase
        .from("dogs")
        .select("id, name, call_name, status, litter_id, deceased_at, mother_id, father_id")
        .or(`mother_id.eq.${dogId},father_id.eq.${dogId}`),
    ]);
  if (litterError) throw new Error(litterError.message);
  if (puppyError) throw new Error(puppyError.message);

  const litters: ProfitLitter[] = (litterRows ?? []).map((row: any) => ({
    id: row.id,
    name: row.name ?? null,
    motherId: row.mother_id ?? null,
    fatherId: row.father_id ?? null,
    whelpDate: row.actual_date ?? row.expected_date ?? null,
  }));
  const puppies: ProfitPuppy[] = (puppyRows ?? [])
    .filter((row: any) => row.id !== dogId)
    .map((row: any) => ({
      id: row.id,
      name: labelName(row),
      status: row.status ?? "",
      litterId: row.litter_id ?? null,
      deceasedAt: row.deceased_at ?? null,
      motherId: row.mother_id ?? null,
      fatherId: row.father_id ?? null,
    }));

  const dogIds = [dogId, ...puppies.map((puppy) => puppy.id)];
  const litterIds = litters.map((litter) => litter.id);

  const invoiceSelect =
    "id, dog_id, litter_id, issue_date, total_amount, status, invoice_number, historical_client_name, client_id, historical_income_id";
  const dogInvoiceRows = (await byIds(dogIds, async (chunk) =>
    supabase.from("invoices").select(invoiceSelect).in("dog_id", chunk),
  )) as any[];
  const litterInvoiceRows = litterIds.length
    ? ((await byIds(litterIds, async (chunk) =>
        supabase.from("invoices").select(invoiceSelect).in("litter_id", chunk),
      )) as any[])
    : [];
  const invoiceById = new Map<string, any>();
  for (const row of [...dogInvoiceRows, ...litterInvoiceRows]) invoiceById.set(row.id, row);
  const invoiceRows = [...invoiceById.values()];

  const clientIds = [...new Set(invoiceRows.map((row) => row.client_id).filter(Boolean))] as string[];
  const userRows = clientIds.length
    ? ((await byIds(clientIds, async (chunk) =>
        supabase.from("users").select("id, full_name").in("id", chunk),
      )) as any[])
    : [];
  const userName = new Map(userRows.map((row) => [row.id, row.full_name as string | null]));

  const invoices: ProfitInvoice[] = invoiceRows.map((row) => ({
    id: row.id,
    dogId: row.dog_id ?? null,
    issueDate: row.issue_date ?? null,
    total: amount(row.total_amount),
    buyer: row.historical_client_name?.trim() || userName.get(row.client_id)?.trim() || "—",
    status: row.status ?? "",
    number: row.invoice_number ?? null,
    historicalIncomeId: row.historical_income_id ?? null,
    litterId: row.litter_id ?? null,
  }));

  const historicalRows = await loadHistoricalRows(supabase, dogIds, litterIds);
  const historical: ProfitHistorical[] = historicalRows.map((row) => ({
    id: row.id,
    dogId: row.dog_id ?? null,
    date: row.income_date ?? null,
    total: amount(row.total_amount),
    buyer: row.contact_name?.trim() || "—",
    description: row.description ?? null,
    number: row.invoice_number ?? null,
    litterId: row.litter_id ?? null,
  }));

  const allocationRows = (await everyRow(async (from, to) => {
    let query = supabase
      .from("expense_allocations")
      .select(
        "id, amount, basis_note, dog_id, litter_id, expense_lines(description, allocation_kind, expenses(expense_date, description, supplier_name))",
      );
    if (litterIds.length === 0) query = query.eq("dog_id", dogId);
    else query = query.or(`dog_id.eq.${dogId},litter_id.in.(${litterIds.join(",")})`);
    return query.range(from, to);
  })) as any[];

  const allocations: ProfitAllocation[] = allocationRows.map((row) => {
    const line = asOne<any>(row.expense_lines);
    const expense = asOne<any>(line?.expenses);
    return {
      id: row.id,
      dogId: row.dog_id ?? null,
      litterId: row.litter_id ?? null,
      amount: amount(row.amount),
      kind: line?.allocation_kind ?? "dog",
      date: expense?.expense_date ?? null,
      description: line?.description?.trim() || expense?.description?.trim() || "Expense",
      basisNote: row.basis_note ?? null,
      supplier: expense?.supplier_name ?? null,
    };
  });

  return {
    dog: { id: dog.id, name: labelName(dog), status: dog.status ?? "" },
    litters,
    puppies,
    invoices,
    historical,
    allocations,
    purchaseAmount: null,
  };
}

export async function loadDogProfitability(supabase: any, dogId: string): Promise<DogProfitability> {
  return buildDogProfitability(await loadProfitInput(supabase, dogId));
}
