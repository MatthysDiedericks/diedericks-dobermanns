import { NextResponse } from "next/server";

import { requireFinance } from "@/lib/admin/finance-auth";
import { buildFinanceReport } from "@/lib/finance/queries";

export async function GET(request: Request) {
  await requireFinance();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from and to required" }, { status: 400 });
  }
  const report = await buildFinanceReport(from, to);
  return NextResponse.json(report);
}
