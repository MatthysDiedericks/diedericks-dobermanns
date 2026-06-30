import { AdminHeader } from "@/components/admin/AdminHeader";
import { CreateExpenseForm } from "@/components/finance/CreateExpenseForm";
import { fetchExpenseCategories } from "@/lib/finance/queries";

export const dynamic = "force-dynamic";

export default async function NewExpensePage() {
  const categories = await fetchExpenseCategories();

  return (
    <>
      <AdminHeader title="Log Expense" subtitle="Record a business cost." />
      <CreateExpenseForm categories={categories} />
    </>
  );
}
