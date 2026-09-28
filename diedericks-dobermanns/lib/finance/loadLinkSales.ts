import { isLiveInvoice, summarizeIncomeLinks, type IncomeLinkSummary } from "./incomeLinks";
import {
  litterIncomeProgress,
  type LitterPuppyOption,
  type SaleLitter,
} from "./litterCandidates";
import type { CandidateDog } from "./saleCandidates";

export type UnlinkedIncome = {
  key: string;
  source: "invoice" | "historical";
  id: string;
  date: string | null;
  amount: number;
  buyer: string;
  label: string;
  invoiceType: string | null;
  dogSale: boolean;
};

export type LinkSalesData = {
  progress: IncomeLinkSummary;
  litterProgress: { linked: number; total: number };
  items: UnlinkedIncome[];
  dogs: CandidateDog[];
  litters: SaleLitter[];
  puppies: LitterPuppyOption[];
};

function amount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function nameOf(row: { name?: string | null; call_name?: string | null } | null | undefined): string {
  return row?.call_name?.trim() || row?.name?.trim() || "Dog";
}

async function everyRow(run: (from: number, to: number) => any): Promise<any[]> {
  const size = 1000;
  const rows: any[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await run(from, from + size - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < size) break;
  }
  return rows;
}

export async function loadLinkSales(supabase: any): Promise<LinkSalesData> {
  const [invoiceRows, historicalRows, soldRows] = await Promise.all([
    everyRow((from, to) =>
      supabase
        .from("invoices")
        .select(
          "id, dog_id, litter_id, status, total_amount, issue_date, invoice_number, invoice_type, historical_client_name, historical_income_id, client_id, quote_id",
        )
        .range(from, to),
    ),
    loadHistoricalIncome(supabase),
    everyRow((from, to) =>
      supabase
        .from("dogs")
        .select(
          "id, name, call_name, status, date_of_birth, placement_date, handover_date, delivered_at, litter_id",
        )
        .eq("status", "sold")
        .range(from, to),
    ),
  ]);

  const clientIds = [...new Set(invoiceRows.map((row) => row.client_id).filter(Boolean))];
  const quoteIds = [...new Set(invoiceRows.map((row) => row.quote_id).filter(Boolean))];
  const litterIds = [...new Set(soldRows.map((row) => row.litter_id).filter(Boolean))];

  const [users, quotes, soldLitters] = await Promise.all([
    clientIds.length
      ? supabase.from("users").select("id, full_name").in("id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    quoteIds.length
      ? supabase.from("quotes").select("id, historical_client_name, contact_id").in("id", quoteIds)
      : Promise.resolve({ data: [], error: null }),
    litterIds.length
      ? supabase.from("litters").select("id, name, actual_date, expected_date").in("id", litterIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (users.error) throw new Error(users.error.message);
  if (quotes.error) throw new Error(quotes.error.message);
  if (soldLitters.error) throw new Error(soldLitters.error.message);

  const contactIds = [...new Set((quotes.data ?? []).map((row: any) => row.contact_id).filter(Boolean))];
  const contacts = contactIds.length
    ? await supabase.from("contacts").select("id, full_name").in("id", contactIds)
    : { data: [], error: null };
  if (contacts.error) throw new Error(contacts.error.message);

  const userName = new Map<string, string | null>(
    (users.data ?? []).map((row: { id: string; full_name: string | null }) => [row.id, row.full_name]),
  );
  const contactName = new Map<string, string | null>(
    (contacts.data ?? []).map((row: { id: string; full_name: string | null }) => [row.id, row.full_name]),
  );
  const quoteById = new Map<string, { historical_client_name: string | null; contact_id: string | null }>(
    (quotes.data ?? []).map((row: { id: string; historical_client_name: string | null; contact_id: string | null }) => [
      row.id,
      row,
    ]),
  );
  const litterById = new Map<string, { name: string | null; actual_date: string | null; expected_date: string | null }>(
    (soldLitters.data ?? []).map(
      (row: { id: string; name: string | null; actual_date: string | null; expected_date: string | null }) => [
        row.id,
        row,
      ],
    ),
  );

  const linkedViaInvoice = new Set(
    invoiceRows
      .filter((row) => isLiveInvoice(row.status) && row.historical_income_id)
      .map((row) => row.historical_income_id),
  );

  const items: UnlinkedIncome[] = [];
  for (const row of invoiceRows) {
    if (!isLiveInvoice(row.status) || row.dog_id || row.litter_id) continue;
    const quote = row.quote_id ? quoteById.get(row.quote_id) : undefined;
    const buyer =
      row.historical_client_name?.trim() ||
      (row.client_id ? userName.get(row.client_id)?.trim() : null) ||
      quote?.historical_client_name?.trim() ||
      (quote?.contact_id ? contactName.get(quote.contact_id)?.trim() : null) ||
      "—";
    const invoiceType = row.invoice_type ?? null;
    items.push({
      key: `invoice:${row.id}`,
      source: "invoice",
      id: row.id,
      date: row.issue_date ?? null,
      amount: amount(row.total_amount),
      buyer,
      label: row.invoice_number?.trim() || "Invoice",
      invoiceType,
      dogSale: !invoiceType || invoiceType === "dog_sale",
    });
  }
  for (const row of historicalRows) {
    if (row.dog_id || row.litter_id || linkedViaInvoice.has(row.id)) continue;
    items.push({
      key: `historical:${row.id}`,
      source: "historical",
      id: row.id,
      date: row.income_date ?? null,
      amount: amount(row.total_amount),
      buyer: row.contact_name?.trim() || "—",
      label: row.invoice_number?.trim() || row.description?.trim() || row.category?.trim() || "Historical income",
      invoiceType: null,
      dogSale: true,
    });
  }
  items.sort((a, b) => b.amount - a.amount || (b.date ?? "").localeCompare(a.date ?? ""));

  const linkedDogIds = new Set<string>();
  for (const row of invoiceRows) {
    if (row.dog_id && isLiveInvoice(row.status)) linkedDogIds.add(row.dog_id);
  }
  for (const row of historicalRows) {
    if (row.dog_id) linkedDogIds.add(row.dog_id);
  }

  const dogs: CandidateDog[] = soldRows.map((row) => {
    const litter = row.litter_id ? litterById.get(row.litter_id) : null;
    return {
      id: row.id,
      name: nameOf(row),
      status: row.status,
      dateOfBirth: row.date_of_birth ?? null,
      placementDate: row.placement_date ?? null,
      handoverDate: row.handover_date ?? null,
      deliveredAt: row.delivered_at ?? null,
      litterId: row.litter_id ?? null,
      litterName: litter?.name ?? null,
      litterWhelp: litter?.actual_date ?? litter?.expected_date ?? null,
      linked: linkedDogIds.has(row.id),
    };
  });

  const [allLitters, puppyRows] = await Promise.all([
    everyRow((from, to) =>
      supabase
        .from("litters")
        .select("id, name, actual_date, expected_date, mother_id, father_id")
        .range(from, to),
    ),
    everyRow((from, to) =>
      supabase
        .from("dogs")
        .select("id, name, call_name, status, litter_id")
        .not("litter_id", "is", null)
        .range(from, to),
    ),
  ]);
  const parentIds = [
    ...new Set(
      allLitters.flatMap((row) => [row.mother_id, row.father_id].filter(Boolean)),
    ),
  ] as string[];
  const parents = parentIds.length
    ? await everyRow((from, to) =>
        supabase
          .from("dogs")
          .select("id, name, call_name")
          .in("id", parentIds)
          .range(from, to),
      )
    : [];
  const parentName = new Map(parents.map((row) => [row.id, nameOf(row)]));

  const incomeLitterIds = new Set<string>();
  for (const row of invoiceRows) {
    if (row.litter_id && isLiveInvoice(row.status)) incomeLitterIds.add(row.litter_id);
  }
  for (const row of historicalRows) {
    if (row.litter_id) incomeLitterIds.add(row.litter_id);
  }
  const soldByLitter = new Map<string, number>();
  const linkedViaPuppy = new Set<string>();
  const puppies: LitterPuppyOption[] = [];
  for (const row of puppyRows) {
    if (!row.litter_id) continue;
    const status = row.status ?? "";
    if (status === "sold") {
      soldByLitter.set(row.litter_id, (soldByLitter.get(row.litter_id) ?? 0) + 1);
      if (linkedDogIds.has(row.id)) linkedViaPuppy.add(row.litter_id);
    }
    if (status === "deceased") continue;
    puppies.push({
      id: row.id,
      litterId: row.litter_id,
      name: nameOf(row),
      status,
    });
  }
  puppies.sort((a, b) => a.name.localeCompare(b.name));

  const litters: SaleLitter[] = allLitters.map((row) => ({
    id: row.id,
    name: row.name?.trim() || "Litter",
    whelpDate: row.actual_date ?? row.expected_date ?? null,
    damName: row.mother_id ? (parentName.get(row.mother_id) ?? "Dam") : "Dam unknown",
    sireName: row.father_id ? (parentName.get(row.father_id) ?? "Sire") : "Sire unknown",
    sold: soldByLitter.get(row.id) ?? 0,
    linked: incomeLitterIds.has(row.id) || linkedViaPuppy.has(row.id),
  }));

  return {
    litterProgress: litterIncomeProgress(litters),
    progress: summarizeIncomeLinks({
      invoices: invoiceRows.map((row) => ({
        id: row.id,
        dogId: row.dog_id ?? null,
        litterId: row.litter_id ?? null,
        status: row.status ?? "",
        total: amount(row.total_amount),
      })),
      historicalDogIds: historicalRows.map((row) => row.dog_id ?? null),
      soldDogIds: soldRows.map((row) => row.id),
    }),
    items,
    dogs,
    litters,
    puppies,
  };
}

async function loadHistoricalIncome(supabase: any): Promise<any[]> {
  const withLitter =
    "id, dog_id, litter_id, income_date, total_amount, contact_name, description, category, invoice_number";
  const withoutLitter =
    "id, dog_id, income_date, total_amount, contact_name, description, category, invoice_number";
  try {
    return await everyRow((from, to) =>
      supabase.from("historical_income").select(withLitter).range(from, to),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!/litter_id/i.test(message)) throw error;
    const rows = await everyRow((from, to) =>
      supabase.from("historical_income").select(withoutLitter).range(from, to),
    );
    return rows.map((row) => ({ ...row, litter_id: null }));
  }
}

export async function loadIncomeLinkGap(supabase: any): Promise<IncomeLinkSummary> {
  const data = await loadLinkSales(supabase);
  return data.progress;
}
