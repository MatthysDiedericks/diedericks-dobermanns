import { AdminHeader } from '@/components/admin/AdminHeader';
import { DashboardWidgets } from '@/components/admin/DashboardWidgets';
import { fetchDashboardData } from '@/lib/admin/kennel-queries';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const data = await fetchDashboardData();

  return (
    <>
      <AdminHeader title="Dashboard" subtitle="Live kennel overview — tap any section for details." />
      <DashboardWidgets data={data} />
    </>
  );
}
