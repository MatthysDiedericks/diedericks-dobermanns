import { requireFinance } from "@/lib/admin/finance-auth";

export const dynamic = "force-dynamic";

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireFinance();
  return <>{children}</>;
}
