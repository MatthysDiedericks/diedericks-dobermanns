import { format, startOfYear } from "date-fns";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { FinanceReportView } from "@/components/finance/FinanceReportView";
import { buildFinanceReport } from "@/lib/finance/queries";

export const dynamic = "force-dynamic";

export default async function FinanceReportsPage() {
  const year = new Date().getFullYear();
  const from = format(startOfYear(new Date(year, 0, 1)), "yyyy-MM-dd");
  const to = format(new Date(), "yyyy-MM-dd");
  const report = await buildFinanceReport(from, to);

  return (
    <>
      <AdminHeader
        title="Income Statement"
        subtitle="Profit and loss report with PDF and Excel export."
      />
      <FinanceReportView initialReport={report} />
    </>
  );
}
